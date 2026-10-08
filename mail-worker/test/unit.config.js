import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['test/open-attachments.spec.js', 'test/jwt-boundaries.spec.js', 'test/security-account-state.spec.js', 'test/setting-secret.spec.js', 'test/email-list-locale.spec.js', 'test/init-migration.spec.js', 'test/account-deletion-policy.spec.js', 'test/attachment-deletion.spec.js'] }
});
