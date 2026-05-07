import { test, expect } from "@playwright/test";

test("dashboard shows seeded docs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Panel")).toBeVisible();
  await expect(page.getByText("Documentos")).toBeVisible();
});

test("killer query 1 — simple Q&A with citations", async ({ page }) => {
  await page.goto("/chat");
  await page.getByText("Frecuencia DS-024").click();
  await expect(page.locator("button:has-text('DS-024')").first()).toBeVisible({ timeout: 90_000 });
});

test("killer query 2 — comparison", async ({ page }) => {
  await page.goto("/chat");
  await page.getByText("Comparar DS-024 vs ICOLD 194").click();
  await expect(page.locator("button:has-text('ICOLD')").first()).toBeVisible({ timeout: 90_000 });
});

test("search returns results", async ({ page }) => {
  await page.goto("/buscar");
  await page.getByPlaceholder("p. ej.").fill("monitoreo piezométrico");
  await page.keyboard.press("Enter");
  await expect(page.locator("ol > li").first()).toBeVisible({ timeout: 30_000 });
});
