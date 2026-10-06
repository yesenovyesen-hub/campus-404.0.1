import test from "node:test";
import assert from "node:assert/strict";
import { getPersona, PERSONAS } from "../js/personas.js";

test("defines twelve distinct persona types", () => {
  assert.equal(PERSONAS.length, 12);
  assert.equal(new Set(PERSONAS.map((persona) => persona.id)).size, 12);
  assert.deepEqual(PERSONAS.map((persona) => persona.name), [
    "Детектив", "Помощник", "Спокойный", "Шутник", "Организатор", "Заботливый",
    "Наблюдатель", "Срочный", "Студент", "Перфекционист", "Эко-активист", "Креативный"
  ]);
});

test("selects one stable persona for every card", () => {
  const card = { id: "seed-7", title: "Часы", location: "Библиотека" };
  assert.equal(getPersona(card).id, getPersona(card).id);
  for (let index = 0; index < 40; index += 1) {
    assert.ok(PERSONAS.some((persona) => persona.id === getPersona({ id: `seed-${index + 1}` }).id));
  }
  assert.equal(getPersona({}).id, getPersona({}).id);
});
