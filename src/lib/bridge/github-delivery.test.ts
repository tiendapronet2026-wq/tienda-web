import { describe, expect, it } from "vitest";
import {
  formatBridgeReportCommentMarkdown,
  parseAuthorizedPullRequestUrl,
  redactSensitiveText,
} from "@/lib/bridge/github-delivery";

describe("github-delivery", () => {
  it("parseAuthorizedPullRequestUrl solo tienda-web", () => {
    expect(
      parseAuthorizedPullRequestUrl("https://github.com/tiendapronet2026-wq/tienda-web/pull/13")
    ).toEqual({
      owner: "tiendapronet2026-wq",
      repo: "tienda-web",
      pullNumber: 13,
    });
    expect(parseAuthorizedPullRequestUrl("https://github.com/evil/other/pull/1")).toBeNull();
  });

  it("redactSensitiveText oculta tokens", () => {
    const text = "Bearer ghs_abcdefghijklmnopqrstuvwxyz1234567890AB";
    expect(redactSensitiveText(text)).not.toContain("ghs_");
    expect(redactSensitiveText(text)).toContain("[REDACTED]");
  });

  it("formatBridgeReportCommentMarkdown incluye secciones", () => {
    const md = formatBridgeReportCommentMarkdown({
      taskId: "00000000-0000-4000-8000-000000000001",
      taskTitle: "Demo",
      taskStatus: "completed",
      report: {
        summary: "Listo",
        filesChanged: ["src/a.ts"],
        tests: [{ name: "vitest", status: "skipped", claimed: "pass" }],
        deployUrl: "https://www.tiendapro.net",
        pendingItems: ["Configurar GPT"],
        prUrl: "https://github.com/tiendapronet2026-wq/tienda-web/pull/13",
      },
    });
    expect(md).toContain("### Resumen");
    expect(md).toContain("### Cambios");
    expect(md).toContain("### Pruebas");
    expect(md).toContain("### Despliegue");
    expect(md).toContain("### Pendientes");
  });
});
