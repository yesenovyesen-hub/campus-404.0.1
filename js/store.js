import { getLocalDateKey, hasEarnedWeeklyBonus } from "./rewards.js";
import { buildSeedCards, SEED_VERSION } from "./seed-cards.js";

const STORAGE_KEY = "campus404:data:v1";
const SEED_FLAG = `campus404_seed_v${SEED_VERSION}`;
const AVATAR_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
const MAX_AVATAR_LENGTH = 1_500_000;

function readLegacyChats() {
  const chats = {};
  if (!Number.isInteger(localStorage.length) || typeof localStorage.key !== "function") return chats;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("chat_card_")) continue;
    const history = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(history)) throw new Error(`Старая история чата «${key}» имеет неверный формат.`);
    chats[key.slice("chat_card_".length)] = history
      .filter((message) => message && ["bot", "user"].includes(message.sender) && typeof message.text === "string")
      .map(({ sender, text }) => ({ sender, text }));
  }
  return chats;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacyChats = readLegacyChats();
    if (!raw) return { items: [], chats: legacyChats, activity: [], userName: "", userAvatar: "", theme: "", unread: 0 };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) throw new Error("Некорректный формат сохранённых данных Campus 404.");
    return { items: [], chats: legacyChats, activity: [], userName: "", userAvatar: "", theme: "", unread: 0, ...data, chats: { ...legacyChats, ...(data.chats || {}) } };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Не удалось прочитать сохранённые данные Campus 404.", { cause: error });
    throw error;
  }
}

let state = load();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function markActivity(date = new Date()) {
  const key = getLocalDateKey(date);
  if (!state.activity.includes(key)) state.activity.push(key);
}

export const store = {
  getItems() { return state.items.map((item) => ({ ...item, ratings: (item.ratings || []).map((rating) => ({ ...rating, images: [...(rating.images || [])] })) })); },
  getItem(id) { const item = state.items.find((entry) => entry.id === id); return item ? { ...item, ratings: (item.ratings || []).map((rating) => ({ ...rating, images: [...(rating.images || [])] })) } : null; },
  saveItem(item, date = new Date()) {
    if (!item || !item.title?.trim() || !item.location?.trim() || !item.category) throw new TypeError("Для публикации нужны название, место и категория.");
    const saved = { ...item, id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: item.title.trim(), location: item.location.trim(), ownerName: state.userName, status: item.status || "Найдено", isOwn: true, createdAt: "Только что", ratings: [] };
    const previousActivity = [...state.activity];
    state.items.unshift(saved);
    markActivity(date);
    try { persist(); } catch (error) { state.items.shift(); state.activity = previousActivity; throw error; }
    return { ...saved };
  },
  removeItem(id) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0 || !state.items[index].isOwn) return false;
    const [removed] = state.items.splice(index, 1);
    try { persist(); } catch (error) { state.items.splice(index, 0, removed); throw error; }
    return true;
  },
  setName(name) { const previous = state.userName; state.userName = name.trim(); try { persist(); } catch (error) { state.userName = previous; throw error; } },
  getName() { return state.userName; },
  getAvatar() {
    return typeof state.userAvatar === "string"
      && state.userAvatar.length <= MAX_AVATAR_LENGTH
      && AVATAR_DATA_URL.test(state.userAvatar)
      ? state.userAvatar
      : "";
  },
  setAvatar(avatar) {
    if (avatar !== null && (typeof avatar !== "string" || avatar.length > MAX_AVATAR_LENGTH || !AVATAR_DATA_URL.test(avatar))) {
      throw new TypeError("Аватар должен быть изображением JPEG допустимого размера.");
    }
    const previous = state.userAvatar;
    state.userAvatar = avatar || "";
    try { persist(); } catch (error) { state.userAvatar = previous; throw error; }
  },
  getTheme() { return state.theme; },
  setTheme(theme) { if (!["light", "dark"].includes(theme)) throw new TypeError("Неизвестная тема."); const previous = state.theme; state.theme = theme; try { persist(); } catch (error) { state.theme = previous; throw error; } },
  getChat(id) { return (state.chats[id] || []).map((message) => ({ ...message })); },
  getChats() { return Object.keys(state.chats).filter((id) => state.chats[id].length > 0).map((id) => ({ item: state.items.find((entry) => entry.id === id) || null, messages: state.chats[id].map((message) => ({ ...message })) })).filter((chat) => chat.item); },
  setChat(id, messages) {
    const previous = state.chats[id];
    state.chats[id] = messages.map(({ sender, text }) => ({ sender, text }));
    try { persist(); } catch (error) { if (previous) state.chats[id] = previous; else delete state.chats[id]; throw error; }
  },
  getUnread() { return state.unread; },
  setUnread(value) { const previous = state.unread; state.unread = Math.max(0, Number(value) || 0); try { persist(); } catch (error) { state.unread = previous; throw error; } },
  addRating(id, rating) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item || item.isOwn) throw new Error("Нельзя оценить собственную или неизвестную находку.");
    if (!Number.isInteger(rating.score) || rating.score < 1 || rating.score > 5) throw new RangeError("Оценка должна быть от 1 до 5.");
    item.ratings ||= [];
    item.ratings.push({ score: rating.score, text: String(rating.text || "").slice(0, 500), images: (rating.images || []).slice(0, 3), createdAt: new Date().toISOString() });
    try { persist(); } catch (error) { item.ratings.pop(); throw error; }
  },
  getAverageRating(id) { const ratings = state.items.find((item) => item.id === id)?.ratings || []; return ratings.length ? ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length : null; },
  markReturned(id, date = new Date()) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item || item.status === "Возвращено") return false;
    const oldStatus = item.status;
    const previousActivity = [...state.activity];
    item.status = "Возвращено";
    markActivity(date);
    try { persist(); } catch (error) { item.status = oldStatus; state.activity = previousActivity; throw error; }
    return true;
  },
  getActivity() { return [...state.activity]; },
  hasWeeklyBonus(date = new Date()) { return hasEarnedWeeklyBonus(state.activity, date); }
};

if (localStorage.getItem(SEED_FLAG) !== String(SEED_VERSION)) {
  const previousItems = state.items;
  state.items = [
    ...state.items.filter((item) => item.isOwn === true),
    ...buildSeedCards()
  ];
  try {
    persist();
    localStorage.setItem(SEED_FLAG, String(SEED_VERSION));
  } catch (error) {
    state.items = previousItems;
    throw error;
  }
}

export { STORAGE_KEY };
