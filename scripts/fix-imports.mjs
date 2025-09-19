import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Pattern to match relative imports without file extensions
const importPattern = /from ['"](\.[^'"]*)['"]/g;

async function fixImports(filePath) {
  const content = await readFile(filePath, 'utf8');
  let modified = content;
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const [fullMatch, importPath] = match;
    if (!importPath.endsWith('.js')) {
      const newImport = fullMatch.replace(importPath, `${importPath}.js`);
      modified = modified.replace(fullMatch, newImport);
    }
  }

  if (modified !== content) {
    await writeFile(filePath, modified, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  }
}

async function main() {
  try {
    const files = await glob('api/**/*.ts', {
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.spec.ts']
    });

    for (const file of files) {
      await fixImports(join(projectRoot, file));
    }
    console.log('Import paths updated successfully!');
  } catch (error) {
    console.error('Error updating imports:', error);
    process.exit(1);
  }
}

main();
