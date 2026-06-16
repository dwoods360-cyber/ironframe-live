import {
  getFrameworkControlMappings,
  type IrontallyFrameworkId,
  type TasFrameworkControlMapping,
} from "@/app/config/irontallyFrameworkControls";

export type FrameworkCrosswalkEdge = {
  sourceFramework: IrontallyFrameworkId;
  sourceControlId: string;
  targetFramework: IrontallyFrameworkId;
  targetControlId: string;
  targetControlTitle: string;
  satisfaction: string;
  directiveId: string;
};

/** Static TAS-directive anchor edges for multi-framework crosswalk (RAG-ready citations). */
const CROSSWALK_ANCHORS: Array<{
  directiveId: string;
  edges: Array<{ source: IrontallyFrameworkId; controlId: string; target: IrontallyFrameworkId }>;
}> = [
  {
    directiveId: "irongate",
    edges: [
      { source: "soc2_type2", controlId: "CC6.1", target: "eu_ai_act" },
      { source: "nist_csf", controlId: "PR.DS-01", target: "eu_ai_act" },
      { source: "iso_27001", controlId: "A.8.12", target: "nydfs_500" },
    ],
  },
  {
    directiveId: "ironlock",
    edges: [
      { source: "soc2_type2", controlId: "CC7.2", target: "eu_ai_act" },
      { source: "nist_csf", controlId: "DE.CM-01", target: "dora" },
      { source: "iso_27001", controlId: "A.8.16", target: "uk_csr" },
    ],
  },
  {
    directiveId: "ironcast",
    edges: [
      { source: "soc2_type2", controlId: "CC4.1", target: "uk_csr" },
      { source: "nist_csf", controlId: "GV.OC-02", target: "dora" },
    ],
  },
  {
    directiveId: "ironmap",
    edges: [
      { source: "nist_csf", controlId: "GV.OC-02", target: "dora" },
      { source: "soc2_type2", controlId: "CC9.1", target: "uk_csr" },
    ],
  },
  {
    directiveId: "irontech",
    edges: [
      { source: "soc2_type2", controlId: "CC9.1", target: "dora" },
      { source: "nist_csf", controlId: "RC.RP-01", target: "uk_csr" },
    ],
  },
];

function findControlRow(
  framework: IrontallyFrameworkId,
  controlId: string,
): TasFrameworkControlMapping | undefined {
  return getFrameworkControlMappings(framework).find((row) => row.controlId === controlId);
}

export function resolveFrameworkCrosswalk(params: {
  sourceFramework: IrontallyFrameworkId;
  sourceControlId: string;
  targetFramework: IrontallyFrameworkId;
}): FrameworkCrosswalkEdge[] {
  const sourceId = params.sourceControlId.trim();
  const sourceRow = findControlRow(params.sourceFramework, sourceId);
  if (!sourceRow) return [];

  const matches = CROSSWALK_ANCHORS.filter((anchor) => anchor.directiveId === sourceRow.directiveId)
    .flatMap((anchor) => anchor.edges)
    .filter(
      (edge) =>
        edge.source === params.sourceFramework &&
        edge.controlId === sourceId &&
        edge.target === params.targetFramework,
    );

  return matches.map((edge) => {
    const targetMappings = getFrameworkControlMappings(edge.target);
    const targetRow =
      targetMappings.find((row) => row.directiveId === sourceRow.directiveId) ??
      targetMappings[0];
    return {
      sourceFramework: params.sourceFramework,
      sourceControlId: sourceId,
      targetFramework: edge.target,
      targetControlId: targetRow?.controlId ?? edge.controlId,
      targetControlTitle: targetRow?.controlTitle ?? edge.controlId,
      satisfaction: targetRow?.satisfaction ?? sourceRow.satisfaction,
      directiveId: sourceRow.directiveId,
    };
  });
}

export function listCrosswalkTargets(
  sourceFramework: IrontallyFrameworkId,
  sourceControlId: string,
): IrontallyFrameworkId[] {
  const sourceId = sourceControlId.trim();
  const sourceRow = findControlRow(sourceFramework, sourceId);
  if (!sourceRow) return [];

  const targets = new Set<IrontallyFrameworkId>();
  for (const anchor of CROSSWALK_ANCHORS) {
    if (anchor.directiveId !== sourceRow.directiveId) continue;
    for (const edge of anchor.edges) {
      if (edge.source === sourceFramework && edge.controlId === sourceId) {
        targets.add(edge.target);
      }
    }
  }
  return [...targets];
}
