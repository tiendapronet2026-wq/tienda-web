import { DIGITAL_TEST_ORDER_MARKER } from "@/lib/digital/constants";

export function isDigitalTestOrder(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(DIGITAL_TEST_ORDER_MARKER));
}

export function isDigitalSmokeEnvironment(): boolean {
  if (process.env.TIENDAPRO_DIGITAL_SMOKE_ENABLED === "1") return true;
  return process.env.NODE_ENV !== "production";
}
