import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.resolve(projectRoot, "..", "phd_comp_exam_deck_latest.html");
const assetsDir = path.join(projectRoot, "assets");

await mkdir(assetsDir, { recursive: true });

const source = await readFile(sourcePath, "utf8");
const styleMatch = source.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
const scriptMatch = source.match(/<script>\s*([\s\S]*?)\s*<\/script>/);

if (!styleMatch || !scriptMatch) {
  throw new Error("Could not locate the embedded style or script block.");
}

let slideIndex = 0;
let imageIndex = 0;
const filesByHash = new Map();

let html = source.replace(
  /(<section\b[\s\S]*?<\/section>)|(<img\b[^>]*?src="data:image\/(png|jpeg);base64,([^"]+)"[^>]*>)/g,
  (match, section, imageTag, imageType, base64) => {
    if (section) {
      slideIndex += 1;
      let localImageIndex = 0;
      return section.replace(
        /(<img\b[^>]*?src=")data:image\/(png|jpeg);base64,([^"]+)("[^>]*>)/g,
        (imgMatch, prefix, type, data, suffix) => {
          localImageIndex += 1;
          const bytes = Buffer.from(data, "base64");
          const hash = createHash("sha256").update(bytes).digest("hex");
          let fileName = filesByHash.get(hash);
          if (!fileName) {
            const extension = type === "jpeg" ? "jpg" : "png";
            fileName = `slide-${String(slideIndex).padStart(2, "0")}-image-${String(localImageIndex).padStart(2, "0")}.${extension}`;
            filesByHash.set(hash, fileName);
            imageIndex += 1;
            writeFile(path.join(assetsDir, fileName), bytes);
          }
          return `${prefix}assets/${fileName}${suffix}`;
        },
      );
    }

    const bytes = Buffer.from(base64, "base64");
    const hash = createHash("sha256").update(bytes).digest("hex");
    let fileName = filesByHash.get(hash);
    if (!fileName) {
      const extension = imageType === "jpeg" ? "jpg" : "png";
      fileName = `shared-image-${String(imageIndex + 1).padStart(2, "0")}.${extension}`;
      filesByHash.set(hash, fileName);
      imageIndex += 1;
      writeFile(path.join(assetsDir, fileName), bytes);
    }
    return imageTag.replace(/data:image\/(png|jpeg);base64,[^"]+/, `assets/${fileName}`);
  },
);

html = html
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css" />')
  .replace(/<script>[\s\S]*?<\/script>/, '<script src="deck.js"></script>');

await Promise.all([
  writeFile(path.join(projectRoot, "index.html"), html),
  writeFile(path.join(projectRoot, "styles.css"), `${styleMatch[1].trim()}\n`),
  writeFile(path.join(projectRoot, "deck.js"), `${scriptMatch[1].trim()}\n`),
]);

console.log(`Created split deck with ${slideIndex} slides and ${filesByHash.size} unique images.`);
