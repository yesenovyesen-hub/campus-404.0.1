import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildSeedCards, SEED_VERSION } from "../js/seed-cards.js";

const cards = buildSeedCards();

test("seed version five contains forty sequential cards", () => {
  assert.equal(SEED_VERSION, 5);
  assert.equal(cards.length, 40);
  assert.deepEqual(cards.map((card) => card.id), Array.from({ length: 40 }, (_, index) => `seed-${index + 1}`));
});

test("all cards have required data and valid category and status", () => {
  const categories = new Set(["Электроника", "Документы", "Одежда", "Книги", "Другое"]);
  for (const card of cards) {
    for (const field of ["title", "type", "category", "variant", "description", "location", "status", "time", "ownerName", "keywords"]) {
      assert.equal(typeof card[field], "string", `${card.id} ${field}`);
    }
    assert.ok(categories.has(card.category), card.id);
    assert.ok(["found", "returned"].includes(card.status), card.id);
    assert.equal(card.isOwn, false);
    assert.ok(card.description.length >= 60 && card.description.length <= 160, card.id);
  }
});

test("seed content covers required toys and valuable findings", () => {
  assert.ok(cards.some((card) => card.title === "Золотые часы"));
  assert.ok(cards.some((card) => card.title === "Золотая цепочка"));
  assert.ok(cards.some((card) => /Плюшевый мишка/.test(card.title)));
  assert.ok(cards.some((card) => /Плюшевый дракончик/.test(card.title)));
  assert.ok(cards.filter((card) => card.isValuable).length >= 6 && cards.filter((card) => card.isValuable).length <= 8);
  assert.ok(cards.filter((card) => card.variant === "toy").length >= 4 && cards.filter((card) => card.variant === "toy").length <= 5);
});

test("status and type distribution match the requested range", () => {
  assert.ok(cards.filter((card) => card.status === "returned").length >= 9);
  assert.ok(cards.filter((card) => card.status === "returned").length <= 11);
  assert.ok(new Set(cards.map((card) => card.type)).size >= 12);
});

test("cards use optional local image files only", () => {
  assert.ok(cards.every((card) => Object.hasOwn(card, "imageFile")));
  assert.ok(cards.every((card) => card.imageFile === null || /^assets\/seed\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(card.imageFile)));
  assert.ok(cards.every((card) => card.image === null));
  assert.ok(cards.filter((card) => card.imageFile).every((card) => existsSync(resolve(card.imageFile))));
});

test("keywords cover watch, gold and toy search", () => {
  const searchText = (card) => `${card.title} ${card.type} ${card.keywords} ${card.description} ${card.location} ${card.category}`.toLocaleLowerCase("ru");
  for (const query of ["часы", "золото", "игрушка"]) {
    assert.ok(cards.some((card) => searchText(card).includes(query)), query);
  }
});
