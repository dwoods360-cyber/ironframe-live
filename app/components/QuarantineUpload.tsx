"use client";

import { useState, useCallback } from "react";
import { uploadToQuarantine } from "@/app/actions/upload-to-dmz";

type QuarantineUploadProps = {
  tenantId: string;
  /** When provided, dropping/selecting a file calls this instead of uploading (e.g. to open UploadArtifactModal with staged file). */
  onFileStaged?: (file: File) => void;
};

export default function QuarantineUpload({ tenantId, onFileStaged }: QuarantineUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (onFileStaged) {
        onFileStaged(file);
        return;
      }

      setIsUploading(true);
      setStatus("Routing to Sandbox...");

      const formData = new FormData();
      formData.append("file", file);

      try {
        await uploadToQuarantine(formData, tenantId);
        setStatus("IN DMZ - AWAITING AGENT 5 SCAN");
      } catch (err) {
        setStatus("SECURITY BLOCK: UPLOAD FAILED");
      } finally {
        setIsUploading(false);
      }
    },
    [tenantId, onFileStaged]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void handleFile(file);
  };

  return (
    <div
      className="mt-6 rounded-lg border-2 border-dashed border-slate-800 bg-slate-900/20 p-8 text-center transition-colors hover:border-blue-500/50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <label htmlFor="file-upload" className="cursor-pointer group">
        <div className="flex flex-col items-center">
          <span className="mb-2 text-2xl">📥</span>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-200 group-hover:text-blue-400">
            {isUploading ? "Uploading to Enclave..." : "Drop Vendor PDF for Ingestion"}
          </p>
          <p className="mt-1 text-[9px] text-slate-500 uppercase">
            Files are automatically isolated in the ironframe-quarantine sandbox
          </p>
          {status && (
            <div className="mt-4 rounded bg-slate-950 px-3 py-1 text-[10px] font-mono text-emerald-500 border border-emerald-500/20">
              [SYSTEM]: {status}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
