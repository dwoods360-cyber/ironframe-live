/**
 * GRC docs ingress runtime — filesystem-backed documentation routes must not use
 * `force-static` on Windows dev. Static-paths workers load route modules through
 * webpack-runtime, which requires `./vendor-chunks/next.js`. Custom server
 * chunkFilename overrides (see next.config.ts) break that path and cause recurring
 * MODULE_NOT_FOUND 500s on `/docs/*` and `/api/docs/hub-asset/*`.
 *
 * Policy: all FS-backed docs brokers and markdown pages export this constant.
 */
export const DOCS_FS_ROUTE_DYNAMIC = "force-dynamic" as const;
