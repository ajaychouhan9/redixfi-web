import { exampleLine } from "@/lib/stock-check";

/** The small line under a filter input: what many people use. An example only, never a recommendation. */
export function Example({ text }: { text: string }) {
  return <span className="text-[12px] font-normal text-foreground-faint" data-testid="filter-example">{exampleLine(text)}</span>;
}
