/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      "sharp",
      "fluent-ffmpeg",
      "@prisma/client",
      "prisma",
      "remotion",
      "@remotion/renderer",
      "@remotion/bundler",
      "msedge-tts",
      "ws",
    ],
  },
};

export default nextConfig;
