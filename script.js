const modal = document.getElementById("video-modal");
const modalTitle = document.getElementById("modal-title");
const videoHost = document.getElementById("video-host");
const parallaxLayers = Array.from(document.querySelectorAll(".parallax-layer"));

let parallaxTicking = false;

function normalizeYouTube(url) {
  if (!url) {
    return "";
  }

  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("v=")[1]?.split("&")[0] || "";
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }

  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0] || "";
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }

  return url;
}

function buildVideoNode(url) {
  const normalizedUrl = normalizeYouTube(url);
  const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(normalizedUrl);

  if (!normalizedUrl) {
    const placeholder = document.createElement("p");
    placeholder.className = "video-placeholder";
    placeholder.textContent = "לינק הווידאו עדיין לא הוגדר.";
    return placeholder;
  }

  if (isDirectVideo) {
    const video = document.createElement("video");
    video.controls = true;
    video.src = normalizedUrl;
    return video;
  }

  const iframe = document.createElement("iframe");
  iframe.src = normalizedUrl;
  iframe.title = "Video Player";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  return iframe;
}

function openModal(title, videoUrl) {
  if (!modal || !modalTitle || !videoHost) {
    return;
  }

  modalTitle.textContent = title;
  videoHost.replaceChildren(buildVideoNode(videoUrl));
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal || !videoHost) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  videoHost.replaceChildren();
}

function applyFallback(image) {
  if (!image) {
    return;
  }

  image.addEventListener("error", () => {
    const fallback = image.dataset.fallback;
    if (fallback && image.src !== fallback) {
      image.src = fallback;
    }
  });
}

function updateParallax() {
  const scrollY = window.scrollY;
  parallaxLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0.08);
    layer.style.transform = `translate3d(0, ${scrollY * depth}px, 0)`;
  });
  parallaxTicking = false;
}

function requestParallaxUpdate() {
  if (!parallaxTicking) {
    window.requestAnimationFrame(updateParallax);
    parallaxTicking = true;
  }
}

function initSparklesCore() {
  const canvas = document.getElementById("sparkles-core");
  const hero = document.querySelector(".hero");

  if (!(canvas instanceof HTMLCanvasElement) || !(hero instanceof HTMLElement)) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const colors = ["#2ec5ff", "#d4af37", "#f3da7a", "#a6ecff"];
  const particles = [];
  let rafId = null;
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const buildParticle = () => {
    const radius = 0.8 + Math.random() * 2.1;
    const speed = 0.1 + Math.random() * 0.45;
    const angle = Math.random() * Math.PI * 2;

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.2 + Math.random() * 0.65,
      alphaDelta: (Math.random() > 0.5 ? 1 : -1) * (0.0015 + Math.random() * 0.0022),
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  };

  const setupCanvas = () => {
    width = Math.max(1, hero.clientWidth);
    height = Math.max(1, hero.clientHeight);
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = Math.min(260, Math.max(100, Math.floor((width * height) / 6800)));
    particles.length = 0;
    for (let i = 0; i < density; i += 1) {
      particles.push(buildParticle());
    }
  };

  const drawFrame = () => {
    context.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha += particle.alphaDelta;

      if (particle.alpha < 0.14 || particle.alpha > 0.95) {
        particle.alphaDelta *= -1;
      }

      if (particle.x < -particle.radius) particle.x = width + particle.radius;
      if (particle.x > width + particle.radius) particle.x = -particle.radius;
      if (particle.y < -particle.radius) particle.y = height + particle.radius;
      if (particle.y > height + particle.radius) particle.y = -particle.radius;

      context.beginPath();
      context.fillStyle = particle.color;
      context.globalAlpha = particle.alpha;
      context.shadowColor = particle.color;
      context.shadowBlur = 12;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
    context.shadowBlur = 0;
    rafId = window.requestAnimationFrame(drawFrame);
  };

  const onResize = () => setupCanvas();
  let observer = null;

  setupCanvas();
  drawFrame();

  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(onResize);
    observer.observe(hero);
  } else {
    window.addEventListener("resize", onResize);
  }

  window.addEventListener("beforeunload", () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    if (observer) {
      observer.disconnect();
    } else {
      window.removeEventListener("resize", onResize);
    }
  });
}

document.querySelectorAll("img[data-fallback]").forEach(applyFallback);

document.querySelectorAll(".hall-card, .danger-button").forEach((button) => {
  button.addEventListener("click", () => {
    openModal(button.dataset.title || "Video", button.dataset.video || "");
  });
});

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.scroll || "");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
updateParallax();
initSparklesCore();
