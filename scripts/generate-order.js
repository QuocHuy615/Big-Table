import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

const args = process.argv.slice(2);

function getArgValue(flagName, defaultValue) {
  const flagIndex = args.indexOf(flagName);
  if (flagIndex === -1) {
    return defaultValue;
  }

  const value = args[flagIndex + 1];
  return value && !value.startsWith('--') ? value : defaultValue;
}

const inputPath = path.resolve(projectRoot, getArgValue('--input', 'public/data.json'));
const outputPath = path.resolve(projectRoot, getArgValue('--output', 'public/data.with-order.json'));
const overwrite = args.includes('--overwrite');

export function addOrderFields(data) {
  if (!Array.isArray(data)) {
    throw new Error('Expected the JSON root value to be an array.');
  }

  return data.map((item, index) => ({
    ...item,
    order: (index + 1) * 1000,
  }));
}

async function main() {
  const raw = await readFile(inputPath, 'utf8');
  const data = JSON.parse(raw);

  const orderedData = addOrderFields(data);

  const targetPath = overwrite ? inputPath : outputPath;
  await writeFile(targetPath, `${JSON.stringify(orderedData, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${orderedData.length} rows to ${path.relative(projectRoot, targetPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('Failed to generate order values:', error);
    process.exitCode = 1;
  });
}