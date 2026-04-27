-- GRC 4.9: optional resolution timestamp on deficiency report rows for TTR metrics
ALTER TABLE "SimulationDiagnosticLog" ADD COLUMN "resolvedAt" TIMESTAMP(3);
