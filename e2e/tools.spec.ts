import { expect, test } from '@playwright/test';
const pages = ['projekt', 'byggefaser', 'byggeplads', 'jord-kloak', 'aflevering'];
for (const route of pages) {
  test(`${route}: renders 3D, responds to camera controls, fits viewport`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`#/${route}`);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.webgl-error')).toHaveCount(0);
    await expect(page.locator('.metric')).toHaveCount(4);
    await page.locator('.canvas-host').screenshot({ path: testInfo.outputPath(`${route}-model.png`) });
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Plan', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Nulstil kamera', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Perspektiv', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
    if (route === 'projekt') {
      await page.getByLabel('Længde', { exact: true }).focus();
      await page.getByLabel('Længde', { exact: true }).press('ArrowRight');
      await expect(page.getByLabel('Længde', { exact: true })).toHaveValue('25');
      await page.getByRole('button', { name: 'Skift til mørk visning' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.reload();
      await expect(page.getByLabel('Længde', { exact: true })).toHaveValue('25');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.screenshot({ path: testInfo.outputPath('project-dark.png'), fullPage: true });
      await page.getByRole('button', { name: 'Skift til lys visning' }).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`${route}-page.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
