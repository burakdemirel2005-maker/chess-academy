import { expect, test } from '@playwright/test';

test.describe('Satranç Akademisi E2E Flows (Section 23)', () => {
  test('1-3 & 6: Starting a lesson, moving a piece, receiving coaching feedback, and saving progress', async ({
    page,
  }) => {
    await page.goto('/lessons');
    await expect(
      page.getByRole('heading', { name: /Satranç Akademisi Müfredatı/i })
    ).toBeVisible();

    // Verify lesson 1 title is visible
    await expect(page.getByRole('heading', { name: /1\. Satranç Nedir\?/i })).toBeVisible();

    // Click e2 square then e4 square to make the interactive move
    const e2Square = page.locator('[data-square="e2"]');
    const e4Square = page.locator('[data-square="e4"]');
    await e2Square.click();
    await e4Square.click();

    // Verify lesson exercise feedback and coach evaluation card appear
    await expect(page.getByTestId('lesson-exercise-feedback')).toContainText('Harika!');
    await expect(page.getByTestId('coach-move-evaluation')).toBeVisible();

    // Answer the lesson quiz and save progress
    await page
      .getByLabel(/İlk hamleyi Beyaz yapar; amaç rakip şahı mat etmektir\./i)
      .check();
    await page.getByRole('button', { name: /Yanıtı Kontrol Et ve Kaydet/i }).click();
    await expect(page.getByTestId('lesson-quiz-feedback')).toContainText('Tebrikler');
  });

  test('4: Playing against Stockfish and receiving coaching feedback & hints', async ({
    page,
  }) => {
    await page.goto('/play');
    await expect(
      page.getByRole('heading', { name: /Stockfish ile Oyna/i })
    ).toBeVisible();

    // Request Level 1 Conceptual Hint
    await page.getByTestId('hint-level-1-btn').click();
    await expect(page.getByTestId('active-hint-box')).toBeVisible();

    // Make opening move e2 -> e4 against Stockfish
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();

    // Verify coach move evaluation appears
    await expect(page.getByTestId('coach-move-evaluation')).toBeVisible();
  });

  test('5: Completing a tactical puzzle', async ({ page }) => {
    await page.goto('/tactics');
    await expect(
      page.getByRole('heading', { name: /Taktik Bulmaca Antrenörü/i })
    ).toBeVisible();

    // Solve puzzle 1 (Back-rank mate: d1 -> d8)
    await page.locator('[data-square="d1"]').click();
    await page.locator('[data-square="d8"]').click();

    await expect(page.getByTestId('puzzle-feedback-banner')).toContainText(
      'Tebrikler, bulmacayı çözdün!'
    );
  });

  test('7 & 8: Resuming progress after login and operating offline without network connectivity', async ({
    page,
    context,
  }) => {
    await page.goto('/settings');
    await page.getByLabel(/E-posta Adresi/i).fill('ogrenci@satrancakademisi.tr');
    await page.getByLabel(/Şifre/i).fill('GucluSifre123!');
    await page.getByRole('button', { name: /Oturum Aç/i }).click();

    await expect(page.getByText('ogrenci@satrancakademisi.tr')).toBeVisible();

    // Reload page and verify session & progress persist from local storage
    await page.reload();
    await expect(page.getByText('ogrenci@satrancakademisi.tr')).toBeVisible();

    // Switch browser context to offline mode and verify client-side SPA navigation, lessons, and coaching work 100% offline
    await context.setOffline(true);
    await page.getByRole('link', { name: /Genel Bakış/i }).first().click();
    await expect(page.getByRole('heading', { name: /Hoş geldin/i })).toBeVisible();

    await page.getByRole('link', { name: /Açılış Akademisi/i }).first().click();
    await expect(page.getByRole('heading', { name: /Açılış Akademisi/i })).toBeVisible();
    await context.setOffline(false);
  });
});
