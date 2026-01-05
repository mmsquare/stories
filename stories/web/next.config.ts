import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_TTS_DISABLED: process.env.NEXT_PUBLIC_TTS_DISABLED,
    NEXT_PUBLIC_TTS_BASE: process.env.NEXT_PUBLIC_TTS_BASE,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow eval only in development to avoid CSP errors from dev tooling
          ...(isDev
            ? [
                {
                  key: "Content-Security-Policy",
                  value:
                    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: http: ws: wss:; media-src 'self' blob: data:; frame-src *;",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
