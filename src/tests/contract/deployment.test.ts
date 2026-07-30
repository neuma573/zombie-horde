import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('deployment configuration', () => {
  it('builds and deploys the tested app through GitHub Pages', async () => {
    const workflowPath = new URL('../../../.github/workflows/deploy-pages.yml', import.meta.url);
    const viteConfigPath = new URL('../../../vite.config.ts', import.meta.url);
    const [workflow, viteConfig] = await Promise.all([
      readFile(workflowPath, 'utf8'),
      readFile(viteConfigPath, 'utf8'),
    ]);

    expect(workflow).toContain('branches:\n      - main');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm test');
    expect(workflow).toContain('run: npm run build');
    expect(workflow).toContain('id: pages');
    expect(workflow).toContain('VITE_BASE_PATH: ${{ steps.pages.outputs.base_path }}/');
    expect(workflow).toContain('uses: actions/upload-pages-artifact@v4');
    expect(workflow).toContain('pages: read');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('uses: actions/deploy-pages@v4');
    expect(viteConfig).toContain("base: process.env.VITE_BASE_PATH ?? '/'");
  });
});
