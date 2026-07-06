import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { requireSessionForDocumentationApi } from "@/app/lib/auth/requireSessionApi";

/** FS-backed docs ingress — must stay literal for Next.js static analysis (see docsRouteRuntime.ts). */
export const dynamic = "force-dynamic";

const DOCS_ROOT = path.join(process.cwd(), "docs");
const ALLOWED_PREFIXES = ["product/", "support/", "technical/", "training/"];

function resolveHubHtmlAsset(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.endsWith(".html")) return null;
  if (!ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
  if (normalized.includes("..")) return null;

  const candidate = path.resolve(DOCS_ROOT, normalized);
  const normalizedRoot = path.resolve(DOCS_ROOT);
  if (candidate !== normalizedRoot && !candidate.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return null;
  return candidate;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const denied = await requireSessionForDocumentationApi();
  if (denied) return denied;

  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new NextResponse("Hub asset path required.", { status: 400 });
  }

  const relativePath = segments.join("/");
  const filePath = resolveHubHtmlAsset(relativePath);
  if (!filePath) {
    return new NextResponse("Documentation hub HTML asset not found.", { status: 404 });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Ironframe-Hub-Asset": relativePath,
    },
  });
}
