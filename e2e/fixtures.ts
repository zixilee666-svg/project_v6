import { test as base, type Page } from '@playwright/test';

// ─── Helper: inject auth tokens into localStorage ───
export async function injectAuth(page: Page, opts?: { role?: 'admin' | 'user' }) {
  const role = opts?.role ?? 'admin';
  const user = {
    id: role === 'admin' ? 'mock-user-001' : 'mock-user-002',
    username: role === 'admin' ? 'admin' : 'testuser',
    displayName: role === 'admin' ? 'Administrator' : 'Test User',
    role,
    email: role === 'admin' ? 'admin@hub.test' : 'test@hub.test',
    institution: 'Test University',
    researchField: 'Graph Neural Networks',
    createdAt: new Date().toISOString(),
  };

  await page.goto('/#/login');                          // need origin context for localStorage
  await page.evaluate(({ token, userJson }) => {
    localStorage.setItem('joan_auth_token', token);
    localStorage.setItem('joan_academic_user', userJson);
  }, { token: 'mock-jwt-token-e2e', userJson: JSON.stringify(user) });
}

// ─── Helper: clear all auth state ───
export async function clearAuth(page: Page) {
  await page.goto('/#/login');
  await page.evaluate(() => {
    localStorage.removeItem('joan_auth_token');
    localStorage.removeItem('joan_academic_user');
  });
}

// ─── Extend test fixture with auth helpers ───
type TestFixtures = {
  authedPage: Page;      // page with admin auth
  userPage: Page;        // page with regular user auth
  guestPage: Page;       // page without auth
};

export const test = base.extend<TestFixtures>({
  authedPage: async ({ page }, use) => {
    await injectAuth(page, { role: 'admin' });
    await use(page);
  },
  userPage: async ({ page }, use) => {
    await injectAuth(page, { role: 'user' });
    await use(page);
  },
  guestPage: async ({ page }, use) => {
    await clearAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
