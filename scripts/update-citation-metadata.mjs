#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opts = new Map();
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      opts.set(key, true);
    } else {
      opts.set(key, next);
      i++;
    }
  }
}

const file = opts.get('file') || 'CITATION.cff';
const commit = opts.get('commit');
const dateGenerated = opts.get('date');

if (!commit || !dateGenerated) {
  console.error('Usage: update-citation-metadata.mjs --commit <sha> --date <YYYY-MM-DD> [--file <path>]');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), file);
const original = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
let lines = original.split('\n');

let insertAfter = lines.findIndex((line) => line.startsWith('type:'));
if (insertAfter === -1) {
  insertAfter = lines.findIndex((line) => line.startsWith('title:'));
}
if (insertAfter === -1) {
  insertAfter = lines.findIndex((line) => line.startsWith('cff-version:'));
}
if (insertAfter === -1) {
  insertAfter = 0;
}

const upsert = (key, value) => {
  const idx = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (idx !== -1) {
    lines[idx] = `${key}: ${value}`;
    return;
  }
  const pos = insertAfter + 1;
  lines.splice(pos, 0, `${key}: ${value}`);
  insertAfter++;
};

upsert('commit', commit);
upsert('date-generated', dateGenerated);

const updated = lines.join('\n').replace(/\n*$/, '\n');
if (updated !== original) {
  fs.writeFileSync(filePath, updated, 'utf8');
}
