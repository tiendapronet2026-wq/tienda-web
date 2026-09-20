import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { readE2eCreds } from "./creds";

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET!;
const ARTIFACT = path.join(__dirname, ".e2e-result.json");

function bypassUrl(pathname: string) {
  const base = process.env.PREVIEW_URL ?? "";
  const u = new URL(pathname, base);
  u.searchParams.set("x-vercel-set-bypass-cookie", "true");
  u.searchParams.set("x-vercel-protection-bypass", bypass);
  return u.toString();
}

async function login(page: import("@playwright/test").Page, email: string, password: string, redirect?: string) {
  const loginPath = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";
  await page.goto(bypassUrl(loginPath));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 45_000 }
  );
}

test.describe("Checkout Preview (Vercel bypass)", () => {
  test("producto → carrito → checkout → confirmación", async ({ page }) => {
    const creds = readE2eCreds();

    await login(page, creds.customerEmail, creds.password, `/productos/${creds.productSlug}`);
    await expect(page.getByText(/Stock disponible/)).toContainText(String(creds.stockBefore));

    const addBtn = page.getByRole("button", { name: "Agregar al carrito" });
    await addBtn.click();
    await page.waitForTimeout(1500);

    await page.goto(bypassUrl("/carrito"));
    await expect(page.getByRole("link", { name: "Continuar al checkout" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("link", { name: "Continuar al checkout" }).click();
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    await page.getByLabel("Calle y número").fill("E2E Calle 123");
    await page.getByLabel("Ciudad").fill("CABA");
    await page.getByLabel("Provincia").fill("CABA");
    await page.getByLabel("Código postal").fill("1000");

    const idempotencyKey = await page.locator('input[name="idempotency_key"]').inputValue();
    expect(idempotencyKey.length).toBeGreaterThan(8);

    await page.getByRole("button", { name: /Confirmar pedido/ }).click();

    await expect(page.getByRole("heading", { name: "Pedido confirmado" })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Total:/)).toBeVisible();

    const url = new URL(page.url());
    const orderId = url.searchParams.get("pedido");
    expect(orderId).toBeTruthy();

    fs.writeFileSync(
      ARTIFACT,
      JSON.stringify({
        orderId,
        idempotencyKey,
        customerEmail: creds.customerEmail,
        adminEmail: creds.adminEmail,
        stockBefore: creds.stockBefore,
        expectedPrice: creds.expectedPrice,
      })
    );

    await page.goto(bypassUrl(`/productos/${creds.productSlug}`));
    await expect(page.getByText(/Stock disponible/)).toContainText(String(creds.stockBefore - 1));
  });

  test("panel admin de prueba ve el pedido", async ({ page }) => {
    const creds = readE2eCreds();
    const result = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
    expect(result.orderId).toBeTruthy();

    await login(page, creds.adminEmail, creds.password, "/admin/pedidos");
    await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver" }).first()).toBeVisible();
    await expect(page.locator("table")).toContainText("pending");
    await expect(page.locator("table")).toContainText("89.999");
  });
});
