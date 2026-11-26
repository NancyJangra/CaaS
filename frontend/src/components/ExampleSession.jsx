import { useEffect, useState } from 'react';

const nodes = [
  { name: 'Browser', detail: 'Requests a profile' },
  { name: 'Cache', detail: 'Looks up user:42' },
  { name: 'Database', detail: 'Loads the sample profile' },
];

export default function ExampleSession() {
  const [cached, setCached] = useState(false);
  const [stage, setStage] = useState('idle');
  const [result, setResult] = useState(null);
  const [avoided, setAvoided] = useState(0);
  const running = stage === 'cache' || stage === 'database';

  useEffect(() => {
    if (stage === 'cache') {
      const timer = setTimeout(() => {
        if (cached) {
          setResult('HIT');
          setAvoided((count) => count + 1);
          setStage('done');
        } else {
          setStage('database');
        }
      }, 450);
      return () => clearTimeout(timer);
    }

    if (stage === 'database') {
      const timer = setTimeout(() => {
        setCached(true);
        setResult('MISS');
        setStage('done');
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [stage, cached]);

  function sendRequest() {
    setResult(null);
    setStage('cache');
  }

  function expireCache() {
    setCached(false);
    setResult(null);
    setStage('expired');
  }

  const activeIndex =
    stage === 'database' || result === 'MISS' ? 2 :
    stage === 'cache' || result === 'HIT' ? 1 : 0;

  const message = {
    idle: 'Send a request to see where it goes.',
    cache: 'Checking the cache for user:42…',
    database: 'Key missing. Fetching the profile from the database…',
    expired: 'Cache expired. Try the same request again.',
    done: result === 'HIT'
      ? 'Profile returned directly from cache.'
      : 'Profile fetched from the database and saved in cache.',
  }[stage];

  return (
    <section
      aria-labelledby="cache-race"
      className="min-w-0 rounded-3xl border border-indigo-300/30 bg-[#0b1433] p-5 shadow-[0_24px_70px_#03071f80] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cache-race" className="text-xl font-semibold text-white">
            Cache Race
          </h2>
          <p className="mt-1 text-sm text-indigo-200">
            Run the same request twice. Watch where it goes.
          </p>
        </div>
        <code className="rounded-lg bg-indigo-300/10 px-3 py-1.5 text-xs text-indigo-100">
          GET user:42
        </code>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-2 border-t-2 border-indigo-300/25 pt-4">
        <span
          aria-hidden="true"
          className="absolute -top-1.5 size-2.5 rounded-full bg-cyan-200 shadow-[0_0_14px_#67e8f9] motion-safe:transition-all motion-safe:duration-300"
          style={{ left: `${(activeIndex + 0.5) * (100 / 3)}%` }}
        />
        {nodes.map(({ name, detail }, index) => (
          <div
            key={name}
            className={`rounded-xl border p-2.5 sm:p-3 ${
              index === activeIndex
                ? 'border-cyan-300/60 bg-cyan-300/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className="break-words text-xs font-semibold text-white sm:text-sm">
              {name}
            </p>
            <p className="mt-1 break-words text-xs text-indigo-200">
              {result === 'HIT' && index === 2 ? 'Skipped' : detail}
            </p>
          </div>
        ))}
      </div>

      <div
        aria-live="polite"
        className="mt-4 min-h-24 rounded-xl border border-white/10 bg-[#070e24] p-3"
      >
        {result && (
          <strong className={result === 'HIT' ? 'text-emerald-300' : 'text-amber-300'}>
            {result}
          </strong>
        )}
        <p className="text-sm text-indigo-100">{message}</p>
        {result && (
          <code className="mt-2 block text-xs text-indigo-200">
            {'{"name":"Ada","role":"Developer"}'}
          </code>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendRequest}
          disabled={running}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
        >
          {running ? 'Request running…' : cached ? 'Repeat request' : 'Send request'}
        </button>
        <button
          type="button"
          onClick={expireCache}
          disabled={!cached || running}
          className="rounded-xl border border-indigo-300/40 px-4 py-2.5 text-sm text-indigo-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          Expire cache
        </button>
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-indigo-200">Browser simulation</span>
        <span className="font-semibold text-emerald-200">
          {avoided} database {avoided === 1 ? 'trip' : 'trips'} avoided
        </span>
      </div>
    </section>
  );
}