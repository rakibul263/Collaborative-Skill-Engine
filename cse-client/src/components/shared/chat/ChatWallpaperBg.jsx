import React from "react";
import { CHAT_WALLPAPER_THEMES } from "./chatThemes";

/**
 * Tileable WhatsApp-inspired dark doodle art SVG pattern encoded safely as CSS URL.
 * Features thin vector line art: speech bubbles, code tags, sparkles, books, coffee,
 * paper planes, music notes, moons, laptops, and geometric constellations.
 */
const DOODLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260" fill="none" stroke="rgba(255,255,255,0.085)" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
  <!-- Speech bubble -->
  <path d="M22 24h26a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H33l-7 6v-6h-4a5 5 0 0 1-5-5V29a5 5 0 0 1 5-5z"/>
  <circle cx="29" cy="36" r="1.2" fill="rgba(255,255,255,0.09)"/>
  <circle cx="35" cy="36" r="1.2" fill="rgba(255,255,255,0.09)"/>
  <circle cx="41" cy="36" r="1.2" fill="rgba(255,255,255,0.09)"/>

  <!-- Paper plane -->
  <path d="M98 22l22 9-9 4-4 9-9-22z"/>
  <path d="M120 31l-12 3"/>

  <!-- Sparkle stars -->
  <path d="M168 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
  <circle cx="185" cy="36" r="1.5"/>

  <!-- Crescent moon & stars -->
  <path d="M232 24a12 12 0 1 0 13 17 10 10 0 0 1-13-17z"/>
  <circle cx="243" cy="22" r="1.2" fill="rgba(255,255,255,0.09)"/>

  <!-- Coffee mug -->
  <path d="M36 92h18v12a9 9 0 0 1-18 0V92z"/>
  <path d="M54 95h4a3.5 3.5 0 0 1 0 7h-4"/>
  <path d="M41 85c0-3 3-3 3-6M48 85c0-3 3-3 3-6"/>

  <!-- Code brackets </> -->
  <path d="M95 92l-7 7 7 7M113 92l7 7-7 7M106 89l-4 20"/>

  <!-- Lightbulb -->
  <path d="M174 88a9 9 0 0 1 5 16.5V109h-10v-4.5A9 9 0 0 1 174 88z"/>
  <path d="M170 113h8M172 117h4"/>

  <!-- Headphones -->
  <path d="M214 103v-6a12 12 0 0 1 24 0v6"/>
  <rect x="210" y="102" width="5" height="10" rx="2"/>
  <rect x="237" y="102" width="5" height="10" rx="2"/>

  <!-- Heart & wave -->
  <path d="M34 156c0-5 7-7 10-2 3-5 10-3 10 2 0 7-10 13-10 13s-10-6-10-13z"/>

  <!-- Saturn planet -->
  <circle cx="106" cy="162" r="10"/>
  <ellipse cx="106" cy="162" rx="19" ry="5" transform="rotate(-22 106 162)"/>

  <!-- Open book -->
  <path d="M162 152c6 0 11 2 13 5v18c-2-3-7-5-13-5v-18z"/>
  <path d="M188 152c-6 0-11 2-13 5v18c2-3 7-5 13-5v-18z"/>

  <!-- Music note -->
  <path d="M226 172V150l14-4v18"/>
  <circle cx="222" cy="172" r="4"/>
  <circle cx="236" cy="166" r="4"/>

  <!-- Laptop -->
  <rect x="20" y="212" width="26" height="16" rx="2.5"/>
  <path d="M15 231h36"/>

  <!-- Rocket -->
  <path d="M104 205c5 4 8 11 8 18h-16c0-7 3-14 8-18z"/>
  <circle cx="104" cy="216" r="2.2"/>
  <path d="M96 220l-4 5h6M112 220l4 5h-6"/>

  <!-- Compass / Starburst -->
  <circle cx="174" cy="220" r="10"/>
  <path d="M174 206v28M160 220h28"/>

  <!-- Graduation cap -->
  <path d="M214 218l16-7 16 7-16 7-16-7z"/>
  <path d="M221 221v7c0 3 18 3 18 0v-7M246 218v9"/>

  <!-- Tiny scattered ambient accents -->
  <circle cx="72" cy="58" r="2"/>
  <path d="M138 62l5 5m0-5l-5 5"/>
  <circle cx="204" cy="64" r="1.8"/>
  <path d="M74 128c4-3 8 3 12 0"/>
  <circle cx="144" cy="130" r="2"/>
  <path d="M204 196l4-6 4 6h-8z"/>
  <circle cx="70" cy="196" r="1.6"/>
  <path d="M136 244c3-3 7 3 10 0"/>
</svg>`;

const ENCODED_DOODLE_URI = `url("data:image/svg+xml,${encodeURIComponent(DOODLE_SVG)}")`;

/**
 * Decorative pointer-events-none WhatsApp-style dark artistic doodle backdrop.
 * Place inside a `relative overflow-hidden` chat thread container.
 */
const ChatWallpaperBg = ({ themeKey = "emerald" }) => {
  const theme = CHAT_WALLPAPER_THEMES[themeKey] || CHAT_WALLPAPER_THEMES.emerald;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${theme.baseStyle}`}
    >
      {/* Artistic colorful ambient aurora washes */}
      <div
        className={`absolute -top-20 -left-16 w-72 h-72 rounded-full blur-[90px] ${theme.glowA}`}
      />
      <div
        className={`absolute top-1/3 -right-16 w-80 h-80 rounded-full blur-[100px] ${theme.glowB}`}
      />
      <div
        className={`absolute -bottom-24 left-1/3 w-72 h-72 rounded-full blur-[95px] ${theme.glowC}`}
      />

      {/* Subtle diagonal art sheen */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.03) 0%, transparent 55%), radial-gradient(ellipse at 80% 75%, rgba(255,255,255,0.025) 0%, transparent 60%)",
        }}
      />

      {/* WhatsApp-style tiled artistic doodle vector overlay */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: ENCODED_DOODLE_URI,
          backgroundRepeat: "repeat",
          backgroundSize: "260px 260px",
        }}
      />

      {/* Soft vignette edge depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 45%, rgba(2, 6, 16, 0.42) 100%)",
        }}
      />
    </div>
  );
};

export default ChatWallpaperBg;
