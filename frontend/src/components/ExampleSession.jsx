/**
 * Static example of the public API: one PUT, one GET, with the response
 * shapes and headers the backend actually returns. Labelled as an example.
 */
const LINES = [
  { t: 'cmd', s: 'curl -X PUT $CAAS_URL/v1/cache/user:42 \\' },
  { t: 'in', s: '    -H "x-api-key: $CAAS_API_KEY" \\' },
  { t: 'in', s: '    -H "Content-Type: application/json" \\' },
  { t: 'in', s: '    -d \'{"value":{"name":"Ada"},"ttl":300}\'' },
  { t: 'out', s: '{"success":true,"cached":true,"key":"user:42",' },
  { t: 'out', s: ' "ttl":300,"message":"Value successfully cached."}' },
  { t: 'gap', s: '\u00a0' },
  { t: 'cmd', s: 'curl -i $CAAS_URL/v1/cache/user:42 \\' },
  { t: 'in', s: '    -H "x-api-key: $CAAS_API_KEY"' },
  { t: 'out', s: 'HTTP/1.1 200 OK' },
  { t: 'hit', s: 'X-Cache: HIT' },
  { t: 'out', s: '{"cached":true,"key":"user:42",' },
  { t: 'out', s: ' "value":{"name":"Ada"},"ttl":297}' },
];

export default function ExampleSession({ caption = 'Example: store a value, then read it back' }) {
  const dim = 'text-[#8e9ac4]';
  const key = 'text-[#6ee7b7]';
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1238]/80 shadow-overlay">
      <figcaption className="border-b border-white/10 px-4 py-2.5 text-xs text-sidebar-muted">
        {caption}
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-[#e8ebf7]">
        <code>
          {LINES.map((l, i) => (
            <span key={i} className={`block ${l.t === 'out' ? dim : l.t === 'hit' ? key : ''}`}>
              {l.t === 'cmd' && <span className="text-[#8fa8ff]">$ </span>}
              {l.s}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
