"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Industry, RiskTier, VendorType } from "@/app/vendors/schema";
import { ClassifiedDocumentType, analyzeVendorDocument } from "@/services/idpService";
import { VendorTypeRequirements } from "@/app/store/systemConfigStore";

export type AddVendorSubmission = {
  vendorName: string;
  vendorType: VendorType;
  industry: Industry;
  riskTier: RiskTier;
  documentType: ClassifiedDocumentType;
  expirationDate: string;
  fileName: string | null;
};

type AddVendorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddVendorSubmission) => void;
  vendorTypeRequirements: VendorTypeRequirements;
};

export default function AddVendorModal({ isOpen, onClose, onSubmit, vendorTypeRequirements }: AddVendorModalProps) {
  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState<VendorType>("SaaS");
  const [industry, setIndustry] = useState<Industry>("Healthcare");
  const [riskTier, setRiskTier] = useState<RiskTier>("HIGH");
  const [documentType, setDocumentType] = useState<ClassifiedDocumentType>("UNKNOWN");
  const [expirationDate, setExpirationDate] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [ghostFields, setGhostFields] = useState<{ name: boolean; documentType: boolean; expirationDate: boolean }>({
    name: false,
    documentType: false,
    expirationDate: false,
  });
  const [fieldConfidence, setFieldConfidence] = useState<{ name?: number; documentType?: number; expirationDate?: number }>({});

  const canSubmit = useMemo(() => vendorName.trim().length > 0, [vendorName]);
  const requiredEvidence = vendorTypeRequirements[vendorType] ?? ["SOC2"];

  if (!isOpen) {
    return null;
  }

  const applyAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setUploadFileName(file.name);

    try {
      const result = await analyzeVendorDocument(file);

      if (result.vendorName) {
        setVendorName(result.vendorName);
        setGhostFields((current) => ({ ...current, name: true }));
        setFieldConfidence((current) => ({ ...current, name: result.fieldConfidence.vendorName }));
      }

      if (result.documentType) {
        setDocumentType(result.documentType);
        setGhostFields((current) => ({ ...current, documentType: true }));
        setFieldConfidence((current) => ({ ...current, documentType: result.fieldConfidence.documentType }));
      }

      if (result.expirationDate) {
        setExpirationDate(result.expirationDate);
        setGhostFields((current) => ({ ...current, expirationDate: true }));
        setFieldConfidence((current) => ({ ...current, expirationDate: result.fieldConfidence.expirationDate }));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await applyAnalysis(file);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await applyAnalysis(file);
  };

  const handleSubmit = () => {
    onSubmit({
      vendorName: vendorName.trim(),
      vendorType,
      industry,
      riskTier,
      documentType,
      expirationDate,
      fileName: uploadFileName,
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/70">
      <div className="h-full w-full max-w-md border-l border-slate-800 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">Manual Vendor Ingestion</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-3"
          >
            <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              <UploadCloud className="h-4 w-4 text-blue-300" />
              Drag & Drop SOC2 / ISO / Insurance PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
            {isAnalyzing ? (
              <p className="mt-2 flex items-center gap-1 text-[9px] text-blue-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                IDP analyzing document...
              </p>
            ) : uploadFileName ? (
              <p className="mt-2 text-[9px] text-slate-400">Analyzed: {uploadFileName}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Vendor Type</label>
            <select
              data-testid="add-vendor-type"
              value={vendorType}
              onChange={(event) => setVendorType(event.target.value as VendorType)}
              className="h-8 w-full max-w-[180px] rounded border border-slate-800 bg-slate-950 px-3 pr-7 text-[10px] text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="SaaS">SaaS</option>
              <option value="On-Prem Software">On-Prem Software</option>
              <option value="Managed Services">Managed Services</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-300">Required Evidence</p>
            <ul className="space-y-1">
              {requiredEvidence.map((doc) => (
                <li key={doc} className="text-[9px] text-slate-400">• {doc}</li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Name</label>
            <input
              data-testid="add-vendor-name"
              value={vendorName}
              onChange={(event) => {
                setVendorName(event.target.value);
                setGhostFields((current) => ({ ...current, name: false }));
              }}
              placeholder="Vendor Name"
              className={`h-8 w-full rounded border border-slate-800 px-3 text-[10px] text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none ${
                ghostFields.name ? "bg-blue-500/10" : "bg-slate-950"
              }`}
            />
            {ghostFields.name && fieldConfidence.name !== undefined ? (
              <p className="mt-1 text-[9px] text-blue-200">{Math.round(fieldConfidence.name * 100)}% Confident</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Industry</label>
            <select
              data-testid="add-vendor-industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value as Industry)}
              className="h-8 w-full max-w-[180px] rounded border border-slate-800 bg-slate-950 px-3 pr-7 text-[10px] text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Initial Risk Tier</label>
            <select
              data-testid="add-vendor-risk"
              value={riskTier}
              onChange={(event) => setRiskTier(event.target.value as RiskTier)}
              className="h-8 w-full max-w-[180px] rounded border border-slate-800 bg-slate-950 px-3 pr-7 text-[10px] text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Document Type</label>
            <input
              data-testid="add-vendor-doc-type"
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value as ClassifiedDocumentType);
                setGhostFields((current) => ({ ...current, documentType: false }));
              }}
              className={`h-8 w-full rounded border border-slate-800 px-3 text-[10px] uppercase text-white focus:border-blue-500 focus:outline-none ${
                ghostFields.documentType ? "bg-blue-500/10" : "bg-slate-950"
              }`}
            />
            {ghostFields.documentType && fieldConfidence.documentType !== undefined ? (
              <p className="mt-1 text-[9px] text-blue-200">{Math.round(fieldConfidence.documentType * 100)}% Confident</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-300">Expiration</label>
            <input
              data-testid="add-vendor-expiration"
              value={expirationDate}
              onChange={(event) => {
                setExpirationDate(event.target.value);
                setGhostFields((current) => ({ ...current, expirationDate: false }));
              }}
              placeholder="YYYY-MM-DD"
              className={`h-8 w-full rounded border border-slate-800 px-3 text-[10px] text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none ${
                ghostFields.expirationDate ? "bg-blue-500/10" : "bg-slate-950"
              }`}
            />
            {ghostFields.expirationDate && fieldConfidence.expirationDate !== undefined ? (
              <p className="mt-1 text-[9px] text-blue-200">{Math.round(fieldConfidence.expirationDate * 100)}% Confident</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-8 items-center rounded border border-blue-500/70 bg-blue-500/20 px-3 text-[10px] font-bold uppercase tracking-wide text-blue-200 disabled:opacity-50"
          >
            Save Vendor
          </button>
        </div>
      </div>
    </div>
  );
}
