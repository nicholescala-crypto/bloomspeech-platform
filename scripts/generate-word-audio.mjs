import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, "..", "public", "audio");
const TMP = os.tmpdir();

const WORDS = [
  "elephant", "umbrella", "butterfly", "kangaroo", "strawberry",
  "yesterday", "together", "remember", "hospital", "beautiful",
  "adventure", "crocodile", "hamburger", "banana", "tomato",
  "avocado", "computer", "recorder", "another", "delivery",
  "family", "animal", "calendar", "camera", "energy",
  "cucumber", "newspaper", "grandmother", "grandfather", "neighborhood",
  "basketball", "celebrate", "continue", "eleven", "enormous",
  "magazine", "telephone",
  "caterpillar", "watermelon", "alligator", "helicopter", "calculator",
  "refrigerator", "motorcycle", "submarine", "spaghetti", "television",
  "supermarket", "firefighter", "ballerina", "imagination",
  "understanding", "discovery", "elementary", "everybody", "information",
];

let generated = 0;
let skipped = 0;

for (const word of WORDS) {
  const mp3Path = path.join(AUDIO_DIR, `${word}.mp3`);
  const m4aPath = path.join(AUDIO_DIR, `${word}.m4a`);

  if (fs.existsSync(mp3Path) || fs.existsSync(m4aPath)) {
    console.log(`  skip  ${word}`);
    skipped++;
    continue;
  }

  const aiffTmp = path.join(TMP, `bloom-${word}.aiff`);

  try {
    execSync(`say -o "${aiffTmp}" "${word}"`);
    execSync(`afconvert "${aiffTmp}" "${m4aPath}" -f m4af -d aac`);
    fs.unlinkSync(aiffTmp);
    console.log(`  ✓     ${word}.m4a`);
    generated++;
  } catch (err) {
    console.error(`  ✗     ${word}: ${err.message}`);
    if (fs.existsSync(aiffTmp)) fs.unlinkSync(aiffTmp);
  }
}

console.log(`\nDone — generated: ${generated}, skipped: ${skipped}`);
