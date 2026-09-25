/**
 * app-fit.md step 1: the stale /concepts/agent-social duplicate is deleted and
 * replaced by ONE permanent redirect to the app. (Jest cannot import the .mjs
 * config without --experimental-vm-modules, so the config is read as text; the
 * real 308 is checked against a built server, see docs/review/app-fit.md.)
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');

describe('/concepts/agent-social removal', () => {
  it('no longer has a page', () => {
    expect(fs.existsSync(path.join(root, 'app/concepts/agent-social/page.tsx'))).toBe(false);
  });

  it('is redirected permanently to app.helloai.com in next.config.mjs', () => {
    const cfg = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');
    expect(cfg).toMatch(/source:\s*'\/concepts\/agent-social'/);
    expect(cfg).toMatch(/destination:\s*'https:\/\/app\.helloai\.com'/);
    const block = cfg.slice(cfg.indexOf("source: '/concepts/agent-social'"));
    expect(block.slice(0, 200)).toMatch(/permanent:\s*true/);
  });

  it('leaves no orphaned social-app-* CSS', () => {
    const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
    expect(css).not.toMatch(/\.social-app-/);
  });
});
