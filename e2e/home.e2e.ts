import { expect, test } from '@playwright/test';

test('home is the canvas', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('can');
	await expect(page.getByRole('button', { name: '+ pane' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'sent' })).toBeVisible();
});

test('sent map loads', async ({ page }) => {
	await page.goto('/sent');
	await expect(page).toHaveTitle('sent');
	await expect(page.locator('h1')).toHaveText('sent');
	await expect(page.locator('#loading')).toHaveCount(0);
});
