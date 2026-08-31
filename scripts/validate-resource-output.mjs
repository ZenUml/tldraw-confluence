import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDirectory = path.join(repositoryRoot, 'static/spa/build');
const indexPath = path.join(buildDirectory, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('Forge resource output is missing static/spa/build/index.html; run pnpm build:whiteboard');
}

const html = fs.readFileSync(indexPath, 'utf8');
const tags = [...html.matchAll(/<(script|link)\b[^>]*>/giu)].map(([tag]) => tag);

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'iu'));
  return match?.[2] ?? null;
}

const scriptAssets = tags
  .filter((tag) => /^<script\b/iu.test(tag))
  .map((tag) => attribute(tag, 'src'))
  .filter(Boolean);
const styleAssets = tags
  .filter((tag) => /^<link\b/iu.test(tag) && /\brel\s*=\s*(["'])stylesheet\1/iu.test(tag))
  .map((tag) => attribute(tag, 'href'))
  .filter(Boolean);

if (scriptAssets.length === 0 || styleAssets.length === 0) {
  throw new Error('Forge resource output must reference at least one JavaScript and one CSS asset');
}

for (const assetUrl of [...scriptAssets, ...styleAssets]) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/iu.test(assetUrl)) {
    throw new Error(`Forge resource asset URL must be relative: ${assetUrl}`);
  }

  const pathname = decodeURIComponent(assetUrl.split(/[?#]/u)[0]);
  const assetPath = path.resolve(buildDirectory, pathname);
  if (!assetPath.startsWith(`${buildDirectory}${path.sep}`)) {
    throw new Error(`Forge resource asset escapes static/spa/build: ${assetUrl}`);
  }
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Forge resource asset does not exist: ${assetUrl}`);
  }
}

console.log(
  `Validated static/spa/build/index.html: ${scriptAssets.length} relative script asset(s), ${styleAssets.length} relative stylesheet asset(s).`,
);
