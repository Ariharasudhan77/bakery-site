import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Each collection is one JSON file. It is loaded into memory at start-up
// and written back to disk every time something changes.
export function collection(name) {
  const file = path.join(DATA_DIR, name + '.json');
  let rows = [];
  if (fs.existsSync(file)) {
    try {
      rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // Never overwrite a damaged file: keep a copy and start fresh
      fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
      console.warn(`${name}.json could not be read. A backup copy was saved.`);
    }
  }
  const save = () => {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
    fs.renameSync(tmp, file); // atomic: a crash can't leave a half-written file
  };
  return {
    find: (fn) => rows.find(fn),
    filter: (fn) => rows.filter(fn),
    insert: (row) => { rows.push(row); save(); return row; },
    remove: (fn) => { const before = rows.length; rows = rows.filter((r) => !fn(r)); if (rows.length !== before) save(); },
  };
}
