import { Router } from "express";

import { scanPublishedBriefings } from "./briefingScanner.js";
import {
  renderBriefingArticle,
  renderBriefingIndex,
  renderBriefingNotFound,
} from "./renderBlog.js";
import { resolveDocsRoot } from "./resolveDocsRoot.js";

export function createGovernanceFrameRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const briefings = scanPublishedBriefings(resolveDocsRoot());
    res.set("Cache-Control", "no-store");
    res.type("html").send(renderBriefingIndex(briefings));
  });

  router.get("/:slug", (req, res) => {
    const slug = String(req.params.slug ?? "").trim();
    if (!slug || slug.includes("..")) {
      res.status(400).type("html").send(renderBriefingNotFound(slug));
      return;
    }

    const briefings = scanPublishedBriefings(resolveDocsRoot());
    const hit = briefings.find((b) => b.slug === slug);
    if (!hit) {
      res.status(404).type("html").send(renderBriefingNotFound(slug));
      return;
    }

    res.set("Cache-Control", "no-store");
    res.type("html").send(renderBriefingArticle(hit));
  });

  return router;
}
