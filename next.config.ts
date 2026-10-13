import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Recordings for speech-to-text (about a minute of audio, see MAX_AUDIO).
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default config;
