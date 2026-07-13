import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfjs-dist", "tesseract.js"],
  outputFileTracingIncludes: {
    "/*": ["./prompts/**/*.md"],
  },
};

export default nextConfig;
