"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TOTAL_FRAMES = 120;
const BACKGROUND = "#050505";

function framePath(index: number) {
  return `/sequence/frame_${index}.webp`;
}

function clampFrame(index: number) {
  return Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
}

export default function ScrollCanvas() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    Array.from({ length: TOTAL_FRAMES }, () => null)
  );
  const rafRef = useRef<number | null>(null);
  const targetFrameRef = useRef(0);
  const renderedFrameRef = useRef(-1);

  const [loadedFrames, setLoadedFrames] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasLoadErrors, setHasLoadErrors] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30
  });

  const smoothFrame = useTransform(smoothProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  const beatAOpacity = useTransform(smoothProgress, [0, 0.04, 0.18, 0.22], [0, 1, 1, 0]);
  const beatAY = useTransform(smoothProgress, [0, 0.2], [34, -16]);

  const beatBOpacity = useTransform(smoothProgress, [0.22, 0.27, 0.43, 0.48], [0, 1, 1, 0]);
  const beatBY = useTransform(smoothProgress, [0.25, 0.45], [30, -18]);

  const beatCOpacity = useTransform(smoothProgress, [0.52, 0.57, 0.73, 0.78], [0, 1, 1, 0]);
  const beatCY = useTransform(smoothProgress, [0.55, 0.75], [30, -18]);

  const beatDOpacity = useTransform(smoothProgress, [0.82, 0.88, 1], [0, 1, 1]);
  const beatDY = useTransform(smoothProgress, [0.85, 1], [26, 0]);

  const loadProgress = useMemo(
    () => Math.round((loadedFrames / TOTAL_FRAMES) * 100),
    [loadedFrames]
  );

  const resolveFrameImage = useCallback((index: number) => {
    const frames = imagesRef.current;
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
  }, []);

  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const image = resolveFrameImage(frameIndex);
      if (!image) {
        return;
      }

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext("2d", { alpha: false });
      }

      const ctx = ctxRef.current;
      if (!ctx) {
        return;
      }

      const viewportWidth = canvas.clientWidth;
      const viewportHeight = canvas.clientHeight;
      if (viewportWidth === 0 || viewportHeight === 0) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(viewportWidth * dpr);
      const nextHeight = Math.round(viewportHeight * dpr);

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      const scale = Math.min(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const x = (viewportWidth - drawWidth) / 2;
      const y = (viewportHeight - drawHeight) / 2;

      ctx.drawImage(image, x, y, drawWidth, drawHeight);
      renderedFrameRef.current = frameIndex;
    },
    [resolveFrameImage]
  );

  const requestFrameDraw = useCallback(
    (nextFrame: number) => {
      const clamped = clampFrame(nextFrame);
      targetFrameRef.current = clamped;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        drawFrame(targetFrameRef.current);
      });
    },
    [drawFrame]
  );

  useEffect(() => {
    let cancelled = false;
    let settled = 0;
    let successful = 0;
    const createdImages: HTMLImageElement[] = [];

    setLoadedFrames(0);
    setIsReady(false);
    setHasLoadErrors(false);
    imagesRef.current = Array.from({ length: TOTAL_FRAMES }, () => null);

    const onSettled = () => {
      settled += 1;
      if (cancelled) {
        return;
      }

      setLoadedFrames(settled);

      if (settled === TOTAL_FRAMES) {
        setIsReady(true);
      }
    };

    for (let index = 0; index < TOTAL_FRAMES; index += 1) {
      const image = new Image();
      createdImages.push(image);
      image.decoding = "async";
      image.loading = "eager";

      image.onload = async () => {
        try {
          await image.decode();
        } catch {
          // Keep going even if decode is not available in this browser.
        }

        if (cancelled) {
          return;
        }

        imagesRef.current[index] = image;
        successful += 1;

        if (successful === 1) {
          requestFrameDraw(0);
        }

        onSettled();
      };

      image.onerror = () => {
        if (!cancelled) {
          setHasLoadErrors(true);
        }
        onSettled();
      };

      image.src = framePath(index);
    }

    return () => {
      cancelled = true;
      createdImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [requestFrameDraw]);

  useEffect(() => {
    const unsubscribe = smoothFrame.on("change", (latest) => {
      requestFrameDraw(Math.round(latest));
    });

    return () => {
      unsubscribe();
    };
  }, [requestFrameDraw, smoothFrame]);

  useEffect(() => {
    const onResize = () => {
      requestFrameDraw(targetFrameRef.current);
    };

    onResize();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [requestFrameDraw]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[520vh] bg-[#050505]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ opacity: loadedFrames > 0 ? 1 : 0 }}
          aria-label="Abshalom sequence canvas"
        />

        <div className="pointer-events-none absolute inset-0 z-20 mx-auto max-w-6xl px-6 text-center">
          <motion.div style={{ opacity: beatAOpacity, y: beatAY }} className="absolute inset-x-0 top-[17vh]">
            <p className="text-6xl font-extrabold tracking-tighter text-white/90 md:text-8xl">אבשלום</p>
            <p className="mt-3 text-lg font-bold tracking-tighter text-white/60 md:text-2xl">26.02.2026</p>
          </motion.div>

          <motion.div
            style={{ opacity: beatBOpacity, y: beatBY }}
            className="absolute inset-x-0 top-[26vh] mx-auto max-w-2xl"
          >
            <p className="text-4xl font-extrabold tracking-tighter text-white/90 md:text-6xl">ברוכים הבאים</p>
            <p className="mt-4 text-base font-bold leading-relaxed tracking-tighter text-white/60 md:text-xl">
              שמחים שאתם איתנו בבוקר הזה
            </p>
          </motion.div>

          <motion.div
            style={{ opacity: beatCOpacity, y: beatCY }}
            className="absolute inset-x-0 top-[28vh] mx-auto max-w-2xl"
          >
            <p className="text-4xl font-extrabold tracking-tighter text-white/90 md:text-6xl">תודה שבאתם</p>
            <p className="mt-4 text-base font-bold leading-relaxed tracking-tighter text-white/60 md:text-xl">
              לחגוג איתנו את רגע בר המצווה
            </p>
          </motion.div>

          <motion.div style={{ opacity: beatDOpacity, y: beatDY }} className="absolute inset-x-0 top-[33vh]">
            <p className="text-4xl font-extrabold tracking-tighter text-white/90 md:text-6xl">תיהנו מהאירוע</p>
            <p className="mt-4 text-base font-bold tracking-tighter text-white/60 md:text-xl" aria-hidden="true">
              {' '}
            </p>
          </motion.div>
        </div>

        {!isReady && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/88 backdrop-blur-sm">
            <div className="w-[min(420px,84vw)]">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-zinc-300">
                Loading Sequence {loadProgress}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
                <motion.div
                  className="h-full rounded-full bg-zinc-100"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadProgress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                />
              </div>
            </div>
          </div>
        )}

        {isReady && hasLoadErrors && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-xs font-semibold tracking-tight text-zinc-300">
            ׳—׳׳§ ׳׳”׳₪׳¨׳™׳™׳׳™׳ ׳׳ ׳ ׳˜׳¢׳ ׳•. ׳›׳“׳׳™ ׳׳”׳¨׳™׳¥ ׳©׳•׳‘ ׳׳× ׳¡׳§׳¨׳™׳₪׳˜ ׳”׳¡׳™׳“׳•׳¨.
          </div>
        )}
      </div>
    </section>
  );
}




