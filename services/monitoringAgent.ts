export type MonitoringDocumentType = string;

export type MonitoringAlert = {
  id: string;
  vendorName: string;
  documentType: MonitoringDocumentType;
  source: string;
  discoveredAt: string;
  suggestedFileName: string;
};

type MonitoringStartInput = {
  vendorNames: string[];
  monitoredDocumentTypes?: string[];
  onAlert: (alert: MonitoringAlert) => void;
};

const DOCUMENT_TYPES: MonitoringDocumentType[] = ["SOC2", "ISO 27001", "Insurance"];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function startMonitoringAgent(input: MonitoringStartInput) {
  const interval = setInterval(() => {
    if (input.vendorNames.length === 0) {
      return;
    }

    if (Math.random() > 0.2) {
      return;
    }

    const vendorName = input.vendorNames[Math.floor(Math.random() * input.vendorNames.length)];
    const configuredDocumentTypes = (input.monitoredDocumentTypes ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const sourceTypes = configuredDocumentTypes.length > 0 ? configuredDocumentTypes : DOCUMENT_TYPES;
    const documentType = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];
    const dateToken = new Date().toISOString().slice(0, 10);
    const suggestedFileName = `${slugify(vendorName)}_${slugify(documentType)}_${dateToken}.pdf`;

    input.onAlert({
      id: `monitor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vendorName,
      documentType,
      source: "Industry Intelligence Feed",
      discoveredAt: new Date().toISOString(),
      suggestedFileName,
    });
  }, 12000);

  return () => clearInterval(interval);
}
