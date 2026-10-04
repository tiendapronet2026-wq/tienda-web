import { describe, expect, it } from "vitest";
import { isDigitalTestOrder } from "./smoke-guard";
import { DIGITAL_TEST_ORDER_MARKER } from "./constants";

describe("smoke guard", () => {
  it("solo pedidos marcados son elegibles para smoke admin", () => {
    expect(isDigitalTestOrder(`${DIGITAL_TEST_ORDER_MARKER} pedido`)).toBe(true);
    expect(isDigitalTestOrder("pedido normal")).toBe(false);
    expect(isDigitalTestOrder(null)).toBe(false);
  });
});
