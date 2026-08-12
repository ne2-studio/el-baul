import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Enforces docs/adr/0002-design-system-taxonomy.md: every Storybook `title` must be
// filed under one of the six taxonomy tiers, in that order, so the sidebar keeps
// communicating reuse (Foundations/Components/Patterns/Layouts → reusable UI kit;
// Features/Screens → domain-specific). Catches stray legacy prefixes (e.g. the old
// flat `Components/<Name>` or a hand-typed `Design System/...`) at test time instead
// of relying on someone noticing the sidebar looks wrong.
const ALLOWED_CATEGORIES = ['Foundations', 'Components', 'Patterns', 'Layouts', 'Features', 'Screens'];

const SRC_DIR = join(__dirname);

function findStoryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return findStoryFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.stories.tsx') ? [fullPath] : [];
  });
}

// Reads the `title` off `const meta = { title: '...', ... }` without importing the
// story module — importing every story would execute component code (hooks, router
// context, native plugin stubs) this test has no business depending on.
function extractStoryTitle(fileContents: string): string | null {
  const match = fileContents.match(/const\s+meta(?:\s*:[^=]*)?\s*=\s*\{\s*title:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

describe('Storybook taxonomy (ADR 0002)', () => {
  const storyFiles = findStoryFiles(SRC_DIR);

  it('found story files to check', () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it.each(storyFiles)('%s has a title under an allowed category', (filePath) => {
    const title = extractStoryTitle(readFileSync(filePath, 'utf-8'));
    expect(title, `${filePath}: could not find \`const meta = { title: '...' }\``).not.toBeNull();

    const category = title!.split('/')[0];
    expect(
      ALLOWED_CATEGORIES,
      `${filePath}: title "${title}" is filed under "${category}", which isn't one of the ` +
        `ADR 0002 taxonomy tiers (${ALLOWED_CATEGORIES.join(', ')}). ` +
        'See docs/adr/0002-design-system-taxonomy.md.',
    ).toContain(category);
  });
});
