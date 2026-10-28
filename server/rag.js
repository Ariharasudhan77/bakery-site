import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KNOWLEDGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'knowledge');
const MAX_CHUNK = 900; // characters

const STOP = new Set('the a an and or of to in on at for is are was be do does did you your we our us it its i me my can how what when where which who with this that there any have has'.split(' '));

// Very small stemmer: "croissants" -> "croissant", "pastries" -> "pastry", "baked" -> "bak"
function stem(w) {
  if (w.length <= 3) return w;
  return w.replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/e$/, '');
}

const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w)).map(stem);

// Split one file into chunks, one per heading section (long sections are split by paragraph)
function chunkFile(file, raw) {
  const source = file.replace(/\.[^.]+$/, '');
  const text = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  const chunks = [];
  let heading = source;
  let buffer = '';

  const flush = () => {
    const body = buffer.trim();
    if (body) chunks.push({ source, heading, text: body });
    buffer = '';
  };

  for (const line of text.split('\n')) {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      if (buffer.length + line.length > MAX_CHUNK && line.trim() === '') flush();
      else buffer += line + '\n';
    }
  }
  flush();
  return chunks;
}

export function buildIndex() {
  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => /\.(md|txt|csv)$/i.test(f));
  const chunks = files.flatMap((f) => chunkFile(f, fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf8')));

  // Pre-compute term frequencies for BM25
  const docs = chunks.map((c) => {
    const terms = tokenize(c.heading + ' ' + c.heading + ' ' + c.text); // heading counts double
    const tf = new Map();
    terms.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    return { tf, len: terms.length };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / (docs.length || 1);
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));

  function search(query, k = 4) {
    const q = [...new Set(tokenize(query))];
    const K1 = 1.5, B = 0.75, N = docs.length;
    return docs
      .map((d, i) => {
        let score = 0;
        for (const t of q) {
          const f = d.tf.get(t);
          if (!f) continue;
          const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
          score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / avgLen)));
        }
        return { ...chunks[i], score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  return { files, chunks, search };
}
