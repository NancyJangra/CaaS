import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getItems,
  updateItemTtl,
  deleteItem,
  clearAllItems,
} from '../api/client';
import ConfirmDialog from '../components/items/ConfirmDialog';
import { formatBytes, formatTtl, formatDate } from '../components/items/format';
import Button from '../components/ui/Button';
import {
  Card,
  PageHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  LoadingRegion,
  Select,
  inputClass,
  labelClass,
  tableClasses as t,
} from '../components/ui/primitives';
import { Toast, IconCopyButton } from '../components/ui/feedback';
import {
  IconRefresh,
  IconTrash,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconDatabase,
  IconEdit,
  IconClose,
} from '../components/ui/Icons';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'key', label: 'Key' },
  { value: 'size', label: 'Size' },
  { value: 'ttl', label: 'TTL' },
];

const TTL_PRESETS = [
  { label: '1 minute', seconds: 60 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
];

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CachedItems() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const debouncedSearch = useDebounced(searchInput, 350);
  const urlSearch = searchParams.get('search');
  useEffect(() => {
    if (urlSearch != null) setSearchInput(urlSearch);
  }, [urlSearch]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [toast, setToast] = useState('');
  const [ttlItem, setTtlItem] = useState(null);
  const [ttlPreset, setTtlPreset] = useState(3600);
  const [ttlCustom, setTtlCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const queryKey = useMemo(
    () => ['items', { search: debouncedSearch, page, sort, order }],
    [debouncedSearch, page, sort, order]
  );

  const itemsQuery = useQuery({
    queryKey,
    queryFn: () =>
      getItems({
        search: debouncedSearch,
        page,
        limit: 20,
        sort,
        order,
      }),
    placeholderData: (prev) => prev,
    staleTime: 5000,
  });

  const data = itemsQuery.data;
  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const ttlMutation = useMutation({
    mutationFn: ({ key, ttl }) => updateItemTtl(key, ttl),
    onSuccess: () => {
      setToast('TTL updated');
      setTtlItem(null);
      setUseCustom(false);
      setTtlCustom('');
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key) => deleteItem(key),
    onSuccess: () => {
      setToast('Item deleted');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearAllItems(),
    onSuccess: (res) => {
      setToast(`Cleared ${res.deletedCount ?? 0} item(s)`);
      setClearOpen(false);
      setClearText('');
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });

  function openTtl(item) {
    setTtlItem(item);
    setTtlPreset(3600);
    setUseCustom(false);
    setTtlCustom('');
    ttlMutation.reset();
  }

  function submitTtl() {
    if (!ttlItem) return;
    const ttl = useCustom ? Number(ttlCustom) : ttlPreset;
    if (!Number.isInteger(ttl) || ttl <= 0) {
      ttlMutation.reset();
      return;
    }
    ttlMutation.mutate({ key: ttlItem.key, ttl });
  }

  const customValid =
    Number.isInteger(Number(ttlCustom)) && Number(ttlCustom) > 0;


  function sortBy(field) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder(field === 'key' ? 'asc' : 'desc');
    }
  }

  const COLUMNS = [
    { field: 'key', label: 'Cache Key' },
    { field: 'size', label: 'Size', className: 'hidden sm:table-cell' },
    { field: 'ttl', label: 'TTL Remaining' },
    { field: 'createdAt', label: 'Created At', className: 'hidden md:table-cell' },
  ];

  const firstRow = (pagination.page - 1) * pagination.limit + 1;
  const lastRow = Math.min(pagination.total, pagination.page * pagination.limit);
  const newTtl = useCustom ? Number(ttlCustom) : ttlPreset;

  return (
    <div>
      <PageHeader
        title="Cached Items"
        subtitle="Keys stored under your account. Redis removes expired keys on its own; this list reflects what is live now."
        meta={
          data && (
            <span className="text-[13px] text-fg">
              <span>
                {pagination.total} item{pagination.total === 1 ? '' : 's'}
                {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
              </span>
            </span>
          )
        }
        actions={
          <>
            <Button
              icon={IconRefresh}
              onClick={() => itemsQuery.refetch()}
              loading={itemsQuery.isFetching && !!data}
            >
              Refresh
            </Button>
            <Button
              variant="danger-outline"
              icon={IconTrash}
              onClick={() => {
                setClearText('');
                setClearOpen(true);
                clearMutation.reset();
              }}
            >
              Clear all
            </Button>
          </>
        }
      />

      <Card padded={false} className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="items-search" className="sr-only">
              Search by key
            </label>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              id="items-search"
              type="search"
              placeholder="Search by key…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${inputClass} pl-9 pr-16 [&::-webkit-search-cancel-button]:hidden`}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                <IconClose className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="items-sort" className="text-[13px] text-fg-muted">
              Sort
            </label>
            <Select
              id="items-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-auto"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              icon={order === 'asc' ? IconArrowUp : IconArrowDown}
              aria-label={order === 'asc' ? 'Sort ascending (click for descending)' : 'Sort descending (click for ascending)'}
            >
              {order === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </div>
        </div>

        {itemsQuery.isLoading && !data && (
          <LoadingRegion label="Loading cached items…" className="divide-y divide-line">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-6 px-4 py-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-7 w-32" />
              </div>
            ))}
          </LoadingRegion>
        )}

        {itemsQuery.isError && !data && (
          <div className="p-4">
            <ErrorState
              title="Could not load items."
              message={itemsQuery.error?.message}
              onRetry={() => itemsQuery.refetch()}
            />
          </div>
        )}

        {data && items.length === 0 && (
          debouncedSearch ? (
            <EmptyState
              icon={IconSearch}
              title={`No keys match “${debouncedSearch}”.`}
              description="Search matches any part of the key, so try fewer characters."
              action={
                <Button size="sm" onClick={() => setSearchInput('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={IconDatabase}
              title="Your cache is empty."
              description={
                <>
                  Store a value with <code className="text-[13px] text-fg">PUT /v1/cache/:key</code> and it
                  will be listed here. The Integrate page has copy-paste examples.
                </>
              }
            />
          )
        )}

        {items.length > 0 && (
          <div className={t.wrap}>
            <table className={t.table}>
              <caption className="sr-only">Cached items, sorted by {sort} {order === 'asc' ? 'ascending' : 'descending'}</caption>
              <thead className={t.thead}>
                <tr>
                  {COLUMNS.map((c) => {
                    const active = sort === c.field;
                    return (
                      <th
                        key={c.field}
                        scope="col"
                        className={`${t.th} ${c.className || ''}`}
                        aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => sortBy(c.field)}
                          className={`-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-fg ${active ? 'text-fg' : ''}`}
                        >
                          {c.label}
                          {active ? (
                            order === 'asc' ? <IconArrowUp className="h-3 w-3" /> : <IconArrowDown className="h-3 w-3" />
                          ) : null}
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className={`${t.th} text-right`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const expiringSoon = item.ttlRemaining != null && item.ttlRemaining >= 0 && item.ttlRemaining <= 60;
                  return (
                    <tr key={item.key} className={`${t.tr} group`}>
                      <td className={`${t.td} max-w-[8rem] sm:max-w-xs lg:max-w-md`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="block truncate font-mono text-[13px] text-fg" title={item.key}>
                            {item.key}
                          </span>
                          <IconCopyButton
                            text={item.key}
                            label="Copy key"
                            className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                            onCopied={() => setToast('Key copied')}
                          />
                        </div>
                      </td>
                      <td className={`${t.td} hidden whitespace-nowrap tabular-nums text-fg-muted sm:table-cell`}>
                        {formatBytes(item.size)}
                      </td>
                      <td className={`${t.td} whitespace-nowrap`}>
                        <span
                          className={`tabular-nums ${expiringSoon ? 'font-medium text-warning-fg' : 'text-fg'}`}
                          title={expiringSoon ? 'Expires within a minute' : undefined}
                        >
                          {formatTtl(item.ttlRemaining)}
                          {expiringSoon && <span className="sr-only"> (expires within a minute)</span>}
                        </span>
                      </td>
                      <td className={`${t.td} hidden whitespace-nowrap text-fg-muted md:table-cell`}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td className={`${t.td} whitespace-nowrap text-right`}>
                        <div className="inline-flex gap-1">
                          <Button size="xs" variant="ghost" icon={IconEdit} onClick={() => openTtl(item)}>
                            <span className="sr-only sm:not-sr-only">Edit TTL</span>
                          </Button>
                          <Button
                            size="xs"
                            variant="danger-ghost"
                            icon={IconTrash}
                            onClick={() => {
                              setDeleteTarget(item);
                              deleteMutation.reset();
                            }}
                          >
                            <span className="sr-only sm:not-sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && pagination.total > 0 && (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[13px] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <span className="font-medium text-fg">{firstRow}–{lastRow}</span> of{' '}
              <span className="font-medium text-fg">{pagination.total}</span>
            </span>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="mr-1">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Toast message={toast} onDismiss={() => setToast('')} />

      {/* TTL dialog */}
      <ConfirmDialog
        open={!!ttlItem}
        title="Update TTL"
        description="The new TTL replaces the remaining lifetime, counted from now."
        confirmLabel="Update TTL"
        disabled={useCustom && !customValid}
        loading={ttlMutation.isPending}
        onCancel={() => setTtlItem(null)}
        onConfirm={submitTtl}
      >
        {ttlItem && (
          <div className="mt-4 space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-surface-2 px-3.5 py-3 text-[13px]">
              <dt className="text-fg-muted">Key</dt>
              <dd className="truncate font-mono text-fg" title={ttlItem.key}>
                {ttlItem.key}
              </dd>
              <dt className="text-fg-muted">Current TTL</dt>
              <dd className="tabular-nums text-fg">{formatTtl(ttlItem.ttlRemaining)}</dd>
            </dl>

            <fieldset>
              <legend className={labelClass}>New TTL</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TTL_PRESETS.map((p) => {
                  const active = !useCustom && ttlPreset === p.seconds;
                  return (
                    <button
                      key={p.seconds}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setUseCustom(false);
                        setTtlPreset(p.seconds);
                      }}
                      className={`h-9 rounded-xl border text-[13px] ${
                        active
                          ? 'border-brand bg-brand-solid font-semibold text-white'
                          : 'border-line-strong bg-surface text-fg hover:bg-surface-2'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={useCustom}
                  onClick={() => setUseCustom(true)}
                  className={`h-9 rounded-xl border text-[13px] ${
                    useCustom
                      ? 'border-brand bg-brand-solid font-semibold text-white'
                      : 'border-line-strong bg-surface text-fg hover:bg-surface-2'
                  }`}
                >
                  Custom
                </button>
              </div>
            </fieldset>

            {useCustom && (
              <div>
                <label htmlFor="custom-ttl" className={labelClass}>
                  Custom TTL (seconds)
                </label>
                <div className="relative">
                  <input
                    id="custom-ttl"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={ttlCustom}
                    onChange={(e) => setTtlCustom(e.target.value)}
                    aria-invalid={ttlCustom !== '' && !customValid}
                    aria-describedby="custom-ttl-hint"
                    className={`${inputClass} pr-20 tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
                    seconds
                  </span>
                </div>
                <p id="custom-ttl-hint" className={`mt-1.5 text-xs ${ttlCustom !== '' && !customValid ? 'text-danger-fg' : 'text-fg-muted'}`}>
                  {ttlCustom !== '' && !customValid
                    ? 'Enter a whole number of seconds greater than 0.'
                    : customValid
                      ? `≈ ${formatTtl(Number(ttlCustom))}`
                      : 'Whole seconds, greater than 0.'}
                </p>
              </div>
            )}

            {(!useCustom || customValid) && (
              <p className="text-[13px] text-fg-muted">
                Entry will expire in <span className="font-medium text-fg">{formatTtl(newTtl)}</span>.
              </p>
            )}

            {ttlMutation.isError && (
              <p className="text-sm text-danger-fg" role="alert">
                {ttlMutation.error?.body?.message || ttlMutation.error?.message || 'Update failed'}
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>

      {/* Delete one */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete cache entry"
        description={
          deleteTarget
            ? `This removes “${deleteTarget.key}” from Redis. This cannot be undone from the dashboard.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
      >
        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-danger-fg" role="alert">
            {deleteMutation.error?.body?.message || deleteMutation.error?.message}
          </p>
        )}
      </ConfirmDialog>

      {/* Clear all */}
      <ConfirmDialog
        open={clearOpen}
        title="Clear all cached items"
        description="This deletes every cache entry in your account only. Other users are not affected. Type CLEAR to confirm. This cannot be undone."
        confirmLabel="Clear all items"
        danger
        disabled={clearText !== 'CLEAR'}
        loading={clearMutation.isPending}
        onCancel={() => {
          setClearOpen(false);
          setClearText('');
        }}
        onConfirm={() => {
          if (clearText !== 'CLEAR' || clearMutation.isPending) return;
          clearMutation.mutate();
        }}
      >
        <div className="mt-4">
          <label htmlFor="clear-confirm" className={labelClass}>
            Type CLEAR
          </label>
          <input
            id="clear-confirm"
            value={clearText}
            onChange={(e) => setClearText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="CLEAR"
            className={`${inputClass} font-mono`}
          />
          {clearMutation.isError && (
            <p className="mt-2 text-sm text-danger-fg" role="alert">
              {clearMutation.error?.body?.message || clearMutation.error?.message}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
