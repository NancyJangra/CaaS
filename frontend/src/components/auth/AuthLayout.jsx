import { Link } from 'react-router-dom';
import { Wordmark } from '../ui/Logo';
import { Sparkline } from '../dashboard/Sparkline';
import { IconCheck, IconZap } from '../ui/Icons';

/*
 * Auth shell: a white form panel beside a vivid gradient panel with glass
 * cards floating over it. The cards describe what CaaS actually does (real
 * endpoints, real header names); they show no invented metrics, customers or
 * testimonials. The panel is decorative and hidden from screen readers; the
 * same facts are in the visible sub-heading for everyone.
 */

function GlassCard({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl border border-white/45 bg-white/25 p-4 text-white shadow-[0_20px_40px_-12px_rgba(20,16,80,0.45)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

// Fixed illustrative shape for the "live dashboard" card. It carries no numbers.
const DEMO_SHAPE = [3, 4, 3.6, 5, 4.4, 6, 5.2, 7.5, 6.8, 9];

function FloatingShowcase() {
  return (
    <div
      className="relative hidden overflow-hidden rounded-[28px] lg:block"
      aria-hidden
    >
      {/* gradient + soft blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(140deg,#1d2f7a_0%,#3461f0_38%,#8b5cf6_70%,#d8b4fe_100%)]" />
      <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#6b8cff] opacity-60 blur-3xl" />
      <div className="absolute -right-10 top-1/3 h-80 w-80 rounded-full bg-[#e879f9] opacity-45 blur-3xl" />
      <div className="absolute bottom-[-60px] left-1/4 h-72 w-72 rounded-full bg-[#a78bfa] opacity-60 blur-3xl" />
      <svg className="absolute inset-x-0 bottom-0 h-48 w-full" viewBox="0 0 600 200" preserveAspectRatio="none">
        <path d="M0 120 C 120 60 240 170 380 110 S 560 40 600 70 L600 200 L0 200 Z" fill="#fff" fillOpacity="0.08" />
        <path d="M0 160 C 140 110 260 200 400 150 S 560 110 600 125 L600 200 L0 200 Z" fill="#fff" fillOpacity="0.08" />
      </svg>

      {/* floating cards */}
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-10 py-12">
        <GlassCard className="float-slow w-[300px] self-end">
          <p className="text-[12px] font-semibold text-white/80">Store a value</p>
          <p className="mt-1.5 font-mono text-[13px] font-medium">PUT /v1/cache/user:42</p>
          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#3461f0]">
              <IconCheck className="h-3 w-3" strokeWidth={3} />
            </span>
            Cached with a 300 s TTL
          </div>
        </GlassCard>

        <GlassCard className="float-mid w-[330px] self-start">
          <p className="text-[12px] font-semibold text-white/80">Read it back</p>
          <p className="mt-1.5 font-mono text-[13px] font-medium">GET /v1/cache/user:42</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-mono text-[12px] font-semibold text-[#2b53d6]">
            <IconZap className="h-3.5 w-3.5" />
            X-Cache: HIT
          </div>
          <p className="mt-2 font-mono text-[12px] text-white/90">{'{"name":"Ada"}'}</p>
        </GlassCard>

        <GlassCard className="float-fast w-[300px] self-end">
          <p className="text-[12px] font-semibold text-white/80">Live dashboard</p>
          <p className="mt-1 text-[15px] font-bold leading-snug">Hit rate and latency, refreshed every few seconds</p>
          <Sparkline values={DEMO_SHAPE} color="#ffffff" className="mt-3 h-12 w-full" />
        </GlassCard>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-3 sm:p-6 lg:p-8">
      <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-line bg-surface p-3 shadow-raised lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
          <Link to="/" className="w-fit rounded-lg" aria-label="CaaS home">
            <Wordmark tone="dark" descriptor={false} />
          </Link>
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
          <p className="text-center text-[12px] text-fg-muted lg:text-left">
            Sessions use HTTP-only cookies. API keys are stored as hashes.
          </p>
        </div>
        <FloatingShowcase />
      </div>
    </div>
  );
}
