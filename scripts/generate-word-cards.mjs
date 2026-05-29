import { Jimp, loadFont, HorizontalAlign, VerticalAlign } from "jimp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(
  __dirname, "..", "node_modules", "@jimp", "plugin-print", "dist", "fonts", "open-sans"
);

const FONT_64 = path.join(FONTS_DIR, "open-sans-64-white", "open-sans-64-white.fnt");
const FONT_32 = path.join(FONTS_DIR, "open-sans-32-white", "open-sans-32-white.fnt");
const FONT_16 = path.join(FONTS_DIR, "open-sans-16-white", "open-sans-16-white.fnt");

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

// Vibrant solid backgrounds — cycles through words
const BACKGROUNDS = [
  0x5B8DEEFF, // sky blue
  0xFF6B6BFF, // coral
  0x4ECDC4FF, // teal
  0xF7B731FF, // amber
  0xA29BFEFF, // lavender
  0x55EFC4FF, // mint
  0xFD79A8FF, // pink
  0xE17055FF, // orange
  0x6C5CE7FF, // purple
  0x00B894FF, // emerald
  0xFDAB00FF, // gold
  0x0984E3FF, // ocean blue
];

const IMG_SIZE = 280;
const IMAGES_DIR = path.join(__dirname, "..", "public", "Images");

function fontPathForWord(_word) {
  return FONT_32;
}

async function generateCard(word, bgColor, font) {
  const img = new Jimp({ width: IMG_SIZE, height: IMG_SIZE, color: bgColor });

  img.print({
    font,
    x: 0,
    y: 0,
    text: {
      text: word,
      alignmentX: HorizontalAlign.CENTER,
      alignmentY: VerticalAlign.MIDDLE,
    },
    maxWidth: IMG_SIZE,
    maxHeight: IMG_SIZE,
  });

  return img;
}

async function main() {
  // Pre-load fonts
  const fonts = {
    [FONT_64]: await loadFont(FONT_64),
    [FONT_32]: await loadFont(FONT_32),
    [FONT_16]: await loadFont(FONT_16),
  };

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < WORDS.length; i++) {
    const word = WORDS[i];
    const outPath = path.join(IMAGES_DIR, `${word}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`  skip  ${word}`);
      skipped++;
      continue;
    }

    const bgColor = BACKGROUNDS[i % BACKGROUNDS.length];
    const fontPath = fontPathForWord(word);
    const font = fonts[fontPath];

    const img = await generateCard(word, bgColor, font);
    await img.write(outPath);
    console.log(`  ✓     ${word}.png`);
    generated++;
  }

  console.log(`\nDone — generated: ${generated}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
