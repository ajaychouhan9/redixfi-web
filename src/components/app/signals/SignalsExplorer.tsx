"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Search, Filter, ArrowUpDown, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { getSignals } from "@/lib/api/endpoints";
import { formatObservationDate } from "@/lib/format";
import type { SignalRow, SignalsPageInfo, SharedScreenParams } from "@/lib/api/types";
import { SIGNAL_SECTORS } from "@/data/sectors";
import { SignalMobileRow, SignalTableRow, type VisibleColumns } from "./SignalTableRow";
import { ExportButton } from "@/components/ui/ExportButton";
import { ShareScreenButton } from "./ShareScreenButton";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";
import { isProEntitled } from "@/lib/entitlements";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMarketState } from "@/lib/market/useMarketState";
import { signalsListLabels } from "@/lib/signals-list-labels";
import { from52Display } from "@/lib/from52-display";
import { getWatchlist } from "@/lib/api/mutations";
import type { SmartFilterPatch } from "./smartFilterPatch";

const SIGNALS_COLUMNS_KEY = "redixfi:signals-columns:v1";
const FROM52_DEFAULT_MIGRATION_KEY = "redixfi:signals-columns:from52-default:v1";
const DEFAULT_SIGNALS_COLUMNS: VisibleColumns = {
  sector: true, delivery: true, volume: true, chips: true, eventRisk: true,
  from52: true, volatility: true,
};

const SORT_OPTIONS = [
  { value: "symbol", label: "Symbol (A–Z)" },
  { value: "name", label: "Name (A–Z)" },
  { value: "market_cap", label: "Market cap" },
  { value: "delivery_pct", label: "Delivery %" },
  { value: "sector_rank", label: "Sector rank" },
  { value: "volume_ratio", label: "Volume ratio" },
  { value: "pct_below_52w_high", label: "From 52-week high" },
  { value: "vol_pct_more", label: "Volatility" },
] as const;

const PAGE_SIZE = 50;
const DISCLAIMER = "Shows stocks that meet the chosen condition. This is data, not a recommendation.";
const FROM52_OPTIONS = [
  { value: "", label: "Any" },
  { value: "2", label: "Within 2%" },
  { value: "5", label: "Within 5%" },
  { value: "10", label: "Within 10%" },
  { value: "20", label: "Within 20%" },
  { value: "custom", label: "Custom maximum" },
];
const VOLATILITY_OPTIONS = [
  { value: "", label: "Any" },
  { value: "lower", label: "Lower (below 25%)" },
  { value: "lower_middle", label: "Lower-middle (25-50%)" },
  { value: "upper_middle", label: "Upper-middle (50-75%)" },
  { value: "higher", label: "Higher (75% and above)" },
  { value: "custom", label: "Custom range" },
];

export interface SignalsExplorerHandle {
  filterByIndustry: (industry: string) => void;
  applySmartFilters: (patch: SmartFilterPatch) => void;
}

function asNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const control =
  "h-9 w-full rounded-lg border border-border bg-hover px-2 text-xs text-foreground outline-none focus:border-accent/60";
const label = "flex flex-col gap-1 text-[11px] text-foreground-muted";

