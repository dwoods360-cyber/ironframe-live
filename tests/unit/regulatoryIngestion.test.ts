import { describe, expect, it } from "vitest";
import { buildNistTasMappingRows } from "@/app/services/regulatoryIngestion";

describe("regulatoryIngestion", () => {
  it("maps NIST 3.2 to ironlock/ironsight directives when TAS contains anchors", () => {
    const tasMd = `
<a id="agent-6"></a>Ironlock
<a id="agent-8"></a>Ironsight
<a id="tas-rls-isolation"></a>RLS
`;
    const rows = buildNistTasMappingRows(tasMd);
    const iscm = rows.find((r) => r.nistSectionId === "3.2");
    expect(iscm).toBeDefined();
    expect(iscm?.gap).toBe(false);
    expect(iscm?.tasDirectives.some((d) => d.id === "ironlock")).toBe(true);
  });

  it("flags gap when TAS lacks NIST reporting anchor", () => {
    const rows = buildNistTasMappingRows("minimal tas without agent anchors");
    const reporting = rows.find((r) => r.nistSectionId === "3.3");
    expect(reporting?.gap).toBe(true);
  });
});
