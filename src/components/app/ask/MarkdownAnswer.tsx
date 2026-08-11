import { Fragment } from "react";

/**
 * Ask-panel-upgrade session, Phase 2 — the backend's ASK_SYSTEM_TEMPLATE/
 * GENERAL_SYSTEM_TEMPLATE now format answers with a small markdown subset
 * (rule 7, core/ask.py): **bold**, "- "/"* " bullet lists, and "## "
 * headers only, never anything richer (no tables, links, code blocks —
 * the compliance-checked answer is plain analyst prose, not a document).
 * A small hand-rolled renderer for exactly that subset, rather than a new
 * npm dependency for three markdown constructs — no react-markdown/remark
 * dependency exists in this repo yet (checked package.json first).
 */
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

export function MarkdownAnswer({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: { type: "header" | "bullets" | "para"; content: string | string[] }[] = [];
  let bulletBuf: string[] = [];

  function flushBullets() {
    if (bulletBuf.length > 0) {
      blocks.push({ type: "bullets", content: bulletBuf });
      bulletBuf = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    const headerMatch = /^#{1,3}\s+(.*)$/.exec(line);
    if (headerMatch) {
      flushBullets();
      blocks.push({ type: "header", content: headerMatch[1] });
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      bulletBuf.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    blocks.push({ type: "para", content: line });
  }
  flushBullets();

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => {
        if (b.type === "header") {
          return (
            <div key={i} className="pt-0.5 text-[12.5px] font-semibold text-foreground">
              {renderInline(b.content as string, `h${i}`)}
            </div>
          );
        }
        if (b.type === "bullets") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {(b.content as string[]).map((item, j) => (
                <li key={j}>{renderInline(item, `b${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(b.content as string, `p${i}`)}</p>;
      })}
    </div>
  );
}