export const SignalsExplorer = forwardRef<SignalsExplorerHandle, { initialParams?: SharedScreenParams }>(function SignalsExplorer(
  { initialParams } = {},
  ref
) {
  const { user, getToken } = useAuth();
  const marketState = useMarketState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(initialParams?.q ?? "");
  const [sector, setSector] = useState(initialParams?.sector ?? "");
  const [industry, setIndustry] = useState<string>("");
  const [scoreMin, setScoreMin] = useState(initialParams?.score_min != null ? String(initialParams.score_min) : "");
  const [scoreMax, setScoreMax] = useState(initialParams?.score_max != null ? String(initialParams.score_max) : "");
  const [eventRiskOnly, setEventRiskOnly] = useState(!!initialParams?.event_risk);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[] | null>(null);

  const [from52Preset, setFrom52Preset] = useState<string>(
    (initialParams?.from_52w_max != null || initialParams?.from_52w_min != null) ? "custom" : ""
  );
  const [from52Custom, setFrom52Custom] = useState(
    initialParams?.from_52w_max != null ? String(initialParams.from_52w_max) : ""
  );
  const [from52Min, setFrom52Min] = useState(
    initialParams?.from_52w_min != null ? String(initialParams.from_52w_min) : ""
  );
  const [volatilityBand, setVolatilityBand] = useState<string>(
    initialParams?.volatility_band ?? (initialParams?.volatility_min != null || initialParams?.volatility_max != null ? "custom" : "")
  );
  const [volMin, setVolMin] = useState(initialParams?.volatility_min != null ? String(initialParams.volatility_min) : "");
  const [volMax, setVolMax] = useState(initialParams?.volatility_max != null ? String(initialParams.volatility_max) : "");
  const [volumeMin, setVolumeMin] = useState(initialParams?.volume_ratio_min != null ? String(initialParams.volume_ratio_min) : "");
  const [deliveryState, setDeliveryState] = useState(initialParams?.delivery_state ?? "");
  const [deltaMin, setDeltaMin] = useState(initialParams?.delta_1d_min != null ? String(initialParams.delta_1d_min) : "");
  const [dmaState, setDmaState] = useState(initialParams?.dma_state ?? "");
  const [pcrBand, setPcrBand] = useState(initialParams?.pcr_band ?? "");
  const [anomalyOnly, setAnomalyOnly] = useState(!!initialParams?.anomaly);
  const [moreOpen, setMoreOpen] = useState(false);

  const [sort, setSort] = useState<string>(initialParams?.sort ?? "symbol");
  const [order, setOrder] = useState<"asc" | "desc">(initialParams?.order ?? "asc");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<VisibleColumns>({
    sector: true, delivery: true, volume: true, chips: true, eventRisk: true,
    from52: true, volatility: true,
  });
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const columnsHydrated = useRef(false);

  useEffect(() => {
    let saved: Partial<VisibleColumns> | null = null;
    try {
      const raw = window.localStorage.getItem(SIGNALS_COLUMNS_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    const next: VisibleColumns = { ...DEFAULT_SIGNALS_COLUMNS, ...(saved ?? {}) };
    try {
      if (!window.localStorage.getItem(FROM52_DEFAULT_MIGRATION_KEY)) {
        next.from52 = true;
        window.localStorage.setItem(FROM52_DEFAULT_MIGRATION_KEY, "1");
      }
    } catch {
      // Storage can be unavailable in private modes; defaults still show the column.
    }
    setColumns(next);
    columnsHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!columnsHydrated.current) return;
    try {
      window.localStorage.setItem(SIGNALS_COLUMNS_KEY, JSON.stringify(columns));
    } catch {
      // No-op when storage is unavailable.
    }
  }, [columns]);

  function toggleSort(field: string) {
    setSort(field);
    setOrder(sort === field && order === "asc" ? "desc" : "asc");
  }

  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [notMatchedCount, setNotMatchedCount] = useState<number | null>(null);
  const [recentlyListedCount, setRecentlyListedCount] = useState<number | null>(null);
  const [incompleteHistoryCount, setIncompleteHistoryCount] = useState<number | null>(null);
  const [excludedInMasterCount, setExcludedInMasterCount] = useState<number | null>(null);
  const [extrasAsOf, setExtrasAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latestRowBar = useMemo(() => {
    const bars = rows
      .map((r) => r.price_data_as_of?.data_as_of)
      .filter((v): v is string => !!v && /T\d{2}:\d{2}/.test(v) && !/T00:00:00/.test(v))
      .sort();
    return bars.length ? bars[bars.length - 1] : null;
  }, [rows]);
  const labels = useMemo(
    () => signalsListLabels(marketState, marketState?.live_as_of ?? latestRowBar),
    [marketState, latestRowBar],
  );

  const from52Max = from52Preset === "custom" ? asNumber(from52Custom) : asNumber(from52Preset);
  const volatilityMin = volatilityBand === "custom" ? asNumber(volMin) : undefined;
  const volatilityMax = volatilityBand === "custom" ? asNumber(volMax) : undefined;

  useEffect(() => {
    if (!watchlistOnly || !user) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const wl = await getWatchlist(token);
      setWatchlistSymbols(wl.symbols);
    })();
  }, [watchlistOnly, user, getToken]);

  useEffect(() => {
    if (!columnPickerOpen) return;
    const close = () => setColumnPickerOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [columnPickerOpen]);

  const clearAll = useCallback(() => {
    setQ("");
    setSector("");
    setIndustry("");
    setScoreMin("");
    setScoreMax("");
    setFrom52Preset("");
    setFrom52Custom("");
    setFrom52Min("");
    setVolatilityBand("");
    setVolMin("");
    setVolMax("");
    setVolumeMin("");
    setDeliveryState("");
    setDeltaMin("");
    setDmaState("");
    setPcrBand("");
    setAnomalyOnly(false);
    setEventRiskOnly(false);
    setWatchlistOnly(false);
    setPage(1);
  }, []);

  const applySmartFilters = useCallback((patch: SmartFilterPatch) => {
    setQ("");
    setSector("");
    setIndustry(patch.sector ?? "");
    setScoreMin(patch.score_min != null ? String(patch.score_min) : "");
    setScoreMax(patch.score_max != null ? String(patch.score_max) : "");
    if (patch.from_52w_max != null || patch.from_52w_min != null) {
      setFrom52Preset("custom");
      setFrom52Custom(patch.from_52w_max != null ? String(patch.from_52w_max) : "");
    } else {
      setFrom52Preset("");
      setFrom52Custom("");
    }
    setFrom52Min(patch.from_52w_min != null ? String(patch.from_52w_min) : "");
    if (patch.volatility_band) {
      setVolatilityBand(patch.volatility_band);
      setVolMin("");
      setVolMax("");
    } else if (patch.volatility_min != null || patch.volatility_max != null) {
      setVolatilityBand("custom");
      setVolMin(patch.volatility_min != null ? String(patch.volatility_min) : "");
      setVolMax(patch.volatility_max != null ? String(patch.volatility_max) : "");
    } else {
      setVolatilityBand("");
      setVolMin("");
      setVolMax("");
    }
    setVolumeMin(patch.volume_ratio_min != null ? String(patch.volume_ratio_min) : "");
    setDeliveryState(patch.delivery_state ?? "");
    setDeltaMin(patch.delta_1d_min != null ? String(patch.delta_1d_min) : "");
    setDmaState(patch.dma_state ?? "");
    setPcrBand(patch.pcr_band ?? "");
    setAnomalyOnly(!!patch.anomaly);
    setEventRiskOnly(!!patch.event_risk);
    setWatchlistOnly(!!patch.watchlist_only && !!user);
    const advanced = patch.volume_ratio_min != null || patch.delivery_state != null
      || patch.delta_1d_min != null || patch.dma_state != null || patch.pcr_band != null
      || patch.anomaly != null || patch.event_risk != null || patch.watchlist_only != null;
    setMoreOpen(advanced);
    setPage(1);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [user]);

  useImperativeHandle(ref, () => ({
    filterByIndustry: (value: string) => {
      setIndustry(value);
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    applySmartFilters,
  }));

  const params = useMemo(
    () => ({
      q: q || undefined,
      sector: sector || undefined,
      industry: industry || undefined,
      score_min: asNumber(scoreMin),
      score_max: asNumber(scoreMax),
      event_risk: eventRiskOnly ? true : undefined,
      from_52w_max: from52Max,
      from_52w_min: asNumber(from52Min),
      volatility_band: volatilityBand && volatilityBand !== "custom" ? (volatilityBand as "lower" | "lower_middle" | "upper_middle" | "higher") : undefined,
      volatility_min: volatilityMin,
      volatility_max: volatilityMax,
      volume_ratio_min: asNumber(volumeMin),
      delivery_state: (deliveryState || undefined) as "above_avg" | "below_avg" | undefined,
      delta_1d_min: asNumber(deltaMin),
      dma_state: (dmaState || undefined) as "above_20dma" | "below_20dma" | undefined,
      pcr_band: (pcrBand || undefined) as "low" | "neutral" | "high" | undefined,
      anomaly: anomalyOnly ? true : undefined,
      sort,
      order,
      page,
      size: PAGE_SIZE,
    }),
    [q, sector, industry, scoreMin, scoreMax, eventRiskOnly, from52Max, from52Min,
     volatilityBand, volatilityMin, volatilityMax, volumeMin, deliveryState, deltaMin,
     dmaState, pcrBand, anomalyOnly, sort, order, page]
  );

  const shareParams: SharedScreenParams = useMemo(
    () => ({
      q: q || undefined,
      sector: sector || undefined,
      score_min: asNumber(scoreMin),
      score_max: asNumber(scoreMax),
      event_risk: eventRiskOnly ? true : undefined,
      from_52w_max: from52Max,
      from_52w_min: asNumber(from52Min),
      volatility_band: volatilityBand && volatilityBand !== "custom" ? (volatilityBand as SharedScreenParams["volatility_band"]) : undefined,
      volatility_min: volatilityMin,
      volatility_max: volatilityMax,
      volume_ratio_min: asNumber(volumeMin),
      delivery_state: (deliveryState || undefined) as SharedScreenParams["delivery_state"],
      delta_1d_min: asNumber(deltaMin),
      dma_state: (dmaState || undefined) as SharedScreenParams["dma_state"],
      pcr_band: (pcrBand || undefined) as SharedScreenParams["pcr_band"],
      anomaly: anomalyOnly ? true : undefined,
      sort,
      order,
    }),
    [q, sector, scoreMin, scoreMax, eventRiskOnly, from52Max, from52Min, volatilityBand,
     volatilityMin, volatilityMax, volumeMin, deliveryState, deltaMin, dmaState, pcrBand, anomalyOnly, sort, order]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const token = await getToken();
      getSignals(params, { token })
        .then((env) => {
          if (cancelled) return;
          let data = env.data;
          if (watchlistOnly) {
            const set = new Set(watchlistSymbols ?? []);
            data = data.filter((r) => set.has(r.symbol));
          }
          setRows(data);
          setTotal(env.page_info.total);
          const info = env.page_info as SignalsPageInfo;
          setNotMatchedCount(info.not_matched_count ?? info.short_history_count ?? null);
          setRecentlyListedCount(info.recently_listed_count ?? null);
          setIncompleteHistoryCount(info.incomplete_history_count ?? null);
          setExcludedInMasterCount(info.excluded_in_master_count ?? null);
          setExtrasAsOf(info.extras_as_of ?? null);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load signals."))
        .finally(() => !cancelled && setLoading(false));
    })();
    return () => {
      cancelled = true;
    };
  }, [params, watchlistOnly, watchlistSymbols, getToken]);

  useEffect(() => setPage(1), [
    q, sector, industry, scoreMin, scoreMax, eventRiskOnly, watchlistOnly, from52Preset,
    from52Custom, from52Min, volatilityBand, volMin, volMax, volumeMin, deliveryState,
    deltaMin, dmaState, pcrBand, anomalyOnly, sort, order,
  ]);

  const canExport = isProEntitled(user);
  const explorerControlsEnabled = true;       // every plan has the sort / filter / search controls (Free, Basic and Pro; 2026-11-11)

  const fetchExportRows = useCallback(async () => {
    const token = await getToken();
    const size = 200;
    const first = await getSignals({ ...params, page: 1, size }, { token });
    const pages = Math.ceil(first.page_info.total / size);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        getSignals({ ...params, page: i + 2, size }, { token })
      )
    );
    const all = [first, ...rest].flatMap((p) => p.data);
    return all.map((r) => {
      const f52 = from52Display(r.week52_high, r.pct_below_52w_high, r.last_price);
      return {
        symbol: r.symbol,
        company_name: r.company_name,
        sector: r.sector,
        industry: r.industry ?? "",
        price: r.last_price ?? "",
        price_as_of: r.price_data_as_of?.data_as_of ?? "",
        readings_as_of: labels.readingsDate ?? "",
        day_change_pct: r.day_change_pct ?? "",
        delivery_pct: r.delivery_pct ?? "",
        delivery_avg20: r.delivery_avg20 ?? "",
        volume_ratio_5d: r.volume_ratio_5d ?? "",
        volume_basis: "Last 5 full sessions vs prior 20 full sessions, as of close",
        from_52_week_high: f52.belowPct == null ? "n/a" : f52.atHigh ? "at 52-week high" : `${f52.belowPct.toFixed(1)}% below`,
        week_52_high: f52.high ?? "",
        volatility: r.volatility_text ?? "n/a",
        volatility_rank: r.vol_rank ?? "",
        volatility_ranked_of: r.vol_ranked_of ?? "",
        signal_chips: r.signal_states.join(", "),
        event_risk: r.event_risk ?? "",
      };
    });
  }, [params, getToken, labels.readingsDate]);

  const exportCsv = useCallback(async () => {
    downloadCsv(`redixfi-signals-${new Date().toISOString().slice(0, 10)}.csv`, await fetchExportRows(), [DISCLAIMER]);
  }, [fetchExportRows]);

  const exportXlsx = useCallback(async () => {
    downloadXlsx(`redixfi-signals-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: "Screener", rows: await fetchExportRows(), notes: [DISCLAIMER] },
    ]);
  }, [fetchExportRows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilters: { key: string; text: string; clear: () => void }[] = [];
  if (q) activeFilters.push({ key: "q", text: `Search: ${q}`, clear: () => setQ("") });
  if (sector) activeFilters.push({ key: "sector", text: `Sector: ${sector}`, clear: () => setSector("") });
  if (industry) activeFilters.push({ key: "industry", text: `Industry: ${industry}`, clear: () => setIndustry("") });
  if (from52Max !== undefined) activeFilters.push({ key: "f52", text: `From 52-week high ≤ ${from52Max}%`, clear: () => { setFrom52Preset(""); setFrom52Custom(""); } });
  if (asNumber(from52Min) !== undefined) activeFilters.push({ key: "f52min", text: `From 52-week high ≥ ${from52Min}%`, clear: () => setFrom52Min("") });
  if (volatilityBand) {
    const text = volatilityBand === "custom"
      ? `Volatility ${volMin || 0}-${volMax || 100}%`
      : VOLATILITY_OPTIONS.find((o) => o.value === volatilityBand)?.label ?? volatilityBand;
    activeFilters.push({ key: "vol", text: `Volatility: ${text}`, clear: () => { setVolatilityBand(""); setVolMin(""); setVolMax(""); } });
  }
  if (volumeMin) activeFilters.push({ key: "volmin", text: `Volume vs usual ≥ ${volumeMin}× (5-session avg)`, clear: () => setVolumeMin("") });
  if (deliveryState) activeFilters.push({ key: "delivery", text: `Delivery: ${deliveryState.replace("_", " ")}`, clear: () => setDeliveryState("") });
  if (dmaState) activeFilters.push({ key: "dma", text: `DMA: ${dmaState.replace("_", " ")}`, clear: () => setDmaState("") });
  if (pcrBand) activeFilters.push({ key: "pcr", text: `PCR: ${pcrBand}`, clear: () => setPcrBand("") });
  if (anomalyOnly) activeFilters.push({ key: "anomaly", text: "Unusual activity", clear: () => setAnomalyOnly(false) });
  if (eventRiskOnly) activeFilters.push({ key: "event", text: "News in the last 5 days", clear: () => setEventRiskOnly(false) });
  if (watchlistOnly) activeFilters.push({ key: "watch", text: "Watchlist only", clear: () => setWatchlistOnly(false) });

  return (
    <div ref={containerRef}>
      <div className="mb-3 rounded-xl border border-border bg-surface-raised p-3">
        {explorerControlsEnabled && (
          <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <label className={`${label} col-span-2 sm:col-span-1`}>
              Search
              <span className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company or symbol" className={`${control} pl-6`} />
              </span>
            </label>
            <label className={label}>
              Sector
              <select value={sector} onChange={(e) => setSector(e.target.value)} className={control}>
                <option value="">All sectors</option>
                {SIGNAL_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className={label}>
              From 52-week high
              <select value={from52Preset} onChange={(e) => setFrom52Preset(e.target.value)} className={control}>
                {FROM52_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            {from52Preset === "custom" && (
              <label className={label}>
                Max % below
                <input value={from52Custom} onChange={(e) => setFrom52Custom(e.target.value)} type="number" min={0} max={100} placeholder="e.g. 3" className={control} />
              </label>
            )}
            <label className={label}>
              Volatility
              <select value={volatilityBand} onChange={(e) => setVolatilityBand(e.target.value)} className={control}>
                {VOLATILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            {volatilityBand === "custom" && (
              <>
                <label className={label}>
                  Min more-volatile %
                  <input value={volMin} onChange={(e) => setVolMin(e.target.value)} type="number" min={0} max={100} placeholder="e.g. 25" className={control} />
                </label>
                <label className={label}>
                  Max more-volatile %
                  <input value={volMax} onChange={(e) => setVolMax(e.target.value)} type="number" min={0} max={100} placeholder="e.g. 50" className={control} />
                </label>
              </>
            )}
          </div>
        )}

        {explorerControlsEnabled && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 text-xs text-foreground-muted"
            >
              <Filter size={12} /> More filters <ChevronDown size={12} className={moreOpen ? "rotate-180" : ""} />
            </button>
            {moreOpen && (
              <div className="mt-2 grid grid-cols-2 items-end gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <label className={label}>
                  Volume vs usual ≥ (5-session avg)
                  <input value={volumeMin} onChange={(e) => setVolumeMin(e.target.value)} type="number" min={0} step="0.1" placeholder="e.g. 1.0" className={control} />
                </label>
                <label className={label}>
                  Delivery
                  <select value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} className={control}>
                    <option value="">Any</option>
                    <option value="above_avg">Above 20d avg</option>
                    <option value="below_avg">Below 20d avg</option>
                  </select>
                </label>
                <label className={label}>
                  DMA position
                  <select value={dmaState} onChange={(e) => setDmaState(e.target.value)} className={control}>
                    <option value="">Any</option>
                    <option value="above_20dma">Above 20DMA</option>
                    <option value="below_20dma">Below 20DMA</option>
                  </select>
                </label>
                <label className={label}>
                  PCR band
                  <select value={pcrBand} onChange={(e) => setPcrBand(e.target.value)} className={control}>
                    <option value="">Any</option>
                    <option value="low">Low</option>
                    <option value="neutral">Neutral</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
                  <input type="checkbox" checked={eventRiskOnly} onChange={(e) => setEventRiskOnly(e.target.checked)} /> News in the last 5 days
                </label>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
                  <input type="checkbox" checked={anomalyOnly} onChange={(e) => setAnomalyOnly(e.target.checked)} /> Unusual activity
                </label>
                {user && (
                  <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
                    <input type="checkbox" checked={watchlistOnly} onChange={(e) => setWatchlistOnly(e.target.checked)} /> Watchlist only
                  </label>
                )}
                {from52Preset === "custom" && (
                  <label className={label}>
                    Min % below
                    <input value={from52Min} onChange={(e) => setFrom52Min(e.target.value)} type="number" min={0} max={100} placeholder="optional" className={control} />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <span key={f.key} className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                {f.text}
                <button type="button" onClick={f.clear} aria-label={`Clear ${f.text}`}><X size={11} /></button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className="text-[11px] text-foreground-faint underline-offset-2 hover:text-foreground hover:underline">Clear all</button>
          </div>
        )}

        <p className="mt-3 text-[11px] text-foreground-faint">{DISCLAIMER}</p>
        {notMatchedCount !== null && notMatchedCount > 0 && (
          <p className="mt-1 text-[11px] text-foreground-faint">
            {notMatchedCount.toLocaleString("en-IN")} {notMatchedCount === 1 ? "stock is" : "stocks are"} not matched:{" "}
            {recentlyListedCount?.toLocaleString("en-IN") ?? "0"} recently listed,{" "}
            {incompleteHistoryCount?.toLocaleString("en-IN") ?? "0"} with incomplete price history.
          </p>
        )}
        {excludedInMasterCount !== null && excludedInMasterCount > 0 && (
          <p className="mt-1 text-[11px] text-foreground-faint">
            {excludedInMasterCount.toLocaleString("en-IN")} held, BE/BZ, review-flagged or limited-data {excludedInMasterCount === 1 ? "stock is" : "stocks are"} excluded from this filter.
          </p>
        )}
        {extrasAsOf && (
          <p className="mt-1 text-[11px] text-foreground-faint">
            52-week high history and volatility: as of {formatObservationDate(extrasAsOf)} close; the 52-week distance uses the current price while open.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {explorerControlsEnabled && (
            <>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-auto rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
              </select>
              <button onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))} className="flex h-9 w-auto items-center gap-1 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted" title="Toggle sort order">
                <ArrowUpDown size={11} /> {order === "asc" ? "Ascending" : "Descending"}
              </button>
            </>
          )}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setColumnPickerOpen((o) => !o)} className="flex h-9 w-auto items-center gap-1 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
              <SlidersHorizontal size={11} /> Columns
            </button>
            {columnPickerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-surface-raised p-2 text-sm shadow-lg">
                {(Object.keys(columns) as (keyof VisibleColumns)[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 py-1 capitalize">
                    <input type="checkbox" checked={columns[k]} onChange={(e) => setColumns((c) => ({ ...c, [k]: e.target.checked }))} />
                    {k === "eventRisk" ? "News (5 days)" : k === "from52" ? "From 52-week high" : k === "volatility" ? "Volatility" : k}
                  </label>
                ))}
              </div>
            )}
          </div>
          <ExportButton
            onExport={exportCsv}
            onCsv={exportCsv}
            onXlsx={exportXlsx}
            canExport={!!canExport}
            label="Download"
            enabledTitle="Export current filter as CSV"
            className="flex h-9 w-auto items-center gap-1 rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted disabled:opacity-40"
          />
          {explorerControlsEnabled && <ShareScreenButton params={shareParams} />}
        </div>
      </div>

      <div className="mb-2 space-y-0.5 text-[11px] leading-snug text-foreground-faint">
        <p>
          <span className="font-medium text-foreground-muted">Price:</span>{" "}
          {labels.priceIsLive ? "today, as of the latest 15-minute bar (delayed)." : labels.priceHeading.replace(/^As of /, "").replace(/ close$/, " close.")}
        </p>
        <p>
          <span className="font-medium text-foreground-muted">Volume vs usual:</span>{" "}
          last five full sessions against the prior 20 full sessions, as of {formatObservationDate(labels.readingsDate) ?? "the readings date"} close (not today's partial volume).
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="border-b border-border px-3 py-2.5 md:hidden" data-testid="signal-group-labels">
          <p className="text-[11px] leading-snug text-foreground-faint">
            <span className="font-medium text-foreground-muted">{labels.priceHeading}:</span> Price
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-foreground-faint">
            <span className="font-medium text-foreground-muted">{labels.readingsHeading}:</span>{" "}
            Delivery, Volume, {labels.priceIsLive ? "From 52-week high (current price)" : "From 52-week high"}, Volatility, State chips
          </p>
        </div>
        <ul className="divide-y divide-border md:hidden">
          {rows.map((row) => <SignalMobileRow key={row.symbol} row={row} priceGroupAsOf={labels.priceAsOf} priceGroupDate={labels.priceDate} />)}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <p className="mb-2 hidden text-[11px] text-foreground-faint md:block lg:hidden">Scroll the table sideways to see all columns.</p>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[12px] uppercase tracking-wider text-foreground-faint">
                <th rowSpan={2} className="px-4 py-2">Symbol</th>
                {columns.sector && <th rowSpan={2} className="hidden px-3 py-2 md:table-cell">Sector</th>}
                <th colSpan={1} className="border-l border-border px-3 py-2 text-[11px] normal-case tracking-normal text-foreground-muted">
                  {labels.priceHeading}
                </th>
                <th colSpan={0 + (columns.delivery ? 1 : 0) + (columns.volume ? 1 : 0) + (columns.from52 || from52Max !== undefined ? 1 : 0) + (columns.volatility ? 1 : 0) + (columns.chips ? 1 : 0) + (columns.eventRisk ? 1 : 0)} className="border-l border-border px-3 py-2 text-[11px] normal-case tracking-normal text-foreground-muted">
                  {labels.readingsHeading}
                </th>
                <th rowSpan={2} className="px-3 py-2" />
              </tr>
              <tr className="border-b border-border text-left font-mono text-[12px] uppercase tracking-wider text-foreground-faint">
                <th className="border-l border-border px-3 py-2">Price</th>
                {columns.delivery && <th className="hidden px-3 py-2 sm:table-cell">Delivery</th>}
                {columns.volume && <th className="hidden px-3 py-2 sm:table-cell" title="Last five full sessions vs prior 20 full sessions">Volume vs usual</th>}
                {(columns.from52 || from52Max !== undefined) && (
                  <th className="hidden px-3 py-2 sm:table-cell" aria-sort={sort === "pct_below_52w_high" ? (order === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("pct_below_52w_high")} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground" title="Sort by distance from 52-week high">
                      {labels.priceIsLive ? "From 52-week high (current price)" : "From 52-week high"}
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                )}
                {columns.volatility && <th className="hidden px-3 py-2 md:table-cell">Volatility</th>}
                {columns.chips && <th className="hidden px-3 py-2 lg:table-cell">State</th>}
                {columns.eventRisk && <th className="hidden px-3 py-2 sm:table-cell">News (5 days)</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SignalTableRow
                  key={row.symbol}
                  row={row}
                  columns={{ ...columns, from52: columns.from52 || from52Max !== undefined }}
                  priceGroupAsOf={labels.priceAsOf}
                  priceGroupDate={labels.priceDate}
                  readingsGroupDate={labels.readingsDate}
                />
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-center text-sm text-foreground-muted">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-4 text-center text-sm text-foreground-muted">No stocks match these filters.</div>}
        {error && <div className="p-4 text-center text-sm text-down">{error}</div>}

      </div>

      {!watchlistOnly && (
        <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono">
            {total.toLocaleString("en-IN")} {total === 1 ? "stock" : "stocks"} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-2 py-1 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
});
