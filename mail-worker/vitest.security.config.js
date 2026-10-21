import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [{
    name: 'cloudflare-email-test-stub',
    resolveId(id) { if (id === 'cloudflare:email') return '\0cloudflare-email-test-stub'; },
    load(id) { if (id === '\0cloudflare-email-test-stub') return 'export class EmailMessage {}'; },
  }],
  test: { include: ['test/security.spec.js'], environment: 'node' },
});
