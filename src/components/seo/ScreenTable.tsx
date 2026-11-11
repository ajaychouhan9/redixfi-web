import Link from "next/link";
import type { SignalRow } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";
import { growthText, inr, pct, quarterDate } from "@/lib/seo/stock-facts";

const na = "n/a";

/**
 * Rows of a reported-figure screen. Every figure carries the quarter it belongs to (one "Quarter ended" column); a missing figure
 * reads n/a. Growth above 1,000% reads "1000%+" and a sales fall of more than 100% reads n/a (a data problem).
 */
export function ScreenTable({ rows }: { rows: SignalRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm" data-testid="screen-table">
        <caption className="sr-only">Stocks meeting the conditions, with their reported figures</caption>
        <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2 text-right">Price ₹</th>
            <th className="px-3 py-2 text-right">P/E</th>
            <th className="px-3 py-2 text-right">ROE</th>
            <th className="px-3 py-2 text-right">EPS ₹</th>
            <th className="px-3 py-2 text-right">Profit growth</th>
            <th className="px-3 py-2 text-right">Sales growth</th>
            <th className="px-3 py-2 text-right">200-day EMA ₹</th>
            <th className="px-3 py-2 text-right">Quarter ended</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="border-t border-border tabular-nums">
              <td className="px-3 py-1.5 font-medium">
                <Link href={stockPath("/stocks", r.symbol)} className="text-accent hover:underline" title={r.company_name}>
                  {r.symbol}
                </Link>
              </td>
              <td className="px-3 py-1.5 text-right">{r.last_price == null ? na : inr(r.last_price)}</td>
              <td className="px-3 py-1.5 text-right">{r.pe == null ? na : inr(r.pe)}</td>
              <td className="px-3 py-1.5 text-right">{r.roe == null ? na : pct(r.roe)}</td>
              <td className="px-3 py-1.5 text-right">{r.eps == null ? na : inr(r.eps)}</td>
              <td className="px-3 py-1.5 text-right">{growthText(r.profit_growth_pct, "profit")}</td>
              <td className="px-3 py-1.5 text-right">{growthText(r.sales_growth_pct, "sales")}</td>
              <td className="px-3 py-1.5 text-right" title={r.ema200_as_of ? `as of ${quarterDate(r.ema200_as_of)} close` : undefined}>
                {r.ema200 == null ? na : inr(r.ema200)}
              </td>
              <td className="px-3 py-1.5 text-right">{quarterDate(r.fund_quarter_end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
