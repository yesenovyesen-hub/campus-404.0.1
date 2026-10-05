import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
let rejectNextWrite = false;
values.set("chat_card_airpods", JSON.stringify([{ sender: "bot", text: "Старая история чата" }]));
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] || null; },
  setItem(key, value) {
    if (rejectNextWrite) {
      rejectNextWrite = false;
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }
    values.set(key, String(value));
  },
  removeItem(key) { values.delete(key); }
};
const { store, STORAGE_KEY } = await import("../js/store.js");

test("seeds a useful set of lost-and-found cards once", () => {
  assert.ok(store.getItems().length >= 12);
  assert.equal(values.get("campus404_seed_v1"), "1");
  assert.equal(store.seedCards([{ id: "duplicate-seed", title: "Duplicate", category: "Другое" }]), false);
});
test("migrates existing MVP chat history", () => {
  assert.equal(store.getChat("airpods")[0].text, "Старая история чата");
});
test("returns copies instead of exposing stored card references", () => {
  const card = store.getItems()[0];
  card.title = "mutated";
  assert.notEqual(store.getItem("airpods").title, "mutated");
});
test("saving an item marks it as own and persists it", () => {
  store.setName("Алия");
  const item = store.saveItem({ title: "Ключи", location: "Холл", category: "Другое" }, new Date(2026, 9, 5));
  assert.equal(item.isOwn, true);
  assert.equal(item.ownerName, "Алия");
  assert.equal(store.getItem(item.id).title, "Ключи");
  assert.ok(values.has(STORAGE_KEY));
});
test("saving requires title, location and category", () => {
  assert.throws(() => store.saveItem({ title: "Ключи" }), TypeError);
});
test("cannot delete a sample item", () => {
  assert.equal(store.removeItem("airpods"), false);
});
test("deletes only own cards", () => {
  const item = store.saveItem({ title: "Ключи", location: "Холл", category: "Другое" });
  assert.equal(store.removeItem(item.id), true);
  assert.equal(store.getItem(item.id), null);
});
test("stores and retrieves the profile name", () => {
  store.setName("Алия");
  assert.equal(store.getName(), "Алия");
});
test("validates theme values", () => {
  assert.throws(() => store.setTheme("blue"), TypeError);
});
test("stores a chat without changing message text", () => {
  store.setChat("airpods", [{ sender: "user", text: "<b>hello</b>" }]);
  assert.equal(store.getChat("airpods")[0].text, "<b>hello</b>");
});
test("chat list contains only cards with a conversation", () => {
  store.setChat("airpods", [{ sender: "bot", text: "Привет" }]);
  assert.equal(store.getChats().length, 1);
});
test("rejects ratings for own cards", () => {
  const item = store.saveItem({ title: "Ключи", location: "Холл", category: "Другое" });
  assert.throws(() => store.addRating(item.id, { score: 5 }), /Нельзя оценить/);
});
test("accepts a rating for someone else's card and computes average", () => {
  store.addRating("airpods", { score: 4, text: "Отлично" });
  store.addRating("airpods", { score: 5 });
  assert.equal(store.getAverageRating("airpods"), 4.5);
});
test("rating score must be from one to five", () => {
  assert.throws(() => store.addRating("airpods", { score: 6 }), RangeError);
});
test("review text and image attachments are limited", () => {
  store.addRating("airpods", { score: 5, text: "x".repeat(501), images: ["a", "b", "c", "d"] });
  const rating = store.getItem("airpods").ratings.at(-1);
  assert.equal(rating.text.length, 500);
  assert.equal(rating.images.length, 3);
});
test("marking returned updates status and weekly activity", () => {
  const date = new Date(2026, 9, 5);
  assert.equal(store.markReturned("airpods", date), true);
  assert.equal(store.getItem("airpods").status, "Возвращено");
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
test("already-returned card does not add duplicate activity", () => {
  const date = new Date(2026, 9, 5);
  store.markReturned("airpods", date);
  assert.equal(store.markReturned("airpods", date), false);
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
test("quota failures roll back item and only newly recorded activity", () => {
  const date = new Date(2026, 9, 5);
  store.markReturned("airpods", date);
  rejectNextWrite = true;
  assert.throws(() => store.saveItem({ title: "Ручка", location: "Аудитория", category: "Другое" }, date), { name: "QuotaExceededError" });
  assert.equal(store.getItems().some((item) => item.title === "Ручка"), false);
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
