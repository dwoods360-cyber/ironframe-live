"use server";

import { getGitRevisionForDiagnostics } from "@/app/lib/diagnostics/gitRevision";

export async function getDiagnosticsGitRevisionAction(): Promise<{ revision: string | null }> {
  return { revision: getGitRevisionForDiagnostics() };
}
