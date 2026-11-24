import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getApiKeys,
  createApiKey,
} from '../api/client';

import Button from '../components/ui/Button';
import OneTimeSecret from '../components/ui/OneTimeSecret';
import {
  Card,
  CardHeader,
  Badge,
  PageHeader,
  SectionHeader,
  EmptyState,
  Skeleton,
  LoadingRegion,
  FieldHint,
  inputClass,
  labelClass,
  tableClasses as t,
} from '../components/ui/primitives';
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconPlay,
  IconPlus,
  IconTerminal,
} from '../components/ui/Icons';

const LANGS = ['javascript', 'python', 'curl'];

function apiBaseForExamples() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://api.example.com';
}

function buildSnippets(baseUrl, keyPlaceholder) {
  const key = keyPlaceholder || 'caas_live_YOUR_API_KEY';
  const js = `// Read the key from the environment. Don't hardcode secrets.
const API_BASE = '${baseUrl}';
const API_KEY = process.env.CAAS_API_KEY || '${key}';

async function cacheRequest(method, key, body) {
  const res = await fetch(\`\${API_BASE}/v1/cache/\${encodeURIComponent(key)}\`, {
    method,
    headers: {
      'x-api-key': API_KEY,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || res.statusText);
    err.status = res.status;
    err.code = data.code;
    err.headers = {
      cache: res.headers.get('X-Cache'),
      rateLimitRemaining: res.headers.get('X-RateLimit-Remaining'),
    };
    throw err;
  }
  return { data, headers: { cache: res.headers.get('X-Cache') } };
}

// PUT: store JSON with a TTL in seconds
await cacheRequest('PUT', 'user:42', { value: { name: 'Ada' }, ttl: 300 });

// GET: 200 + X-Cache: HIT, or 404 + X-Cache: MISS
try {
  const { data, headers } = await cacheRequest('GET', 'user:42');
  console.log(headers.cache, data.value);
} catch (e) {
  if (e.status === 404) console.log('miss', e.headers?.cache);
  else throw e;
}

// DELETE
await cacheRequest('DELETE', 'user:42');
`;

  const py = `# pip install requests
# export CAAS_API_KEY=caas_live_...
import os
import requests

API_BASE = "${baseUrl}"
API_KEY = os.environ.get("CAAS_API_KEY", "${key}")
HEADERS = {"x-api-key": API_KEY, "Content-Type": "application/json"}

def put(key, value, ttl=300):
    r = requests.put(
        f"{API_BASE}/v1/cache/{key}",
        headers=HEADERS,
        json={"value": value, "ttl": ttl},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

def get(key):
    r = requests.get(f"{API_BASE}/v1/cache/{key}", headers={"x-api-key": API_KEY}, timeout=10)
    # 404 = cache miss (X-Cache: MISS)
    if r.status_code == 404:
        return None, r.headers.get("X-Cache")
    r.raise_for_status()
    return r.json(), r.headers.get("X-Cache")

def delete(key):
    r = requests.delete(f"{API_BASE}/v1/cache/{key}", headers={"x-api-key": API_KEY}, timeout=10)
    r.raise_for_status()
    return r.json()

put("user:42", {"name": "Ada"}, ttl=300)
value, cache_header = get("user:42")
print(cache_header, value)
delete("user:42")
`;

  const curl = `# export CAAS_API_KEY=caas_live_...
# Base: ${baseUrl}

# PUT: store a value with a TTL in seconds
curl -sS -X PUT "${baseUrl}/v1/cache/user:42" \\
  -H "x-api-key: \${CAAS_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"value":{"name":"Ada"},"ttl":300}'

# GET: expect 200 + X-Cache: HIT, or 404 + X-Cache: MISS
curl -sS -D - -o - -X GET "${baseUrl}/v1/cache/user:42" \\
  -H "x-api-key: \${CAAS_API_KEY}"

# DELETE
curl -sS -X DELETE "${baseUrl}/v1/cache/user:42" \\
  -H "x-api-key: \${CAAS_API_KEY}"
`;

  return { javascript: js, python: py, curl };
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

const LANG_META = {
  javascript: { label: 'JavaScript', file: 'cache-client.mjs', comment: '//' },
  python: { label: 'Python', file: 'cache_client.py', comment: '#' },
  curl: { label: 'cURL', file: 'terminal', comment: '#' },
};

const STEP_DEFS = [
  { id: 'put', method: 'PUT', label: 'Store probe value', hint: 'Writes a temporary key with a 60s safety TTL' },
  { id: 'get', method: 'GET', label: 'Read it back', hint: 'Expects 200 with X-Cache: HIT' },
  { id: 'compare', method: 'CHECK', label: 'Value comparison', hint: 'Response value must equal the stored value' },
  { id: 'del', method: 'DELETE', label: 'Cleanup', hint: 'Always attempted once the probe key exists' },
];

const STEP_STATUS = {
  pending: { text: 'Pending', cls: 'text-fg-muted', dot: 'border-line-strong bg-surface' },
  running: { text: 'Running', cls: 'text-brand-fg', dot: 'border-brand bg-brand-soft' },
  pass: { text: 'Passed', cls: 'text-success-fg', dot: 'border-success bg-success' },
  fail: { text: 'Failed', cls: 'text-danger-fg', dot: 'border-danger bg-danger' },
  skipped: { text: 'Skipped', cls: 'text-fg-muted', dot: 'border-line-strong bg-surface-3' },
};

const METHOD_TONE = {
  GET: 'bg-success-soft text-success-fg ring-success-line',
  PUT: 'bg-info-soft text-info-fg ring-info-line',
  DELETE: 'bg-danger-soft text-danger-fg ring-danger-line',
  CHECK: 'bg-warning-soft text-warning-fg ring-warning-line',
};

function MethodBadge({ method }) {
  return (
    <span
      className={`inline-flex min-w-[52px] justify-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset ${METHOD_TONE[method] || METHOD_TONE.CHECK}`}
    >
      {method}
    </span>
  );
}

function initialSteps() {
  return { put: 'pending', get: 'pending', compare: 'pending', del: 'pending' };
}

/** Line-level highlighting: comments are muted, everything else default. */
function CodeLines({ code, comment }) {
  const lines = code.replace(/\n$/, '').split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trimStart();
    const isComment = trimmed.startsWith(comment);
    return (
      <span key={i} className={`block ${isComment ? 'text-[#8e9ac4] italic' : ''}`}>
        {line}
        {'\n'}
      </span>
    );
  });
}

