import { access, readFile } from 'node:fs/promises';

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

  it('provides browser and Apple favicon variants', async () => {
    const htmlPath = new URL('../../../index.html', import.meta.url);
    const faviconDirectory = new URL('../../../docs/favicon/', import.meta.url);
    const html = await readFile(htmlPath, 'utf8');

    expect(html).toContain('href="./docs/favicon/favicon-96x96.png"');
    expect(html).toContain('href="./docs/favicon/favicon.ico"');
    expect(html).toContain('href="./docs/favicon/apple-touch-icon.png"');
    await Promise.all([
      access(new URL('favicon-96x96.png', faviconDirectory)),
      access(new URL('favicon.ico', faviconDirectory)),
      access(new URL('apple-touch-icon.png', faviconDirectory)),
    ]);
  });
});
