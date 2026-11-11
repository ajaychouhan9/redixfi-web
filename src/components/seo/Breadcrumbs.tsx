import Link from "next/link";

const SITE_URL = "https://www.redixfi.com";

export interface Crumb {
  name: string;
  href: string;
}

/** Visible breadcrumb trail plus the matching BreadcrumbList structured data. The last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.href === "/" ? "" : c.href}` })),
  };
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-foreground-muted">
        <ol className="flex flex-wrap gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i === crumbs.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.href} className="hover:text-foreground">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
