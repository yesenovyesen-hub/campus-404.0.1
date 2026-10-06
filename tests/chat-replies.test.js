import test from "node:test";
import assert from "node:assert/strict";
import { classifyMessage, getChatReply } from "../js/chat-replies.js";
import { getPersona } from "../js/personas.js";
import { buildSeedCards } from "../js/seed-cards.js";

function cardFor(personaId) {
  return buildSeedCards().find((item) => getPersona(item).id === personaId);
}

test("classifies the requested chat intents and prioritizes specific questions", () => {
  assert.equal(classifyMessage("А вы где нашли?"), "location");
  assert.equal(classifyMessage("Нашли возле входа"), "location");
  assert.equal(classifyMessage("Это моя вещь"), "ownership");
  assert.equal(classifyMessage("Я потеряла пропуск"), "ownership");
  assert.equal(classifyMessage("Что это за вещь?"), "item");
  assert.equal(classifyMessage("Какого цвета?"), "item");
  assert.equal(classifyMessage("Спасибо!"), "thanks");
  assert.equal(classifyMessage("Добрый день"), "greeting");
  assert.equal(classifyMessage("Можно уточнить?"), "question");
  assert.equal(classifyMessage("Хорошо, понял"), "unknown");
});

test("location reply uses the card location and never invents one", () => {
  const detectiveCard = { ...cardFor("detective"), location: "Главный вход" };
  const reply = getChatReply("А вы где нашли?", detectiveCard);
  assert.match(reply, /Главный вход/);

  const missingLocation = getChatReply("Где нашли?", { ...detectiveCard, location: "" });
  assert.match(missingLocation, /место находки в карточке не указано/);
  assert.doesNotMatch(missingLocation, /библиотек|этаж|ресепшен/);
});

test("ownership, item, thanks, and persona-specific replies use the requested intent", () => {
  const helperCard = { ...cardFor("helper"), description: "Серьги найдены возле библиотеки." };
  assert.match(getChatReply("Это моя вещь", helperCard), /сверим|примет|детал/);
  assert.match(getChatReply("Что это?", helperCard), /Серьги найдены возле библиотеки/);
  assert.match(getChatReply("Спасибо", helperCard), /Не за что|Пожалуйста/);
  assert.match(getChatReply("А вы где нашли?", helperCard), /встреч/);
});

test("reply variants rotate deterministically from the existing conversation history", () => {
  const item = cardFor("detective");
  const first = getChatReply("Где нашли?", item, [{ sender: "user", text: "Где нашли?" }]);
  const second = getChatReply("Где нашли?", item, [
    { sender: "user", text: "Где нашли?" },
    { sender: "bot", text: first },
    { sender: "user", text: "А где нашли?" }
  ]);
  assert.notEqual(first, second);
  assert.equal(
    second,
    getChatReply("Где нашли?", item, [
      { sender: "user", text: "Где нашли?" },
      { sender: "bot", text: first },
      { sender: "user", text: "А где нашли?" }
    ])
  );
});