const STEP_COLORS = [
  'bg-[#3461f0] text-white',
  'bg-[#7c3aed] text-white',
  'bg-[#047857] text-white',
  'bg-[#c2410c] text-white',
  'bg-[#2b53d6] text-white',
];

const TOC = [
  { href: '#getting-started', label: 'Getting started' },
  { href: '#api-keys-section', label: 'API keys' },
  { href: '#examples', label: 'Code examples' },
  { href: '#test-connection', label: 'Test connection' },
  { href: '#api-ref', label: 'API reference' },
  { href: '#troubleshoot', label: 'Troubleshoot' },
];

export default function Integrate() {
  const qc = useQueryClient();
  const [lang, setLang] = useState('javascript');
  const [copyMsg, setCopyMsg] = useState('');
  const [newSecret, setNewSecret] = useState(null);
  const [testKey, setTestKey] = useState('');
  const [testKeyVisible, setTestKeyVisible] = useState(false);
  const [testLog, setTestLog] = useState([]);
  const [testing, setTesting] = useState(false);
  const [steps, setSteps] = useState(null);
  const [overall, setOverall] = useState(null); // null | 'pass' | 'warn' | 'fail'
  const tabRefs = useRef({});

  const keysQuery = useQuery({
    queryKey: ['apiKeys'],
    queryFn: getApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: () => createApiKey('Integrate'),
    onSuccess: (data) => {
      if (data.apiKey) {
        setNewSecret(data.apiKey);
        setTestKey(data.apiKey);
      }
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const baseUrl = apiBaseForExamples();
  const safeSnippets = useMemo(
    () => buildSnippets(baseUrl, 'caas_live_YOUR_API_KEY'),
    [baseUrl]
  );

  const keys = keysQuery.data?.keys || [];

  async function handleCopy() {
    try {
      await copyText(safeSnippets[lang]);
      setCopyMsg('Copied to clipboard');
    } catch {
      setCopyMsg('Copy failed. Select the code and copy it manually.');
    }
    setTimeout(() => setCopyMsg(''), 2500);
  }

  function onTabKeyDown(e) {
    const idx = LANGS.indexOf(lang);
    let next = null;
    if (e.key === 'ArrowRight') next = LANGS[(idx + 1) % LANGS.length];
    if (e.key === 'ArrowLeft') next = LANGS[(idx - 1 + LANGS.length) % LANGS.length];
    if (e.key === 'Home') next = LANGS[0];
    if (e.key === 'End') next = LANGS[LANGS.length - 1];
    if (next) {
      e.preventDefault();
      setLang(next);
      tabRefs.current[next]?.focus();
    }
  }

  const testLogRef = useRef([]);
  const testingRef = useRef(false);
  const stepsRef = useRef(initialSteps());

  function pushLog(line, ok) {
    testLogRef.current = [...testLogRef.current, { line, ok, t: Date.now() }];
    setTestLog(testLogRef.current);
  }

  function resetLog() {
    testLogRef.current = [];
    setTestLog([]);
  }

  // Step tracker mirrors the real request outcomes; it never advances on its own.
  function mark(id, status) {
    stepsRef.current = { ...stepsRef.current, [id]: status };
    setSteps(stepsRef.current);
  }

  async function runTestConnection() {
    if (testingRef.current) return; // prevent concurrent probes
    const key = testKey.trim();
    resetLog();
    setOverall(null);
    setSteps(null);
    if (!key) {
      pushLog('Enter or create an API key first.', false);
      return;
    }
    if (!key.startsWith('caas_')) {
      pushLog('Key should look like caas_live_…', false);
      return;
    }

    testingRef.current = true;
    setTesting(true);
    stepsRef.current = initialSteps();
    setSteps(stepsRef.current);
    pushLog('Preparing test…', true);

    const base = import.meta.env.VITE_API_URL || '';
    const testCacheKey = `caas_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const value = { probe: true, at: new Date().toISOString() };
    const headers = {
      'x-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Safety TTL: probe expires even if the tab closes mid-test
    const SAFETY_TTL_SECONDS = 60;
    let putSucceeded = false;
    let probeOk = false;
    let cleanupOk = false;
    let originalFailure = null;
    let current = 'put';

    try {
      // PUT
      mark('put', 'running');
      const putRes = await fetch(
        `${base}/v1/cache/${encodeURIComponent(testCacheKey)}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ value, ttl: SAFETY_TTL_SECONDS }),
        }
      );
      const putBody = await putRes.json().catch(() => ({}));
      if (!putRes.ok) {
        originalFailure = `PUT failed (${putRes.status}): ${putBody.message || putRes.statusText}`;
        pushLog(originalFailure, false);
        mark('put', 'fail');
        mark('get', 'skipped');
        mark('compare', 'skipped');
      } else {
        putSucceeded = true;
        mark('put', 'pass');
        pushLog(
          `PUT successful: key=${testCacheKey}, ttl=${putBody.ttl ?? SAFETY_TTL_SECONDS}s`,
          true
        );

        // GET
        current = 'get';
        mark('get', 'running');
        const getRes = await fetch(
          `${base}/v1/cache/${encodeURIComponent(testCacheKey)}`,
          {
            method: 'GET',
            headers: { 'x-api-key': key, Accept: 'application/json' },
          }
        );
        const getBody = await getRes.json().catch(() => ({}));
        const xCache = getRes.headers.get('X-Cache');
        if (!getRes.ok) {
          originalFailure = `GET failed (${getRes.status}): ${getBody.message || getRes.statusText}`;
          pushLog(originalFailure, false);
          mark('get', 'fail');
          mark('compare', 'skipped');
        } else {
          mark('get', 'pass');
          pushLog(`GET successful: X-Cache: ${xCache || 'n/a'}`, true);
          current = 'compare';
          const match =
            JSON.stringify(getBody.value) === JSON.stringify(value);
          if (!match) {
            originalFailure = 'Value comparison failed: the response differs from the stored value.';
            pushLog(originalFailure, false);
            mark('compare', 'fail');
          } else {
            pushLog('Value comparison passed', true);
            mark('compare', 'pass');
            probeOk = true;
          }
        }
      }
    } catch (err) {
      originalFailure = `Unexpected error: ${err.message || String(err)}`;
      pushLog(originalFailure, false);
      mark(current, 'fail');
      for (const id of ['get', 'compare']) {
        if (stepsRef.current[id] === 'pending') mark(id, 'skipped');
      }
    } finally {
      // Always attempt cleanup if PUT created the probe key
      if (putSucceeded) {
        mark('del', 'running');
        try {
          const delRes = await fetch(
            `${base}/v1/cache/${encodeURIComponent(testCacheKey)}`,
            {
              method: 'DELETE',
              headers: { 'x-api-key': key, Accept: 'application/json' },
            }
          );
          const delBody = await delRes.json().catch(() => ({}));
          if (!delRes.ok) {
            pushLog(
              `Cleanup failed (${delRes.status}): ${delBody.message || delRes.statusText}`,
              false
            );
            cleanupOk = false;
          } else {
            pushLog('Cleanup successful: probe key removed', true);
            cleanupOk = true;
          }
        } catch (cleanupErr) {
          pushLog(
            `Cleanup failed: ${cleanupErr.message || String(cleanupErr)}`,
            false
          );
          cleanupOk = false;
        }
        mark('del', cleanupOk ? 'pass' : 'fail');
      } else {
        // Nothing to clean up
        cleanupOk = true;
        mark('del', 'skipped');
      }

      if (probeOk && cleanupOk) {
        pushLog('Overall result: connection test passed.', true);
        setOverall('pass');
      } else if (probeOk && !cleanupOk) {
        pushLog(
          'Overall result: probe succeeded but cleanup failed. The entry will expire via safety TTL (60s).',
          false
        );
        setOverall('warn');
      } else {
        pushLog(
          `Overall result: connection test failed.${originalFailure ? ` (${originalFailure})` : ''}`,
          false
        );
        setOverall('fail');
      }
      testingRef.current = false;
      setTesting(false);
    }
  }

  const meta = LANG_META[lang];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-10">
      <div className="min-w-0 space-y-10">
        <PageHeader
          title="Integrate CaaS"
          subtitle="Create a key, copy an example for your language, then check the connection from this page."
        />

        {/* Getting started */}
        <section aria-labelledby="getting-started" className="scroll-mt-20">
          <SectionHeader id="getting-started" title="Getting started" />
          <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {[
              { title: 'Get a key', body: 'Select or create an API key.' },
              { title: 'Pick a language', body: 'Choose JavaScript, Python, or cURL.' },
              { title: 'Copy the snippet', body: 'Copy the integration snippet.' },
              {
                title: 'Configure secrets',
                body: (
                  <>
                    Set <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">CAAS_API_KEY</code> in your
                    environment. Never commit it to a repository.
                  </>
                ),
              },
              { title: 'Verify', body: 'Run Test connection below against this backend.' },
            ].map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-2 px-5 py-3.5 sm:grid-cols-[2.5rem_12rem_minmax(0,1fr)]">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${STEP_COLORS[i % STEP_COLORS.length]}`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-fg">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </p>
                <p className="col-start-2 text-[13px] text-fg-muted sm:col-start-3">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* API keys */}
        <section aria-labelledby="api-keys-section" className="scroll-mt-20">
          <SectionHeader
            id="api-keys-section"
            title="API keys"
            description="A key's secret is shown once, when you create it. After that we only store a hash, so this list shows prefixes."
            actions={
              <Button
                variant="primary"
                icon={IconPlus}
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create new API key'}
              </Button>
            }
          />

          <Card padded={false}>
            {keysQuery.isLoading && (
              <LoadingRegion label="Loading keys…" className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </LoadingRegion>
            )}
            {keysQuery.isError && (
              <p className="p-4 text-sm text-danger-fg" role="alert">
                Could not load keys. {keysQuery.error?.message}
              </p>
            )}
            {keys.length > 0 && (
              <ul className="divide-y divide-line">
                {keys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">
                          {k.label || 'Unnamed'}{' '}
                          <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-normal text-fg-muted">
                            {(k.prefix || k.keyPrefix || '').replace(/\.+$/, '') + '…'}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          Created {k.createdAt ? new Date(k.createdAt).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                    <Badge tone={k.revoked ? 'neutral' : 'success'} dot>
                      {k.revoked ? 'Revoked' : 'Active'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {keys.length === 0 && !keysQuery.isLoading && !keysQuery.isError && (
              <EmptyState title="No API keys yet" description="Create one to start calling the cache API." />
            )}
          </Card>

          {createMutation.isError && (
            <p className="mt-2 text-sm text-danger-fg" role="alert">
              {createMutation.error?.body?.message || createMutation.error?.message}
            </p>
          )}

          <OneTimeSecret
            secret={newSecret}
            copyLabel="Copy key"
            copiedMessage="API key copied"
            onDismiss={() => setNewSecret(null)}
          />
        </section>

        {/* Code examples */}
        <section aria-labelledby="examples" className="scroll-mt-20">
          <SectionHeader
            id="examples"
            title="Code examples"
            description={
              <>
                Public API base path: <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">/v1/cache/:key</code>. Auth
                header: <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">x-api-key</code>. PUT body:{' '}
                <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">{'{ "value": ..., "ttl": 300 }'}</code> (TTL in
                seconds).
              </>
            }
          />
          <div className="overflow-hidden rounded-2xl border border-code-line bg-code shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-code-line bg-code-2 px-2 py-1.5">
              <div className="flex items-center" role="tablist" aria-label="Example language">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    ref={(el) => {
                      tabRefs.current[l] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${l}`}
                    aria-selected={lang === l}
                    aria-controls="code-panel"
                    tabIndex={lang === l ? 0 : -1}
                    onClick={() => setLang(l)}
                    onKeyDown={onTabKeyDown}
                    className={`relative h-8 rounded-lg px-3 text-[13px] focus-visible:outline-sidebar-accent ${
                      lang === l ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {LANG_META[l].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 pr-1">
                <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">{meta.file}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-white/15 px-2.5 text-xs text-slate-200 hover:bg-white/10 focus-visible:outline-sidebar-accent"
                  aria-label={`Copy ${lang} example`}
                >
                  {copyMsg === 'Copied to clipboard' ? (
                    <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5" />
                  )}
                  {copyMsg === 'Copied to clipboard' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div id="code-panel" role="tabpanel" aria-labelledby={`tab-${lang}`} tabIndex={0} className="focus-visible:outline-sidebar-accent">
              <pre className="max-h-[440px] overflow-auto p-4 text-[12.5px] leading-relaxed text-slate-200">
                <code>
                  <CodeLines code={safeSnippets[lang]} comment={meta.comment} />
                </code>
              </pre>
            </div>
          </div>
          {copyMsg && (
            <p className={`mt-2 text-sm ${copyMsg.startsWith('Copy failed') ? 'text-danger-fg' : 'text-success-fg'}`} role="status">
              {copyMsg}
            </p>
          )}
        </section>

        {/* Test connection */}
        <section aria-labelledby="test-connection" className="scroll-mt-20">
          <Card padded={false} className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <CardHeader
                titleId="test-connection"
                icon={IconPlay}
                title="Test connection"
                description="Sends a real PUT, GET and DELETE to this backend with your key. Once the probe key has been written, the DELETE cleanup is always attempted, including when GET or the value comparison fails. The probe key also has a 60-second safety TTL, so it expires on its own if cleanup can't finish."
              />
            </div>

            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="test-api-key" className={labelClass}>
                    API key (paste or create above)
                  </label>
                  <div className="relative">
                    <input
                      id="test-api-key"
                      type={testKeyVisible ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      value={testKey}
                      onChange={(e) => setTestKey(e.target.value)}
                      placeholder="caas_live_…"
                      className={`${inputClass} pr-10 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setTestKeyVisible((v) => !v)}
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg"
                      aria-label={testKeyVisible ? 'Hide test key' : 'Show test key'}
                    >
                      {testKeyVisible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldHint>The key is kept in memory for this page only and is never written to logs or storage.</FieldHint>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  icon={IconPlay}
                  onClick={runTestConnection}
                  disabled={testing}
                  loading={testing}
                  className="sm:mb-[22px]"
                >
                  {testing ? 'Testing…' : 'Test connection'}
                </Button>
              </div>

              {steps && (
                <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Probe progress">
                  {STEP_DEFS.map((d) => {
                    const st = STEP_STATUS[steps[d.id]] || STEP_STATUS.pending;
                    return (
                      <li key={d.id} className="flex items-start gap-3 border-t-2 border-line pt-2.5" style={{ borderTopColor: steps[d.id] === 'pass' ? 'var(--c-grass)' : steps[d.id] === 'fail' ? 'var(--c-tomato)' : steps[d.id] === 'running' ? 'var(--c-brand)' : undefined }}>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-fg">
                            <MethodBadge method={d.method} /> {d.label}
                          </p>
                          <p className={`mt-1 text-xs font-medium ${st.cls}`}>{st.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {overall && (
                <div
                  className={`mt-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
                    overall === 'pass'
                      ? 'border-success-line bg-success-soft text-success-fg'
                      : overall === 'warn'
                        ? 'border-warning-line bg-warning-soft text-warning-fg'
                        : 'border-danger-line bg-danger-soft text-danger-fg'
                  }`}
                >
                  {overall === 'pass' ? <IconCheck className="h-4 w-4" /> : <IconAlert className="h-4 w-4" />}
                  {overall === 'pass'
                    ? 'Connected. Your key can write, read and delete cache entries.'
                    : overall === 'warn'
                      ? 'The probe worked but cleanup did not. The probe key expires within 60 seconds.'
                      : 'Verification failed. The log below shows which step failed.'}
                </div>
              )}

              {testLog.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-xl border border-code-line bg-code">
                  <div className="flex items-center gap-2 border-b border-code-line px-3 py-1.5 text-xs text-slate-400">
                    <IconTerminal className="h-3.5 w-3.5" /> Probe log
                  </div>
                  <ul className="space-y-1 p-3 font-mono text-xs" aria-live="polite">
                    {testLog.map((e) => (
                      <li key={e.t + e.line} className={`flex gap-2 ${e.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                        <span aria-hidden>{e.ok ? '✓' : '✗'}</span>
                        <span className="sr-only">{e.ok ? 'OK:' : 'Error:'}</span>
                        <span className="break-all">{e.line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* API reference */}
        <section aria-labelledby="api-ref" className="scroll-mt-20">
          <SectionHeader id="api-ref" title="API reference" />
          <Card padded={false} className="overflow-hidden">
            <div className={t.wrap}>
              <table className={t.table}>
                <thead className={t.thead}>
                  <tr>
                    <th scope="col" className={t.th}>Method</th>
                    <th scope="col" className={t.th}>Path</th>
                    <th scope="col" className={t.th}>Notes</th>
                  </tr>
                </thead>
                <tbody className="text-fg">
                  <tr className={t.tr}>
                    <td className={t.td}><MethodBadge method="PUT" /></td>
                    <td className={`${t.td} whitespace-nowrap font-mono text-xs`}>/v1/cache/:key</td>
                    <td className={`${t.td} text-fg-muted`}>
                      Body <code className="text-fg">{'{ value, ttl }'}</code>. Header{' '}
                      <code className="text-fg">x-api-key</code>. Success 200.
                    </td>
                  </tr>
                  <tr className={t.tr}>
                    <td className={t.td}><MethodBadge method="GET" /></td>
                    <td className={`${t.td} whitespace-nowrap font-mono text-xs`}>/v1/cache/:key</td>
                    <td className={`${t.td} text-fg-muted`}>
                      200 + <code className="text-fg">X-Cache: HIT</code> or 404 + <code className="text-fg">X-Cache: MISS</code>.
                    </td>
                  </tr>
                  <tr className={t.tr}>
                    <td className={t.td}><MethodBadge method="DELETE" /></td>
                    <td className={`${t.td} whitespace-nowrap font-mono text-xs`}>/v1/cache/:key</td>
                    <td className={`${t.td} text-fg-muted`}>200 when deleted; 404 if missing.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
            {[
              <>
                Rate-limit headers may include{' '}
                <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">X-RateLimit-*</code> and{' '}
                <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">Retry-After</code> on 429.
              </>,
              <>TTL is in seconds. Values are JSON; max size is 1&nbsp;MB.</>,
              <>Keys are namespaced per account, so one account can't read another's keys.</>,
            ].map((node, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-fg-subtle" aria-hidden>–</span>
                <span>{node}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Troubleshooting */}
        <section aria-labelledby="troubleshoot" className="scroll-mt-20">
          <SectionHeader id="troubleshoot" title="Troubleshooting" description="Common responses and how to resolve them." />
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {[
              {
                code: '401',
                tone: 'danger',
                title: '401 / invalid API key',
                body: (
                  <>
                    Check the <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">x-api-key</code> header. Revoked
                    keys are rejected. Create a new key if the secret was lost.
                  </>
                ),
              },
              {
                code: '404',
                tone: 'neutral',
                title: '404 on GET with X-Cache: MISS',
                body: <>A normal cache miss: the key doesn't exist or has expired. PUT it first.</>,
              },
              {
                code: '429',
                tone: 'warning',
                title: '429 Too Many Requests',
                body: (
                  <>
                    Per-minute or monthly quota exceeded. Respect{' '}
                    <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">Retry-After</code>. Check Usage &amp; Limits in
                    the dashboard.
                  </>
                ),
              },
              {
                code: '400',
                tone: 'info',
                title: '400 validation errors',
                body: (
                  <>
                    Ensure body includes <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">value</code> and a positive
                    integer <code className="rounded bg-surface-2 px-1 text-[12px] text-fg">ttl</code>.
                  </>
                ),
              },
            ].map((item, i) => (
              <details key={item.code} className="group" open={i === 0}>
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium text-fg hover:bg-surface-2/60">
                  <Badge tone={item.tone} className="font-mono">
                    {item.code}
                  </Badge>
                  <span className="flex-1">{item.title}</span>
                  <IconChevronDown className="h-4 w-4 text-fg-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 pl-[4.25rem] text-sm text-fg-muted">{item.body}</div>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* On-this-page navigation (wide screens) */}
      <aside className="hidden xl:block" aria-label="On this page">
        <div className="sticky top-20">
          <p className="mb-2 text-[13px] font-medium text-fg">On this page</p>
          <ul className="space-y-1 border-l border-line text-[13px]">
            {TOC.map((x) => (
              <li key={x.href}>
                <a href={x.href} className="-ml-px block border-l border-transparent py-1 pl-3 text-fg-muted hover:border-fg-subtle hover:text-fg">
                  {x.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
