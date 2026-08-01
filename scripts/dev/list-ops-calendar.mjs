import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const rows = await p.opsActivity.findMany({
    orderBy: [{ dueAt: "asc" }, { priority: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      priority: true,
      outcome: true,
      href: true,
      completedAt: true,
      nextActions: true,
      sourceRef: true,
      ownerLabel: true,
      kind: true,
    },
  });
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("counts", byStatus, "total", rows.length);
  for (const r of rows) {
    const due = r.dueAt?.toISOString()?.slice(0, 10) ?? "none";
    const out = (r.outcome || "").replace(/\s+/g, " ").slice(0, 100);
    console.log(
      [
        r.status.padEnd(12),
        due,
        String(r.priority).padStart(2),
        (r.sourceRef || "-").slice(0, 40).padEnd(40),
        r.id.slice(0, 8),
        r.title,
        out ? `| ${out}` : "",
      ].join(" "),
    );
  }
} finally {
  await p.$disconnect();
}
