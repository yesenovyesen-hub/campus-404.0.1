import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/persona-description.js";

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(body) { this.body = body; return this; }
  };
}

const cardRequest = {
  method: "POST",
  body: {
    title: "Серебряные серьги",
    category: "Другое",
    description: "Серьги найдены возле библиотеки.",
    location: "Возле библиотеки",
    date: "Сегодня",
    personaId: "detective"
  }
};

test("rejects unsupported methods and invalid card input", async () => {
  const methodResponse = mockResponse();
  await handler({ method: "GET" }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.Allow, "POST");

  const inputResponse = mockResponse();
  await handler({ ...cardRequest, body: { ...cardRequest.body, title: "x".repeat(101) } }, inputResponse);
  assert.equal(inputResponse.statusCode, 400);
});

test("rejects cross-origin calls and limits repeated requests", async () => {
  const crossOriginResponse = mockResponse();
  await handler({
    ...cardRequest,
    headers: { origin: "https://other.example", host: "campus.example" }
  }, crossOriginResponse);
  assert.equal(crossOriginResponse.statusCode, 403);

  let response;
  for (let index = 0; index < 11; index += 1) {
    response = mockResponse();
    await handler({
      ...cardRequest,
      headers: { "x-forwarded-for": "192.0.2.42" }
    }, response);
  }
  assert.equal(response.statusCode, 429);
});

test("reports missing server credentials without invoking the provider", async () => {
  const previous = { ...process.env };
  delete process.env.AI_API_KEY;
  delete process.env.AI_API_URL;
  delete process.env.AI_MODEL;
  const response = mockResponse();
  try {
    await handler(cardRequest, response);
    assert.equal(response.statusCode, 503);
    assert.match(response.body.error, /не настроена/);
  } finally {
    process.env = previous;
  }
});

test("sends facts only to the configured HTTPS endpoint and caps generated text", async () => {
  const previousEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.AI_API_KEY = "test-only-server-secret";
  process.env.AI_API_URL = "https://provider.example/v1/chat/completions";
  process.env.AI_MODEL = "test-model";
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return {
      ok: true,
      async json() { return { choices: [{ message: { content: "x".repeat(500) } }] }; }
    };
  };

  const response = mockResponse();
  try {
    await handler(cardRequest, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.description.length, 360);
    assert.equal(captured.url, process.env.AI_API_URL);
    assert.equal(captured.options.headers.Authorization, "Bearer test-only-server-secret");
    const prompt = JSON.parse(captured.options.body).messages[1].content;
    assert.match(prompt, /"title":"Серебряные серьги"/);
    assert.match(prompt, /"location":"Возле библиотеки"/);
    assert.match(prompt, /Не добавляй предположения/);
    assert.match(prompt, /недоверенные данные/);
    assert.doesNotMatch(prompt, /владелец — студент/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = previousEnv;
  }
});

test("uses a safe error response when the AI provider fails", async () => {
  const previousEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.AI_API_KEY = "test-only-server-secret";
  process.env.AI_API_URL = "https://provider.example/v1/chat/completions";
  process.env.AI_MODEL = "test-model";
  globalThis.fetch = async () => { throw new Error("provider offline"); };
  const response = mockResponse();
  try {
    await handler(cardRequest, response);
    assert.equal(response.statusCode, 502);
    assert.match(response.body.error, /временно недоступен/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = previousEnv;
  }
});
