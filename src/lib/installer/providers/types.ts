export type ProviderVerifyResult = {
  ok: boolean;
  status: "ok" | "skipped" | "failed" | "simulated";
  message: string;
};
