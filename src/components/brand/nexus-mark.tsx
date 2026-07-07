"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

interface NexusMarkProps {
  className?: string;
  size?: number;
  /** Show subtle outer ring glow */
  glow?: boolean;
}

/**
 * NexusIQ brand mark — central intelligence hub with five agent nodes
 * representing multi-agent decision intelligence.
 */
export function NexusMark({ className, size = 32, glow = false }: NexusMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `nexus-grad-${uid}`;
  const ringId = `nexus-ring-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(glow && "drop-shadow-[0_0_12px_hsl(var(--primary)/0.45)]", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(213, 94%, 62%)" />
          <stop offset="0.55" stopColor="hsl(230, 90%, 68%)" />
          <stop offset="1" stopColor="hsl(252, 78%, 68%)" />
        </linearGradient>
        <linearGradient id={ringId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(213, 94%, 62%)" stopOpacity="0.35" />
          <stop offset="1" stopColor="hsl(252, 78%, 68%)" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle
        cx="20"
        cy="20"
        r="17"
        stroke={`url(#${ringId})`}
        strokeWidth="0.75"
        strokeDasharray="3 4"
        opacity="0.9"
      />

      <g stroke="hsl(213, 94%, 62%)" strokeWidth="1.1" strokeLinecap="round" opacity="0.45">
        <line x1="20" y1="20" x2="20" y2="7" />
        <line x1="20" y1="20" x2="32.4" y2="13" />
        <line x1="20" y1="20" x2="28.8" y2="27" />
        <line x1="20" y1="20" x2="11.2" y2="27" />
        <line x1="20" y1="20" x2="7.6" y2="13" />
        <path d="M20 7 L32.4 13 L28.8 27 L11.2 27 L7.6 13 Z" strokeOpacity="0.25" fill="none" />
      </g>

      <g fill="hsl(210, 28%, 97%)">
        <circle cx="20" cy="7" r="2.2" />
        <circle cx="32.4" cy="13" r="2.2" />
        <circle cx="28.8" cy="27" r="2.2" />
        <circle cx="11.2" cy="27" r="2.2" />
        <circle cx="7.6" cy="13" r="2.2" />
      </g>

      <circle cx="20" cy="20" r="6.5" fill={`url(#${gradId})`} />
      <circle cx="20" cy="20" r="6.5" fill="white" fillOpacity="0.12" />

      <path
        d="M20 16.2 L21.4 19.2 L24.6 19.6 L22.2 21.8 L22.9 25 L20 23.4 L17.1 25 L17.8 21.8 L15.4 19.6 L18.6 19.2 Z"
        fill="white"
        fillOpacity="0.92"
      />
    </svg>
  );
}
