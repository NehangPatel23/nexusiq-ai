import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0d1117 0%, #151b28 100%)",
          borderRadius: 36,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="17" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5" />
          <line x1="20" y1="20" x2="20" y2="7" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
          <line x1="20" y1="20" x2="32.4" y2="13" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
          <line x1="20" y1="20" x2="28.8" y2="27" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
          <line x1="20" y1="20" x2="11.2" y2="27" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
          <line x1="20" y1="20" x2="7.6" y2="13" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5" />
          <circle cx="20" cy="7" r="2.2" fill="#f1f5f9" />
          <circle cx="32.4" cy="13" r="2.2" fill="#f1f5f9" />
          <circle cx="28.8" cy="27" r="2.2" fill="#f1f5f9" />
          <circle cx="11.2" cy="27" r="2.2" fill="#f1f5f9" />
          <circle cx="7.6" cy="13" r="2.2" fill="#f1f5f9" />
          <circle cx="20" cy="20" r="6.5" fill="url(#ag)" />
          <defs>
            <linearGradient id="ag" x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="0.55" stopColor="#6366f1" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="M20 16.2 L21.4 19.2 L24.6 19.6 L22.2 21.8 L22.9 25 L20 23.4 L17.1 25 L17.8 21.8 L15.4 19.6 L18.6 19.2 Z"
            fill="white"
            fillOpacity="0.9"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
