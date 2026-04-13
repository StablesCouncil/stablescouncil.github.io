import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, "..", "index.html");

/**
 * UTF-8 bytes mis-read as Latin-1 / CP1252 (Ã© style). Some second bytes were
 * stored as Unicode ‰ U+2030 (CP1252 view of 0x89) instead of U+0089.
 */
function charToLatin1Byte(c) {
  const cp = c.codePointAt(0);
  if (cp <= 0xff) return cp;
  if (cp === 0x2030) return 0x89; // ‰ used where raw byte 0x89 belonged (e.g. É U+00C9)
  return null;
}

function fixMojibakeLatin1Utf8(s) {
  const bytes = [];
  for (const ch of s) {
    const b = charToLatin1Byte(ch);
    if (b === null) return s;
    bytes.push(b);
  }
  return Buffer.from(bytes).toString("utf8");
}

function extractBlock(html, needle) {
  const start = html.indexOf(needle);
  if (start === -1) throw new Error(`Missing needle: ${needle}`);
  const brace = html.indexOf("{", start);
  if (brace === -1) throw new Error(`Missing { after ${needle}`);

  let depth = 0;
  let i = brace;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return { before: html.slice(0, brace), block: html.slice(brace, i), after: html.slice(i) };
}

const pairRe = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/gs;

function patchLocaleBlock(block) {
  return block.replace(pairRe, (full, keyInner, valInner) => {
    const key = JSON.parse(`"${keyInner}"`);
    let val = JSON.parse(`"${valInner}"`);

    if (key === "agent-fallback-link") {
      val = "Ouvrir StablesAgent \u2192";
    } else if (val.includes("\u00c3")) {
      val = fixMojibakeLatin1Utf8(val);
    }

    return `${JSON.stringify(key)}: ${JSON.stringify(val)}`;
  });
}

let html = fs.readFileSync(indexPath, "utf8");

for (const needle of ["\n            fr: {", '\n            "fr-qc-edgy": {']) {
  const { before, block, after } = extractBlock(html, needle);
  html = before + patchLocaleBlock(block) + after;
}

fs.writeFileSync(indexPath, html, "utf8");
console.log("Fixed French mojibake (fr + fr-qc-edgy) in index.html");
