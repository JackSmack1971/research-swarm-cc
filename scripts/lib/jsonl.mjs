import { readFile } from 'node:fs/promises';

export async function readJsonl(file) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    return { records: [], errors: [{ file, line: null, message: error.message }] };
  }

  const records = [];
  const errors = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      errors.push({ file, line: index + 1, message: error.message });
    }
  }
  return { records, errors };
}
