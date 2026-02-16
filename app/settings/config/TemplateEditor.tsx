"use client";

import { useEffect, useState } from "react";
import {
  setGeneralRfiChecklist,
  setVendorTypeRequirements,
  useSystemConfigStore,
  VendorTypeRequirements,
} from "@/app/store/systemConfigStore";
import { VendorType } from "@/app/vendors/schema";

type TemplateEditorProps = {
  onStatus: (message: string) => void;
};

const VENDOR_TYPES: VendorType[] = ["SaaS", "On-Prem Software", "Managed Services", "Hardware"];

function asCommaSeparated(value: string[]) {
  return value.join(", ");
}

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function TemplateEditor({ onStatus }: TemplateEditorProps) {
  const config = useSystemConfigStore();
  const [rfiItems, setRfiItems] = useState<string[]>([]);
  const [newRfiItem, setNewRfiItem] = useState("");
  const [requirementsInput, setRequirementsInput] = useState<Record<VendorType, string>>({
    SaaS: "",
    "On-Prem Software": "",
    "Managed Services": "",
    Hardware: "",
  });

  useEffect(() => {
    queueMicrotask(() => {
      setRfiItems(config.generalRfiChecklist);
      setRequirementsInput({
        SaaS: asCommaSeparated(config.vendorTypeRequirements.SaaS),
        "On-Prem Software": asCommaSeparated(config.vendorTypeRequirements["On-Prem Software"]),
        "Managed Services": asCommaSeparated(config.vendorTypeRequirements["Managed Services"]),
        Hardware: asCommaSeparated(config.vendorTypeRequirements.Hardware),
      });
    });
  }, [config.generalRfiChecklist, config.vendorTypeRequirements]);

  const handleSave = () => {
    const nextRequirements: VendorTypeRequirements = {
      SaaS: toList(requirementsInput.SaaS),
      "On-Prem Software": toList(requirementsInput["On-Prem Software"]),
      "Managed Services": toList(requirementsInput["Managed Services"]),
      Hardware: toList(requirementsInput.Hardware),
    };

    setGeneralRfiChecklist(rfiItems);
    setVendorTypeRequirements(nextRequirements);
    onStatus("GRC template editor saved. Autonomous monitoring and RFI templates now use updated requirements.");
  };

  return (
    <div className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">Section E // GRC Template Editor</p>

      <div className="rounded border border-slate-800 bg-slate-950/50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">General RFI Checklist</p>
        <div className="flex flex-wrap gap-2">
          {rfiItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
            >
              {item}
              <button
                type="button"
                onClick={() => setRfiItems((current) => current.filter((entry) => entry !== item))}
                className="text-slate-400 hover:text-white"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newRfiItem}
            onChange={(event) => setNewRfiItem(event.target.value)}
            className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-100 outline-none focus:border-blue-500"
            placeholder="Add new checklist item"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = newRfiItem.trim();
              if (!trimmed || rfiItems.includes(trimmed)) {
                return;
              }
              setRfiItems((current) => [...current, trimmed]);
              setNewRfiItem("");
            }}
            className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-200"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-3 rounded border border-slate-800 bg-slate-950/50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Vendor Type Evidence Requirements</p>
        <div className="space-y-3">
          {VENDOR_TYPES.map((vendorType) => (
            <div key={vendorType}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-200">{vendorType}</label>
              <input
                value={requirementsInput[vendorType]}
                onChange={(event) =>
                  setRequirementsInput((current) => ({
                    ...current,
                    [vendorType]: event.target.value,
                  }))
                }
                className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                placeholder="Comma-separated document names"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-3 rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-200"
      >
        Save Templates
      </button>
    </div>
  );
}
