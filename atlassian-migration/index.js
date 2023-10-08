import LZUTF8 from 'lzutf8';
const COMPRESS_ENCODING = 'Base64';

const compress = (s) => s && LZUTF8.compress(s, {outputEncoding: COMPRESS_ENCODING});

export function compressItem(item) {
  return {compressedJson: compress(JSON.stringify(doc))};
}