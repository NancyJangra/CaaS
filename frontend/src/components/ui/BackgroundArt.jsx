/**
 * Decorative wave washes. aria-hidden, pointer-events-none, behind content.
 */

/** Soft layered waves across the top of the workspace. */
export function HeaderWaves({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1200 320"
      preserveAspectRatio="none"
      className={`wave-art pointer-events-none select-none ${className}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="wave-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d6ff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#c9d6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ddd0ff" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="wave-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8eeff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#dfe6ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ebe2ff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M0 210 C 220 150 420 260 640 190 S 1000 60 1200 110 L1200 0 L0 0 Z" fill="url(#wave-b)" />
      <path d="M0 150 C 260 100 470 210 700 140 S 1030 20 1200 60 L1200 0 L0 0 Z" fill="url(#wave-a)" />
      <path d="M520 0 C 700 90 860 120 1200 30" fill="none" stroke="#b9c8ff" strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}

/** Faint waves for the navy sidebar. */
export function SidebarWaves({ className = '' }) {
  return (
    <svg
      viewBox="0 0 260 220"
      preserveAspectRatio="none"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden
      focusable="false"
    >
      <path d="M0 120 C 60 80 120 150 180 110 S 240 60 260 70 L260 150 C 200 170 120 120 60 160 S 10 170 0 175 Z" fill="#3461f0" fillOpacity="0.09" />
      <path d="M0 160 C 70 120 130 190 200 150 S 250 120 260 125 L260 175 C 190 200 130 160 70 195 S 15 205 0 205 Z" fill="#8b5cf6" fillOpacity="0.07" />
      <path d="M0 95 C 70 60 130 125 200 85 S 250 50 260 55" fill="none" stroke="#6b8cff" strokeOpacity="0.35" strokeWidth="1.5" />
    </svg>
  );
}
