import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('browser entry point', () => {
  it('loads the game entry without blocking portrait mobile gameplay', async () => {
    const htmlPath = new URL('../../../index.html', import.meta.url);
    const html = await readFile(htmlPath, 'utf8');

    expect(html).toContain('<div id="game"></div>');
    expect(html).toContain('id="boot-loading"');
    expect(html).toContain('role="status"');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('env(safe-area-inset-top, 0px)');
    expect(html).toContain('touch-action: none');
    expect(html).not.toContain('orientation-notice');
    expect(html).not.toMatch(/#game\s*{\s*display:\s*none;/);
    expect(html).toContain('<script type="module" src="/src/main.ts"></script>');
  });
});
