import { describe, expect, it } from "vitest";
import {
  formatSalesAttributionNotes,
  mergeSalesAttributionIntoNotes,
  parseSalesAttributionFromNotes,
} from "./checkout-attribution";

describe("sales checkout attribution", () => {
  it("formatea y parsea marcador en notas", () => {
    const fragment = formatSalesAttributionNotes("whatsapp_business", "abc123def456");
    expect(fragment).toContain("whatsapp_business:abc123def456");
    const parsed = parseSalesAttributionFromNotes(`pedido ${fragment}`);
    expect(parsed).toEqual({ src: "whatsapp_business", cid: "abc123def456" });
  });

  it("no duplica marcador", () => {
    const first = mergeSalesAttributionIntoNotes(null, "facebook_messenger", "tok1");
    const second = mergeSalesAttributionIntoNotes(first, "facebook_messenger", "tok2");
    expect(second).toBe(first);
  });
});
