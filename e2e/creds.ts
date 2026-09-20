import fs from "node:fs";
import path from "node:path";

const CREDS_PATH = path.join(__dirname, ".e2e-creds.json");

export function readE2eCreds(): {
  customerEmail: string;
  adminEmail: string;
  password: string;
  productSlug: string;
  stockBefore: number;
  expectedPrice: number;
  adminId?: string;
} {
  return JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));
}
