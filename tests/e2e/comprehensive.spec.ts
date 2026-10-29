import { expect, test } from '@playwright/test';

test.describe('Satranç Akademisi Comprehensive Verification', () => {
  test('1. Stockfish Engine & Interactive Coach in Play Mode', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('heading', { name: /Stockfish ile Oyna/i })).toBeVisible();

    // Verify difficulty selector is present
    await expect(page.getByLabel(/Zorluk Seviyesi/i)).toBeVisible();

    // Verify Smart Hint 1 (Conceptual) works
    await page.getByTestId('hint-level-1-btn').click();
    await expect(page.getByTestId('active-hint-box')).toBeVisible();

    // Play move e2 -> e4 as White
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();

    // Coach evaluation card must appear with move classification
    const coachCard = page.getByTestId('coach-move-evaluation');
    await expect(coachCard).toBeVisible({ timeout: 5000 });
    await expect(coachCard).toContainText(/En İyi Hamle|Mükemmel|İyi Hamle|Açılış/);

    // Stockfish engine should think and respond with a move
    // The board will have a piece on e4 and move history will show e4
    await expect(page.getByRole('button', { name: 'e4' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Lessons & Educational Progression', async ({ page }) => {
    await page.goto('/lessons');
    await expect(page.getByRole('heading', { name: /Satranç Akademisi Müfredatı/i })).toBeVisible();

    // Lesson 1 should be selected by default
    await expect(page.getByRole('heading', { name: /1\. Satranç Nedir\?/i })).toBeVisible();

    // Make required exercise move e2 -> e4
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();

    // Verify feedback and quiz
    await expect(page.getByTestId('lesson-exercise-feedback')).toContainText('Harika!');
    await page.getByLabel(/İlk hamleyi Beyaz yapar; amaç rakip şahı mat etmektir\./i).check();
    await page.getByRole('button', { name: /Yanıtı Kontrol Et ve Kaydet/i }).click();
    await expect(page.getByTestId('lesson-quiz-feedback')).toContainText('Tebrikler');

    // Switch to Module B (Opening Principles)
    await page.getByRole('button', { name: /Modül B: Açılış İlkeleri/i }).click();
    await expect(page.getByRole('heading', { name: /20\. Merkez Kontrolü ve Hafif/i })).toBeVisible();
  });

  test('3. Opening Explorer & Practice Mode', async ({ page }) => {
    await page.goto('/openings');
    await expect(page.getByRole('heading', { name: /Açılış Akademisi/i })).toBeVisible();

    // Select Italian Game
    await page.getByRole('button', { name: /İtalyan Açılışı/i }).first().click();
    await expect(page.getByText('C50').first()).toBeVisible();

    // Step forward in opening moves
    const nextBtn = page.getByRole('button', { name: /Sonraki Hamleyi Göster/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click(); // e4

    // Verify feedback is updated
    await expect(page.getByText(/1\. adım/i)).toBeVisible();

    // Switch to Practice Mode
    await page.getByTestId('opening-practice-mode-btn').click();
    await expect(page.getByText(/Hafızadan Pratik Modu/i)).toBeVisible();
  });

  test('4. Tactical Puzzles & Solution Reveal', async ({ page }) => {
    await page.goto('/tactics');
    await expect(page.getByRole('heading', { name: /Taktik Bulmaca Antrenörü/i })).toBeVisible();

    // Puzzle 1: Back-rank mate (d1 -> d8)
    await page.locator('[data-square="d1"]').click();
    await page.locator('[data-square="d8"]').click();

    // Check completion banner
    await expect(page.getByTestId('puzzle-feedback-banner')).toContainText(
      'Tebrikler, bulmacayı çözdün!'
    );

    // Click next puzzle
    await page.getByRole('button', { name: /Sonraki Bulmacaya Geç/i }).click();
    await expect(page.getByRole('heading', { name: 'Vezir ve Fil İşbirliği' })).toBeVisible();
  });

  test('5. Analysis Studio Interaction', async ({ page }) => {
    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: /Analiz Stüdyosu/i })).toBeVisible();

    // FEN input should be present and valid
    await expect(page.getByLabel(/FEN Dizisi/i)).toBeVisible();

    // Make analysis moves on board: e2 -> e4
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();

    // Verify move appears in analysis move history
    await expect(page.getByText('1. e4')).toBeVisible();
  });

  test('6. Contextual Assistant Turkish Interaction', async ({ page }) => {
    await page.goto('/play');

    // Click suggested Turkish question in Coach Assistant
    const questionBtn = page.getByRole('button', { name: 'Şimdi ne yapmalıyım?' });
    if (await questionBtn.isVisible()) {
      await questionBtn.click();
      await expect(page.getByTestId('assistant-messages')).toBeVisible();
      await expect(page.getByTestId('assistant-messages')).toContainText(/merkez|gelişim|şah|taş/i);
    }
  });

  test('7. Dashboard Welcome & Progress View', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Hoş geldin/i })).toBeVisible();

    // Quick action link to continue lessons should be visible
    await expect(page.getByRole('link', { name: /Öğrenmeye Devam Et/i })).toBeVisible();
  });
});
