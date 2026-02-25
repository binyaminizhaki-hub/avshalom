"use client";

import { SparklesCore } from "../ui/sparkles";

export function SparklesPreview() {
  return (
    <div className="relative flex h-[40rem] w-full flex-col items-center justify-center overflow-hidden rounded-md bg-black">
      <h1 className="relative z-20 text-center text-4xl font-bold text-white md:text-7xl lg:text-9xl">
        מזל טוב אבשלום!
      </h1>
      <div className="relative h-40 w-[40rem]">
        <div className="absolute inset-x-20 top-0 h-[2px] w-3/4 bg-gradient-to-r from-transparent via-blue-500 to-transparent blur-sm" />
        <div className="absolute inset-x-20 top-0 h-px w-3/4 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute inset-x-60 top-0 h-[5px] w-1/4 bg-gradient-to-r from-transparent via-yellow-400 to-transparent blur-sm" />
        <div className="absolute inset-x-60 top-0 h-px w-1/4 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={120}
          className="h-full w-full"
          particleColor="#33bfff"
        />

        <div className="absolute inset-0 h-full w-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
      </div>
    </div>
  );
}
