import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getItemImage } from "../js/item-images.js";
import { buildSeedCards } from "../js/seed-cards.js";

test("known item names resolve to matching local photographs", () => {
  const matches = [
    [{ title: "Зачётная книжка" }, "assets/seed/gradebook.jpg"],
    [{ title: "Пропуск кампуса" }, "assets/seed/campus-pass.png"],
    [{ title: "Серебряные серьги" }, "assets/seed/silver-earrings.jpg"],
    [{ title: "Проездной билет" }, "assets/seed/transit-ticket.jpg"],
    [{ title: "Серый худи" }, "assets/seed/gray-hoodie.jpg"]
  ];

  for (const [item, expected] of matches) assert.equal(getItemImage(item), expected);
});

test("item matching considers type, description, and category", () => {
  assert.equal(getItemImage({ type: "Зачётная книжка" }), "assets/seed/gradebook.jpg");
  assert.equal(getItemImage({ description: "Нашёл серебряные серьги у аудитории." }), "assets/seed/silver-earrings.jpg");
  assert.equal(getItemImage({ title: "Серый худи", category: "Одежда" }), "assets/seed/gray-hoodie.jpg");
  assert.equal(getItemImage({ title: "Серый худи", category: "Книги" }), null);
  assert.equal(getItemImage({ category: "Электроника" }), null);
  assert.equal(getItemImage({ category: "Документы" }), null);
  assert.equal(getItemImage({ category: "Книги" }), null);
});

test("clothing without a matching item name keeps the icon placeholder", () => {
  assert.equal(getItemImage({ title: "Рюкзак с нашивкой", type: "Рюкзак", category: "Одежда" }), null);
  assert.equal(getItemImage({ title: "Часы", type: "Часы", category: "Другое" }), null);
  assert.equal(getItemImage({ title: "Плюшевый дракончик", variant: "toy" }), null);
});

test("user-provided image fields take precedence over automatic matching", () => {
  for (const field of ["image", "imageUrl", "photo", "photoUrl", "imageFile"]) {
    const customImage = `assets/custom/${field}.jpg`;
    assert.equal(getItemImage({ title: "Зачётная книжка", [field]: customImage }), customImage);
  }
  assert.equal(getItemImage({
    image: "assets/custom/upload.jpg",
    imageUrl: "assets/custom/url.jpg",
    imageFile: "assets/custom/seed.jpg"
  }), "assets/custom/upload.jpg");
});

test("automatic images are stable local files and unknown items use placeholders", () => {
  const knownImages = [
    "assets/seed/gradebook.jpg",
    "assets/seed/campus-pass.png",
    "assets/seed/silver-earrings.jpg",
    "assets/seed/transit-ticket.jpg",
    "assets/seed/gray-hoodie.jpg",
    "assets/seed/airpods.jpg",
    "assets/seed/gold-watch.jpg",
    "assets/seed/teddy-bear.jpg"
  ];

  for (const image of knownImages) assert.ok(existsSync(resolve(image)), image);
  assert.equal(getItemImage({ title: "Неизвестная вещь", category: "Другое" }), null);
  assert.equal(getItemImage({ title: "Ручка Parker", category: "Другое", isValuable: true }), null);
});

test("every seed image selection points to an existing local asset", () => {
  for (const item of buildSeedCards()) {
    const image = getItemImage(item);
    if (image === null) continue;
    assert.match(image, /^assets\/seed\//, item.title);
    assert.ok(existsSync(resolve(image)), `${item.title}: ${image}`);
  }
});

test("all 40 seed cards have a distinct local photo", () => {
  const cards = buildSeedCards();
  const imageFiles = cards.map((item) => item.imageFile);

  assert.equal(cards.length, 40);
  assert.ok(imageFiles.every((imageFile) => typeof imageFile === "string" && imageFile.length > 0));
  assert.equal(new Set(imageFiles).size, cards.length);

  const imageHashes = imageFiles.map((imageFile) => createHash("sha256")
    .update(readFileSync(resolve(imageFile)))
    .digest("hex"));
  assert.equal(new Set(imageHashes).size, cards.length);

  for (const item of cards) {
    assert.ok(existsSync(resolve(item.imageFile)), `${item.title}: ${item.imageFile}`);
    assert.equal(getItemImage(item), item.imageFile, item.title);
  }
});

test("every seed photo is listed in the photo credits", () => {
  const credits = readFileSync(resolve("docs/photo-credits.md"), "utf8");
  const creditedFiles = new Set(credits.split("\n")
    .map((line) => line.split("|")[1]?.trim().replaceAll("`", ""))
    .filter((path) => path?.startsWith("assets/seed/")));

  for (const card of buildSeedCards()) assert.ok(creditedFiles.has(card.imageFile), card.imageFile);
});
