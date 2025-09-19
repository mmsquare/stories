import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_TTS_DISABLED: process.env.NEXT_PUBLIC_TTS_DISABLED,
    NEXT_PUBLIC_TTS_BASE: process.env.NEXT_PUBLIC_TTS_BASE,
  },
};

export default nextConfig;
