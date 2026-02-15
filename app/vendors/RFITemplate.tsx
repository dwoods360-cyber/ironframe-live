"use client";

import { useEffect, useMemo, useState } from "react";

type RFITemplateProps = {
  isOpen: boolean;
  vendorName: string;
  vendorEmail: string;
  internalStakeholderEmail: string;
  checklistItems: string[];
  onClose: () => void;
  onGenerate: (payload: { selectedItems: string[] }) => void;
};

export default function RFITemplate({
  isOpen,
  vendorName,
  vendorEmail,
  internalStakeholderEmail,
  checklistItems,
  onClose,
  onGenerate,
}: RFITemplateProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (checklistItems.length === 0) {
      setSelected({});
      return;
    }

    setSelected(
      checklistItems.reduce<Record<string, boolean>>((acc, item, index) => {
        acc[item] = index === 0;
        return acc;
      }, {}),
    );
  }, [checklistItems]);

  const selectedItems = useMemo(
    () => checklistItems.filter((item) => Boolean(selected[item])),
    [checklistItems, selected],
  );

  if (!isOpen) {
    return null;
  }

  const handleGenerate = () => {
    const subject = `General RFI Request // ${vendorName}`;
    const body = [
      `Vendor Name: ${vendorName}`,
      "Request Type: General RFI",
      `Requested Items: ${selectedItems.join(", ") || "No items selected"}`,
      "Please provide the requested items in your next response window.",
    ].join("\n");

    const mailto = `mailto:${encodeURIComponent(vendorEmail)}?cc=${encodeURIComponent(internalStakeholderEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    onGenerate({ selectedItems });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70">
      <div className="w-full max-w-md rounded border border-slate-800 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-white">General RFI</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="space-y-2">
          {checklistItems.map((item) => (
            <label key={item} className="flex items-center gap-2 text-[10px] text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(selected[item])}
                onChange={(event) => setSelected((current) => ({ ...current, [item]: event.target.checked }))}
              />
              {item}
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 inline-flex h-8 items-center rounded border border-blue-500/70 bg-blue-500/20 px-3 text-[10px] font-bold uppercase tracking-wide text-blue-200"
        >
          Generate RFI Draft
        </button>
      </div>
    </div>
  );
}
