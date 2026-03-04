"use client";

/**
 * Ingestion panel wrapper. Renders the ingestion UI so test runs and validation are always available.
 */
export default function IngestionPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-[120px]" data-testid="test-run-ingestion">
      {children}
    </div>
  );
}
