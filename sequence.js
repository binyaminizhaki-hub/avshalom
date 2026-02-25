(function () {
  const TOTAL_FRAMES = 120;
  const SECTION_ID = "sequence-story";
  const BACKGROUND_COLOR = "#050505";

  const section = document.getElementById(SECTION_ID);
  const canvas = document.getElementById("sequence-canvas");
  const loadingLayer = document.getElementById("sequence-loading");
  const progressText = document.getElementById("sequence-progress");
  const progressBar = document.getElementById("sequence-progress-bar");

  if (!(section instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return;
  }

  const beatNodes = {
    a: document.querySelector('[data-beat="a"]'),
    b: document.querySelector('[data-beat="b"]'),
    c: document.querySelector('[data-beat="c"]'),
    d: document.querySelector('[data-beat="d"]')
  };

  const frames = Array.from({ length: TOTAL_FRAMES }, () => null);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let activeBeat = "a";
  let rafId = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function frameUrl(index) {
    return `public/sequence/frame_${index}.webp`;
  }

  function updateLoadingUI() {
    const progress = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (loadedCount >= TOTAL_FRAMES && loadingLayer) {
      loadingLayer.style.display = "none";
    }
  }

  function settleOneFrame() {
    loadedCount += 1;
    updateLoadingUI();
  }

  function nearestFrame(index) {
    if (frames[index]) {
      return frames[index];
    }

    for (let distance = 1; distance < TOTAL_FRAMES; distance += 1) {
      const prev = index - distance;
      if (prev >= 0 && frames[prev]) {
        return frames[prev];
      }

      const next = index + distance;
      if (next < TOTAL_FRAMES && frames[next]) {
        return frames[next];
      }
    }

    return null;
  }

  function syncCanvasSize() {
    const viewportWidth = canvas.clientWidth;
    const viewportHeight = canvas.clientHeight;
    if (viewportWidth === 0 || viewportHeight === 0) {
      return { viewportWidth: 0, viewportHeight: 0, dpr: 1 };
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.round(viewportWidth * dpr);
    const nextHeight = Math.round(viewportHeight * dpr);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { viewportWidth, viewportHeight, dpr };
  }

  function draw(frameNumber) {
    const frameIndex = clamp(Math.round(frameNumber), 0, TOTAL_FRAMES - 1);
    const image = nearestFrame(frameIndex);
    if (!image) {
      return;
    }

    const { viewportWidth, viewportHeight } = syncCanvasSize();
    if (!viewportWidth || !viewportHeight) {
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    const scale = Math.min(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (viewportWidth - drawWidth) / 2;
    const y = (viewportHeight - drawHeight) / 2;

    ctx.drawImage(image, x, y, drawWidth, drawHeight);
  }

  function beatFromProgress(progress) {
    if (progress <= 0.2) return "a";
    if (progress >= 0.25 && progress <= 0.45) return "b";
    if (progress >= 0.55 && progress <= 0.75) return "c";
    if (progress >= 0.85) return "d";
    return "";
  }

  function updateBeat(progress) {
    const nextBeat = beatFromProgress(progress);
    if (nextBeat === activeBeat) {
      return;
    }

    activeBeat = nextBeat;
    ["a", "b", "c", "d"].forEach((key) => {
      const node = beatNodes[key];
      if (!node) return;
      node.classList.toggle("is-active", key === nextBeat);
    });
  }

  function progressFromScroll() {
    const scrollSpan = Math.max(1, section.offsetHeight - window.innerHeight);
    const scrollStart = section.offsetTop;
    const raw = (window.scrollY - scrollStart) / scrollSpan;
    return clamp(raw, 0, 1);
  }

  function tick() {
    rafId = null;
    const delta = targetFrame - currentFrame;

    if (Math.abs(delta) < 0.08) {
      currentFrame = targetFrame;
    } else {
      currentFrame += delta * 0.18;
    }

    draw(currentFrame);

    if (Math.abs(targetFrame - currentFrame) > 0.08) {
      requestTick();
    }
  }

  function requestTick() {
    if (rafId !== null) {
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function updateFromScroll() {
    const progress = progressFromScroll();
    targetFrame = progress * (TOTAL_FRAMES - 1);
    updateBeat(progress);
    requestTick();
  }

  function preloadFrames() {
    for (let index = 0; index < TOTAL_FRAMES; index += 1) {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => {
        frames[index] = image;
        if (loadedCount === 0) {
          currentFrame = index;
          targetFrame = index;
          draw(index);
        }
        settleOneFrame();
      };

      image.onerror = () => {
        settleOneFrame();
      };

      image.src = frameUrl(index);
    }
  }

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scrollTarget || "");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  window.addEventListener("scroll", updateFromScroll, { passive: true });
  window.addEventListener("resize", () => {
    draw(currentFrame);
  });

  updateLoadingUI();
  updateFromScroll();
  preloadFrames();
})();

