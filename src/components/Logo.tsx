import { useMemo } from "react";

interface LogoProps {
  theme?: "light" | "dark";
  height?: number | string;
  className?: string;
}

export default function Logo({ theme = "light", height = "44px", className = "" }: LogoProps) {
  // Brand colors:
  // - LUMAX: Vivid red (#E31B23)
  // - Petal Colors (Alternating Pinwheel): Red (#E31B23), Orange (#FF8F00), Pink-Purple (#8E24AA)
  // - IAC Section: Dark Warm Brown (#3C2A21) in light, Warm Silver/White (#F1F5F9 / #E2E8F0) in dark
  const isDark = theme === "dark";

  const iacColor = isDark ? "#E2E8F0" : "#321E14";
  const descColor = isDark ? "#94A3B8" : "#5D4037";
  const dividerColor = isDark ? "#451B1D" : "#E31B23";

  return (
    <svg
      viewBox="0 0 350 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height, width: "auto" }}
      className={`max-w-full select-none ${className}`}
    >
      {/* 1. LUMAX TEXT (Stylized Ultra-Bold Geometric) */}
      <g>
        <text
          x="12"
          y="52"
          fill="#D91E27"
          fontSize="46"
          fontWeight="900"
          letterSpacing="-1.5px"
          fontFamily="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif"
          className="font-black select-none"
        >
          LUMAX
        </text>
      </g>

      {/* 2. PETALS PINWHEEL (Top right of LUMAX - coordinates translated next to X) */}
      <g transform="translate(178, 25)">
        {/* We have 6 rotated interlocking rhombus ribbons leaving a central hexagonal gap */}
        {/* Ribbon 1: Top (Red) */}
        <g transform="rotate(0)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#D91E27"
            stroke="#D91E27"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
        {/* Ribbon 2: 60 deg (Orange) */}
        <g transform="rotate(60)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#FB8C00"
            stroke="#FB8C00"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
        {/* Ribbon 3: 120 deg (Purple) */}
        <g transform="rotate(120)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#8E24AA"
            stroke="#8E24AA"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
        {/* Ribbon 4: 180 deg (Red) */}
        <g transform="rotate(180)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#D91E27"
            stroke="#D91E27"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
        {/* Ribbon 5: 240 deg (Orange) */}
        <g transform="rotate(240)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#FB8C00"
            stroke="#FB8C00"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
        {/* Ribbon 6: 300 deg (Purple) */}
        <g transform="rotate(300)">
          <path
            d="M 1,-4 L 7,-20 L 15,-16 L 9,0 Z"
            fill="#8E24AA"
            stroke="#8E24AA"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* 3. VERTICAL PARTITION LINE */}
      <line
        x1="228"
        y1="10"
        x2="228"
        y2="62"
        stroke={dividerColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 4. IAC BRANDING (Intelligent Ambient Comfort) */}
      <g>
        {/* "IAC" with stylized arched A */}
        {/* Let's draw it custom using a path or text. A path is more custom and authentic! */}
        {/* Let's write the letters precisely */}
        <text
          x="248"
          y="42"
          fill={iacColor}
          fontSize="36"
          fontWeight="800"
          letterSpacing="1px"
          fontFamily="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif"
          className="font-extrabold select-none"
        >
          IAC
        </text>

        {/* Subtitle: "Intelligent Ambient Comfort" */}
        <text
          x="248"
          y="56"
          fill={descColor}
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="0.2px"
          fontFamily="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif"
          className="font-bold select-none"
        >
          Intelligent Ambient Comfort
        </text>
      </g>
    </svg>
  );
}
