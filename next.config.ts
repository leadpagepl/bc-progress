import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    /* Wymagane od Next 16: jawna lista jakości używanych w projekcie. */
    qualities: [75, 82],
  },
};

export default nextConfig;
