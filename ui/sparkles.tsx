"use client";

import { clsx, type ClassValue } from "clsx";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { useEffect, useRef } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Particle = {
  alpha: number;
  alphaDelta: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type SparklesCoreProps = {
  id?: string;
  background?: string;
  className?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
};

export function SparklesCore({
  id,
  background = "transparent",
  className,
  minSize = 0.8,
  maxSize = 1.8,
  particleDensity = 80,
  particleColor = "#ffffff",
}: SparklesCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const makeParticle = (width: number, height: number): Particle => {
      const radius = minSize + Math.random() * (maxSize - minSize);
      const speed = 0.08 + Math.random() * 0.35;
      const angle = Math.random() * Math.PI * 2;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        alpha: 0.2 + Math.random() * 0.7,
        alphaDelta: (Math.random() > 0.5 ? 1 : -1) * (0.0015 + Math.random() * 0.003),
      };
    };

    const setupCanvas = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      particlesRef.current = Array.from({ length: Math.max(1, particleDensity) }, () =>
        makeParticle(width, height),
      );
    };

    const draw = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      context.clearRect(0, 0, width, height);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.alpha += particle.alphaDelta;

        if (particle.alpha <= 0.1 || particle.alpha >= 0.95) {
          particle.alphaDelta *= -1;
        }

        if (particle.x < -particle.radius) particle.x = width + particle.radius;
        if (particle.x > width + particle.radius) particle.x = -particle.radius;
        if (particle.y < -particle.radius) particle.y = height + particle.radius;
        if (particle.y > height + particle.radius) particle.y = -particle.radius;

        context.beginPath();
        context.fillStyle = particleColor;
        context.globalAlpha = particle.alpha;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      rafRef.current = window.requestAnimationFrame(draw);
    };

    setupCanvas();
    draw();

    resizeObserverRef.current = new ResizeObserver(() => setupCanvas());
    resizeObserverRef.current.observe(parent);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [background, maxSize, minSize, particleColor, particleDensity]);

  return (
    <motion.canvas
      animate={{ opacity: 1 }}
      className={cn("h-full w-full", className)}
      id={id}
      initial={{ opacity: 0 }}
      ref={canvasRef}
    />
  );
}
