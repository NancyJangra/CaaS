import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Wordmark } from '../components/ui/Logo';
import { buttonClasses } from '../components/ui/Button';
import { Badge } from '../components/ui/primitives';
import ExampleSession from '../components/ExampleSession';

function StatusCard({ title, query }) {
  const { data, isLoading, isError, error } = useQuery(query);

  let status = 'unknown';
  let detail = '';
  if (isLoading) {
    status = 'loading';
  } else if (isError) {
    status = 'error';
    detail = error?.message || 'Request failed';
  } else if (data?.status === 'ok') {
    status = 'ok';
    detail = data.latencyMs != null ? `${data.latencyMs} ms` : data.service || '';
  } else {
    status = 'error';
    detail = data?.error || 'Unavailable';
  }

  const tone = status === 'ok' ? 'success' : status === 'loading' ? 'neutral' : 'danger';
  const label = status === 'ok' ? 'Operational' : status === 'loading' ? 'Checking…' : 'Unavailable';

  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{title}</span>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="mt-2 min-h-4 truncate text-xs text-fg-" title={detail}>
        {detail || ' '}
      </p>
    </div>
  );
}

/* Splash‑screen component – plays the intro video full‑screen once */
function HomeSplash({ setShowIntro }) {
  const videoRef = useRef(null);

  // Try to play video; if blocked, fallback to hide splash after a few seconds
  React.useEffect(() => {
    const fallbackTimer = setTimeout(() => setShowIntro(false), 8000);
    const attemptPlay = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (e) {
          // Autoplay blocked – let fallback timer hide splash
        }
      }
    };
    attemptPlay();
    return () => clearTimeout(fallbackTimer);
  }, [setShowIntro]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        // no muted – we want sound
        playsInline
        onEnded={() => setShowIntro(false)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export { HomeSplash };

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="relative isolate overflow-hidden bg-[#080e26]">
        <img
          src="/cache-hero.webp"
          alt=""
          fetchPriority="high"
          width="1672"
          height="941"
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[62%_center] md:object-right"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080e26]/95 via-[#080e26]/65 to-[#080e26]/5" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080e26] via-transparent to-[#080e26]/35" />
        <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark tone="light" />
          <nav aria-label="Account" className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/app" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-2 text-[13px] text-sidebar-fg hover:text-white">
                  Log in
                </Link>
                <Link to="/signup" className="px-2 text-[13px] text-sidebar-fg hover:text-white">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="relative mx-auto flex min-h-[34rem] max-w-6xl items-center px-4 pb-16 pt-8 sm:px-6 lg:min-h-[36rem]">
          <div>
            <p className="mb-4 text-sm font-semibold text-[#a8beff]">Cache-as-a-Service</p>
            <h1 className="max-w-[14ch] text-5xl font-semibold leading-[1.03] tracking-tight text-white sm:text-6xl xl:text-7xl">
              Store it once. <span className="text-[#a8beff]">Read it fast.</span>
            </h1>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-sidebar-fg">
              Store JSON in hosted Redis with a simple REST API. Set an expiry and track cache hits, latency, and usage in your dashboard.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? '/app' : '/signup'}
                className={buttonClasses({ variant: 'primary', size: 'lg' })}
              >
                {isAuthenticated ? 'Open dashboard' : 'Create an account'}
              </Link>
              <Link
                to={isAuthenticated ? '/app/integrate' : '/login'}
                className={buttonClasses({ variant: 'inverse', size: 'lg' })}
              >
                {isAuthenticated ? 'API reference' : 'Log in'}
              </Link>
              <a href="#cache-demo" className={buttonClasses({ variant: 'inverse', size: 'lg' })}>
                Try the cache demo ↓
              </a>
            </div>
          </div>
        </div>
      </header>



      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        <div id="cache-demo" tabIndex={-1} className="mx-auto max-w-3xl scroll-mt-6">
          <ExampleSession />
        </div>
        <section aria-labelledby="health-heading">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 id="health-heading" className="text-base font-semibold text-fg">
                Backend health
              </h2>
              <p className="mt-0.5 text-sm text-fg-">
                Checked against this deployment every 10 seconds.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusCard
              title="API"
              query={{
                queryKey: ['health'],
                queryFn: () => apiGet('/health'),
                refetchInterval: 10000,
              }}
            />
            <StatusCard
              title="PostgreSQL"
              query={{
                queryKey: ['health', 'db'],
                queryFn: () => apiGet('/health/db'),
                refetchInterval: 10000,
              }}
            />
            <StatusCard
              title="Redis"
              query={{
                queryKey: ['health', 'redis'],
                queryFn: () => apiGet('/health/redis'),
                refetchInterval: 10000,
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
