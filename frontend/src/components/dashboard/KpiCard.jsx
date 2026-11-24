import { Sparkline } from './Sparkline';

/**
 * Pastel KPI card: icon circle, label, figure, optional real-data sparkline,
 * and a one-line caption. No "vs last week" deltas: the stats API returns no
 * comparison period, so none are shown.
 */
export const CARD_TONES = {
  cobalt: { card: 'bg-[#e8eeff] border-[#c9d6ff] dark:bg-cobalt-soft dark:border-cobalt-line', icon: 'bg-[#3461f0]', spark: 'var(--c-cobalt)' },
  orchid: { card: 'bg-[#f1ebff] border-[#ddd0ff] dark:bg-orchid-soft dark:border-orchid-line', icon: 'bg-[#8b5cf6]', spark: 'var(--c-orchid)' },
  grass: { card: 'bg-[#e3f7ef] border-[#b4ead3] dark:bg-grass-soft dark:border-grass-line', icon: 'bg-[#10b981]', spark: 'var(--c-grass)' },
  sunflower: { card: 'bg-[#fff1e6] border-[#fed7b8] dark:bg-sunflower-soft dark:border-sunflower-line', icon: 'bg-[#f97316]', spark: 'var(--c-sunflower)' },
};

export default function KpiCard({ title, value, subtitle, hint, icon: Icon, color = 'cobalt', spark, sparkLabel }) {
  const t = CARD_TONES[color] || CARD_TONES.cobalt;
  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border px-4 py-4 shadow-card transition-shadow hover:shadow-raised ${t.card}`}
      aria-label={title}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${t.icon}`} aria-hidden>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <h3 className="text-[13.5px] font-semibold text-fg">{title}</h3>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[28px] font-bold leading-tight text-fg">{value}</p>
        {spark && spark.length > 1 && (
          <Sparkline values={spark} color={t.spark} label={sparkLabel} className="mb-1 h-10 w-28 shrink-0" />
        )}
      </div>
      {subtitle && <p className="mt-1 text-[12.5px] font-medium text-fg">{subtitle}</p>}
      {hint && <p className="mt-1 text-[12px] text-fg-muted">{hint}</p>}
    </article>
  );
}
