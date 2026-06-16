import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";

type Props = {
  brand: TenantBrand | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showCoreLabel?: boolean;
};

const SIZE_CLASS = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

export default function TenantCoBrandBadge({
  brand,
  size = "md",
  className = "",
  showCoreLabel = true,
}: Props) {
  const sizeClass = SIZE_CLASS[size];

  if (!brand) {
    return (
      <span className={`font-mono font-black tracking-widest text-white ${sizeClass} ${className}`}>
        {showCoreLabel ? "Ironframe" : "Ironframe GRC"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 font-mono ${sizeClass} ${className}`}
      data-tenant-co-brand={brand.slug}
      aria-label={`Ironframe workspace for ${brand.displayName}`}
    >
      {showCoreLabel ? (
        <>
          <span className="font-black tracking-widest text-slate-400">Ironframe</span>
          <span className="text-slate-600" aria-hidden>
            //
          </span>
        </>
      ) : null}
      <span className={`font-bold tracking-wider ${brand.accentClass}`}>{brand.shortLabel}</span>
    </span>
  );
}
