#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SEQUENCE_DIR = path.join(ROOT, "public", "sequence");
const IMAGE_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const EXPECTED_FRAMES = 120;

function readSequenceFiles() {
  if (!fs.existsSync(SEQUENCE_DIR)) {
    throw new Error(`Missing directory: ${SEQUENCE_DIR}`);
  }

  const allFiles = fs
    .readdirSync(SEQUENCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const imageFiles = allFiles.filter((filename) =>
    IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase())
  );

  if (imageFiles.length === 0) {
    const zipFile = allFiles.find((filename) => path.extname(filename).toLowerCase() === ".zip");
    if (zipFile) {
      throw new Error(
        `No images found in /public/sequence. Detected archive "${zipFile}" - extract it first.`
      );
    }
  }

  return imageFiles;
}

function numericKey(filename) {
  const matches = filename.match(/\d+/g);
  if (!matches) {
    return Number.MAX_SAFE_INTEGER;
  }

  const value = Number.parseInt(matches[matches.length - 1], 10);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function sortNumerically(files) {
  return [...files].sort((a, b) => {
    const aNum = numericKey(a);
    const bNum = numericKey(b);

    if (aNum !== bNum) {
      return aNum - bNum;
    }

    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

async function loadSharp() {
  try {
    // Optional: used only if JPG/PNG files need to become WEBP.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    return require("sharp");
  } catch {
    return null;
  }
}

async function main() {
  const files = sortNumerically(readSequenceFiles());

  if (files.length === 0) {
    throw new Error("No image files found in /public/sequence.");
  }

  const hasNonWebp = files.some((filename) => path.extname(filename).toLowerCase() !== ".webp");
  const sharp = hasNonWebp ? await loadSharp() : null;

  if (hasNonWebp && !sharp) {
    throw new Error(
      "Found JPG/PNG frames. Install sharp to convert to WEBP: npm install --save-dev sharp"
    );
  }

  const stamp = Date.now();
  const staged = [];

  files.forEach((filename, index) => {
    const ext = path.extname(filename).toLowerCase();
    const oldPath = path.join(SEQUENCE_DIR, filename);
    const stagedName = `.__staged_${stamp}_${index}${ext}`;
    const stagedPath = path.join(SEQUENCE_DIR, stagedName);

    fs.renameSync(oldPath, stagedPath);
    staged.push({ stagedPath, ext });
  });

  for (let index = 0; index < EXPECTED_FRAMES; index += 1) {
    const sourceIndex = Math.round((index / (EXPECTED_FRAMES - 1)) * (staged.length - 1));
    const { stagedPath, ext } = staged[sourceIndex];
    const finalPath = path.join(SEQUENCE_DIR, `frame_${index}.webp`);

    if (ext === ".webp") {
      fs.copyFileSync(stagedPath, finalPath);
      continue;
    }

    await sharp(stagedPath).webp({ quality: 92 }).toFile(finalPath);
  }

  staged.forEach(({ stagedPath }) => {
    if (fs.existsSync(stagedPath)) {
      fs.unlinkSync(stagedPath);
    }
  });

  const sourceCount = files.length;
  if (sourceCount !== EXPECTED_FRAMES) {
    console.log(
      `[info] Input had ${sourceCount} source frames; remapped to ${EXPECTED_FRAMES} output frames.`
    );
  }

  console.log(`[ok] Normalized ${EXPECTED_FRAMES} frames in ${SEQUENCE_DIR}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
