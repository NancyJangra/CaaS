/** CaaS mark: three rising bars in blue, a nod to cache hits stacking up. */
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false" fill="none">
      <rect x="4" y="15" width="6" height="13" rx="3" fill="#6b8cff" />
      <rect x="13" y="9" width="6" height="19" rx="3" fill="#3461f0" />
      <rect x="22" y="4" width="6" height="24" rx="3" fill="#8fa8ff" />
    </svg>
  );
}

export function Wordmark({ tone = 'light', descriptor = true, compact = false }) {
  const name = tone === 'light' ? 'text-white' : 'text-fg';
  const sub = tone === 'light' ? 'text-sidebar-muted' : 'text-fg-muted';
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-8 w-8 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={`text-[22px] font-bold tracking-tight ${name}`}>CaaS</span>
          {descriptor && <span className={`mt-1 text-[11.5px] font-medium ${sub}`}>Developer Infrastructure</span>}
        </span>
      )}
    </span>
  );
}
