export type ClassifiedDocumentType = "SOC2" | "ISO" | "INSURANCE" | "UNKNOWN";

export type IdpAnalysisResult = {
  documentType: ClassifiedDocumentType;
  vendorName: string;
  expirationDate: string | null;
  confidence: number;
  fieldConfidence: {
    vendorName: number;
    documentType: number;
    expirationDate: number;
  };
  provider: "azure-document-intelligence" | "heuristic-fallback";
};

function normalizeDateToken(value: string): string | null {
  const isoMatch = value.match(/(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = value.match(/(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-](20\d{2})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1]}-${slashMatch[2]}`;
  }

  return null;
}

function classifyFromName(fileName: string): ClassifiedDocumentType {
  const lower = fileName.toLowerCase();

  if (lower.includes("soc2") || lower.includes("soc-2")) {
    return "SOC2";
  }

  if (lower.includes("iso") || lower.includes("27001")) {
    return "ISO";
  }

  if (lower.includes("insurance") || lower.includes("certificate-of-insurance") || lower.includes("coi")) {
    return "INSURANCE";
  }

  return "UNKNOWN";
}

function inferVendorName(fileName: string): string {
  const cleaned = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/(soc2|soc-2|iso|27001|insurance|certificate|coi|attestation|report)/gi, "")
    .replace(/[\W_]+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

async function classifyWithAzureBridge(file: File): Promise<IdpAnalysisResult | null> {
  const endpoint = process.env.NEXT_PUBLIC_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch("/api/idp/classify", {
      method: "POST",
      headers: {
        "x-idp-provider": "azure-document-intelligence",
        "x-file-name": file.name,
      },
      body: file,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<IdpAnalysisResult>;

    if (!payload.documentType) {
      return null;
    }

    return {
      documentType: payload.documentType,
      vendorName: payload.vendorName ?? "",
      expirationDate: payload.expirationDate ?? null,
      confidence: payload.confidence ?? 0.85,
      fieldConfidence: {
        vendorName: 0.9,
        documentType: 0.95,
        expirationDate: payload.expirationDate ? 0.9 : 0.4,
      },
      provider: "azure-document-intelligence",
    };
  } catch {
    return null;
  }
}

export async function analyzeVendorDocument(file: File): Promise<IdpAnalysisResult> {
  const azureResult = await classifyWithAzureBridge(file);
  if (azureResult) {
    return azureResult;
  }

  const documentType = classifyFromName(file.name);
  const expirationDate = normalizeDateToken(file.name);
  const vendorName = inferVendorName(file.name);

  return {
    documentType,
    vendorName,
    expirationDate,
    confidence: documentType === "UNKNOWN" ? 0.55 : 0.86,
    fieldConfidence: {
      vendorName: vendorName ? 0.82 : 0.35,
      documentType: documentType === "UNKNOWN" ? 0.58 : 0.92,
      expirationDate: expirationDate ? 0.88 : 0.32,
    },
    provider: "heuristic-fallback",
  };
}
