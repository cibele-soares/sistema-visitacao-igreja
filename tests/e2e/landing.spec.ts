import { expect, test } from "@playwright/test";

test("exibe a página pública", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Ação de Visitação/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sou Voluntário/i })).toBeVisible();
});
