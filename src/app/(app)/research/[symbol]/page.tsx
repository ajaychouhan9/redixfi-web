import { ResearchDetail } from "@/components/app/research/ResearchDetail";

export default async function ResearchDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <ResearchDetail symbol={symbol.toUpperCase()} />
    </div>
  );
}
