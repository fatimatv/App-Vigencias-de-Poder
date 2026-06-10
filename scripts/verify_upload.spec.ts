import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('uploads the EBANX vigencia sample and reaches extracted review state', async ({ page }) => {
  test.setTimeout(240000);
  const samplePath = path.join(
    process.cwd(),
    'samples',
    'VIGENCIA DE PODER - EBANX- FATIMA LUCIA TOCHE VEGA-GERENTE GENERAL - 06.25.pdf'
  );
  test.skip(!fs.existsSync(samplePath), 'Local SUNARP sample PDF is not present.');

  await page.goto('http://127.0.0.1:5173');
  if (await page.getByRole('button', { name: /crear acceso/i }).isVisible()) {
    await page.getByPlaceholder('Usuario').fill('ialaw');
    await page.getByPlaceholder('Contraseña', { exact: true }).fill('ialaw-test-2026');
    await page.getByPlaceholder('Confirmar contraseña').fill('ialaw-test-2026');
    await page.getByRole('button', { name: /crear acceso/i }).click();
  }
  await page.getByRole('button', { name: /registrar nueva empresa/i }).click();
  await page.getByPlaceholder('Nombre de empresa').fill('EBANX Peru S.A.C.');
  await page.getByPlaceholder(/RUC de 11/i).fill('20600000001');
  await page.getByPlaceholder('Partida registral').fill('13273320');
  await page.getByPlaceholder('Oficina registral').fill('Lima');
  await page.getByRole('button', { name: /guardar empresa/i }).click();
  await page.getByRole('button', { name: /EBANX Peru S.A.C./i }).click();
  await page.getByRole('button', { name: /subir vigencia de poder/i }).click();

  await page.locator('input[type="file"]').setInputFiles(samplePath);

  await expect(page.getByText(/Extracci[oó]n terminada|No se pudo leer|no se detect[oó] texto utilizable/i)).toBeVisible({
    timeout: 210000
  });
  await expect(page.getByRole('textbox', { name: /Nombre del apoderado/i })).toHaveValue(/FATIMA LUCIA TOCHE VEGA/i, {
    timeout: 10000
  });
  await page.getByRole('button', { name: /confirmar y guardar/i }).click();
  await expect(page.getByRole('heading', { name: /EBANX Peru S.A.C./i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('cell', { name: 'FATIMA LUCIA TOCHE VEGA', exact: true })).toBeVisible({ timeout: 20000 });
});
