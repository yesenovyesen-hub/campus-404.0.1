import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
let rejectNextWrite = false;
const TEST_DATE = new Date(2026, 9, 5);
values.set("chat_card_airpods", JSON.stringify([{ sender: "bot", text: "Старая история чата" }]));
values.set("campus404_seed_v1", "1");
values.set("campus404_seed_v2", "2");
values.set("campus404_seed_v3", "3");
values.set("campus404_seed_v4", "4");
values.set("campus404:data:v1", JSON.stringify({
  items: [
    { id: "seed-1", title: "Старая демо-карточка", category: "Другое", isOwn: false },
    { id: "own-card", title: "Моя карточка", category: "Книги", isOwn: true, ratings: [] }
  ],
  chats: {},
  activity: [],
  userName: "Алия",
  theme: "dark",
  unread: 0
}));
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

test("migrates older seed cards to local photos once", () => {
  assert.equal(store.getItems().filter((item) => !item.isOwn).length, 40);
  assert.equal(values.get("campus404_seed_v5"), "5");
  assert.equal(store.getItem("seed-1").imageFile, "assets/seed/airpods.jpg");
  assert.equal(store.getItem("seed-4").title, "Старинная книга в кожаном переплёте");
  assert.equal(store.getItem("seed-8").imageFile, "assets/seed/smartphone-blue-case.jpg");
  assert.equal(store.getItem("own-card").title, "Моя карточка");
});
test("migrates existing MVP chat history", () => {
  assert.equal(store.getChat("airpods")[0].text, "Старая история чата");
});
test("returns copies instead of exposing stored card references", () => {
  const card = store.getItems()[0];
  card.title = "mutated";
  assert.notEqual(store.getItem("seed-1").title, "mutated");
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
  assert.equal(store.removeItem("seed-1"), false);
});
test("deletes only own cards", () => {
  const item = store.saveItem({ title: "Ключи", location: "Холл", category: "Другое" }, TEST_DATE);
  assert.equal(store.removeItem(item.id), true);
  assert.equal(store.getItem(item.id), null);
});
test("stores and retrieves the profile name", () => {
  store.setName("Алия");
  assert.equal(store.getName(), "Алия");
});
test("stores and removes the profile avatar in the shared profile data", () => {
  const avatar = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  store.setName("Алия");
  store.setAvatar(avatar);
  assert.equal(store.getAvatar(), avatar);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).userAvatar, avatar);
  store.setAvatar(null);
  assert.equal(store.getAvatar(), "");
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).userName, "Алия");
});
test("rejects non-JPEG and oversized profile avatars", () => {
  assert.throws(() => store.setAvatar("data:image/png;base64,AAAA"), TypeError);
  assert.throws(() => store.setAvatar(`data:image/jpeg;base64,${"A".repeat(1_500_001)}`), TypeError);
});
test("failed avatar persistence keeps the previous avatar", () => {
  const avatar = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  store.setAvatar(avatar);
  rejectNextWrite = true;
  assert.throws(() => store.setAvatar("data:image/jpeg;base64,AAAA"), { name: "QuotaExceededError" });
  assert.equal(store.getAvatar(), avatar);
});
test("validates theme values", () => {
  assert.throws(() => store.setTheme("blue"), TypeError);
});
test("stores a chat without changing message text", () => {
  store.setChat("airpods", [{ sender: "user", text: "<b>hello</b>" }]);
  assert.equal(store.getChat("airpods")[0].text, "<b>hello</b>");
});
test("chat list contains only cards with a conversation", () => {
  store.setChat("seed-1", [{ sender: "bot", text: "Привет" }]);
  assert.equal(store.getChats().length, 1);
});
test("rejects ratings for own cards", () => {
  const item = store.saveItem({ title: "Ключи", location: "Холл", category: "Другое" }, TEST_DATE);
  assert.throws(() => store.addRating(item.id, { score: 5 }), /Нельзя оценить/);
});
test("accepts a rating for someone else's card and computes average", () => {
  store.addRating("seed-1", { score: 4, text: "Отлично" });
  store.addRating("seed-1", { score: 5 });
  assert.equal(store.getAverageRating("seed-1"), 4.5);
});
test("rating score must be from one to five", () => {
  assert.throws(() => store.addRating("seed-1", { score: 6 }), RangeError);
});
test("review text and image attachments are limited", () => {
  store.addRating("seed-1", { score: 5, text: "x".repeat(501), images: ["a", "b", "c", "d"] });
  const rating = store.getItem("seed-1").ratings.at(-1);
  assert.equal(rating.text.length, 500);
  assert.equal(rating.images.length, 3);
});
test("marking returned updates status and weekly activity", () => {
  const date = TEST_DATE;
  assert.equal(store.markReturned("seed-1", date), true);
  assert.equal(store.getItem("seed-1").status, "Возвращено");
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
test("already-returned card does not add duplicate activity", () => {
  const date = TEST_DATE;
  store.markReturned("seed-1", date);
  assert.equal(store.markReturned("seed-1", date), false);
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
test("quota failures roll back item and only newly recorded activity", () => {
  const date = TEST_DATE;
  store.markReturned("seed-1", date);
  rejectNextWrite = true;
  assert.throws(() => store.saveItem({ title: "Ручка", location: "Аудитория", category: "Другое" }, date), { name: "QuotaExceededError" });
  assert.equal(store.getItems().some((item) => item.title === "Ручка"), false);
  assert.deepEqual(store.getActivity(), ["2026-10-05"]);
});
