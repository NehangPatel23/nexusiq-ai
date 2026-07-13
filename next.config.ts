import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfjs-dist", "tesseract.js"],
  outputFileTracingIncludes: {
    "/*": ["./prompts/**/*.md"],
  },
  // Keep soft-nav destinations warm so project tabs / sidebar feel snappy.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
