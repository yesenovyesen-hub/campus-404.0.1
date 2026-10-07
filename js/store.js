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
    if (!raw) {
      return {
        items: [],
        chats: legacyChats,
        activity: [],
        userName: "",
        userAvatar: "",
        userEmail: "",
        userPhone: "",
        theme: "",
        unread: 0,
        auctionLots: [],
        purchaseHistory: []
      };
    }
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) throw new Error("Некорректный формат сохранённых данных Campus 404.");
    return {
      items: [],
      chats: legacyChats,
      activity: [],
      userName: "",
      userAvatar: "",
      userEmail: "",
      userPhone: "",
      theme: "",
      unread: 0,
      auctionLots: [],
      purchaseHistory: [],
      ...data,
      chats: { ...legacyChats, ...(data.chats || {}) }
    };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Не удалось прочитать сохранённые данные Campus 404.", { cause: error });
    throw error;
  }
}

let state = load();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const DEMO_AUCTION_CATALOG_VERSION = 2;
const DEMO_AUCTION_LOTS = [
  {
    id: "auction-demo-headphones",
    title: "Беспроводные наушники",
    category: "Электроника",
    type: "Электроника",
    description: "Аккуратные беспроводные наушники, готовы к использованию.",
    location: "Корпус Б, холл",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/airpods.jpg",
    auctionDemo: true,
    auctionStartPrice: 5000,
    auctionCurrentPrice: 5000,
    auctionBidIncrement: 500,
    auctionBidCount: 3,
    auctionWinner: "Али",
    foundAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ratings: []
  },
  {
    id: "auction-demo-over-ear-headphones",
    title: "Наушники с оголовьем",
    category: "Электроника",
    type: "Наушники",
    description: "Накладные наушники в хорошем состоянии.",
    location: "Медиатека",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/over-ear-headphones.jpg",
    auctionDemo: true,
    auctionStartPrice: 5000,
    auctionCurrentPrice: 5000,
    auctionBidIncrement: 500,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-smartphone",
    title: "Смартфон в красном чехле",
    category: "Электроника",
    type: "Смартфон",
    description: "Смартфон в красном защитном чехле.",
    location: "Коворкинг, 1 этаж",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/smartphone-red-case.jpg",
    auctionDemo: true,
    auctionStartPrice: 5000,
    auctionCurrentPrice: 5000,
    auctionBidIncrement: 500,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-power-bank",
    title: "Пауэрбанк",
    category: "Электроника",
    type: "Внешний аккумулятор",
    description: "Компактный внешний аккумулятор с кабелем.",
    location: "Аудитория 118",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/powerbank.jpg",
    auctionDemo: true,
    auctionStartPrice: 5000,
    auctionCurrentPrice: 5000,
    auctionBidIncrement: 500,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-memory-card",
    title: "Карта памяти",
    category: "Электроника",
    type: "Карта памяти",
    description: "Карта памяти в защитном футляре.",
    location: "Компьютерный класс",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/memory-card.jpg",
    auctionDemo: true,
    auctionStartPrice: 5000,
    auctionCurrentPrice: 5000,
    auctionBidIncrement: 500,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-backpack",
    title: "Рюкзак",
    category: "Одежда",
    type: "Рюкзак",
    description: "Вместительный рюкзак с несколькими отделениями.",
    location: "Главный корпус",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/backpack.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-hoodie",
    title: "Серый худи",
    category: "Одежда",
    type: "Худи",
    description: "Серый худи среднего размера, без повреждений.",
    location: "Аудитория 204",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/gray-hoodie.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2200,
    auctionBidIncrement: 200,
    auctionBidCount: 2,
    auctionWinner: "Марина",
    foundAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    ratings: []
  },
  {
    id: "auction-demo-scarf",
    title: "Синий шарф",
    category: "Одежда",
    type: "Шарф",
    description: "Тёплый вязаный шарф насыщенного синего цвета.",
    location: "Холл, корпус Б",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/blue-scarf.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-gloves",
    title: "Чёрные перчатки",
    category: "Одежда",
    type: "Перчатки",
    description: "Пара тёплых чёрных перчаток.",
    location: "Раздевалка спортзала",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/black-gloves-pair.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-umbrella",
    title: "Зонт",
    category: "Другое",
    type: "Зонт",
    description: "Складной зонт с чехлом.",
    location: "Вход в корпус А",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/closed-umbrella.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-book",
    title: "Учебник",
    category: "Книги",
    type: "Книги",
    description: "Учебник по математике, почти новый.",
    location: "Библиотека, второй этаж",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/biology-survey-book.jpg",
    auctionDemo: true,
    auctionStartPrice: 1000,
    auctionCurrentPrice: 1100,
    auctionBidIncrement: 100,
    auctionBidCount: 1,
    auctionWinner: "Данил",
    foundAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    ratings: []
  },
  {
    id: "auction-demo-architecture-book",
    title: "Книга по архитектуре ПО",
    category: "Книги",
    type: "Книга",
    description: "Книга по проектированию программных систем.",
    location: "Читальный зал",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/clean-architecture-book.jpg",
    auctionDemo: true,
    auctionStartPrice: 1000,
    auctionCurrentPrice: 1000,
    auctionBidIncrement: 100,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-planner",
    title: "Ежедневник",
    category: "Книги",
    type: "Планер",
    description: "Небольшой ежедневник с чистыми страницами.",
    location: "Аудитория 302",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/daily-planner.jpg",
    auctionDemo: true,
    auctionStartPrice: 1000,
    auctionCurrentPrice: 1000,
    auctionBidIncrement: 100,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-notebook",
    title: "Лекционная тетрадь",
    category: "Книги",
    type: "Тетрадь",
    description: "Тетрадь с записями лекций.",
    location: "Лекционный зал",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/lecture-notebook.jpg",
    auctionDemo: true,
    auctionStartPrice: 1000,
    auctionCurrentPrice: 1000,
    auctionBidIncrement: 100,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-mug",
    title: "Термокружка",
    category: "Другое",
    type: "Кружка",
    description: "Термокружка с крышкой для напитков.",
    location: "Столовая",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/thermal-travel-mug.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-wallet",
    title: "Кожаный кошелёк",
    category: "Другое",
    type: "Кошелёк",
    description: "Кожаный кошелёк без документов и наличных.",
    location: "Холл главного корпуса",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/leather-wallet.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-guitar",
    title: "Акустическая гитара",
    category: "Другое",
    type: "Музыкальный инструмент",
    description: "Акустическая гитара в хорошем состоянии.",
    location: "Актовый зал",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/acoustic-guitar.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-skateboard",
    title: "Скейтборд",
    category: "Другое",
    type: "Спортивный инвентарь",
    description: "Скейтборд с целой декой и колёсами.",
    location: "Спортивная площадка",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/skateboard.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-tennis-racket",
    title: "Теннисная ракетка",
    category: "Другое",
    type: "Спортивный инвентарь",
    description: "Теннисная ракетка с защитным чехлом.",
    location: "Спортзал",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/tennis-racket.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-fountain-pen",
    title: "Перьевая ручка",
    category: "Другое",
    type: "Ручка",
    description: "Перьевая ручка в индивидуальном футляре.",
    location: "Аудитория 205",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/parker-fountain-pen.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  },
  {
    id: "auction-demo-glasses-case",
    title: "Футляр для очков",
    category: "Другое",
    type: "Аксессуар",
    description: "Жёсткий футляр для хранения очков.",
    location: "Кабинет 114",
    ownerName: "Campus 404",
    status: "AUCTION_ACTIVE",
    isOwn: false,
    image: "assets/seed/eyeglasses-case.jpg",
    auctionDemo: true,
    auctionStartPrice: 2000,
    auctionCurrentPrice: 2000,
    auctionBidIncrement: 200,
    auctionBidCount: 0,
    auctionWinner: "",
    ratings: []
  }
];

function createDemoAuctionLots(previousLots = []) {
  const now = Date.now();
  const previousById = new Map(previousLots.filter((lot) => lot?.auctionDemo).map((lot) => [lot.id, lot]));
  const selected = DEMO_AUCTION_LOTS.slice(0, 3);
  return selected.map((lot) => ({
    ...lot,
    foundAt: previousById.get(lot.id)?.foundAt || lot.foundAt || new Date(now).toISOString(),
    createdAt: previousById.get(lot.id)?.createdAt || lot.createdAt || new Date(now).toISOString(),
    auctionCurrentPrice: previousById.get(lot.id)?.auctionCurrentPrice ?? lot.auctionCurrentPrice,
    auctionBidCount: previousById.get(lot.id)?.auctionBidCount ?? lot.auctionBidCount,
    auctionWinner: previousById.get(lot.id)?.auctionWinner ?? lot.auctionWinner,
    auctionStartAt: previousById.get(lot.id)?.auctionStartAt ?? now,
    auctionEndAt: previousById.get(lot.id)?.auctionEndAt ?? now + 30 * 1000,
    status: previousById.get(lot.id)?.status || "AUCTION_ACTIVE",
    auctionBidHistory: Array.isArray(previousById.get(lot.id)?.auctionBidHistory)
      ? previousById.get(lot.id).auctionBidHistory.map((bid) => ({ ...bid }))
      : (Number(lot.auctionBidCount || 0) > 0 ? [{ bidderName: lot.auctionWinner || "Али", amount: Number(lot.auctionCurrentPrice || 0), at: now }] : []),
    auctionFinalPrice: previousById.get(lot.id)?.auctionFinalPrice ?? (Number(lot.auctionBidCount || 0) > 0 ? Number(lot.auctionCurrentPrice || 0) : 0)
  }));
}

function ensureDemoAuctionLots() {
  const previousLots = Array.isArray(state.auctionLots) ? state.auctionLots : [];
  const previousVersion = state.auctionDemoCatalogVersion;
  state.auctionLots = createDemoAuctionLots(previousLots);
  state.auctionDemoCatalogVersion = DEMO_AUCTION_CATALOG_VERSION;
  try {
    persist();
  } catch (error) {
    state.auctionLots = previousLots;
    state.auctionDemoCatalogVersion = previousVersion;
    throw error;
  }
}

function markActivity(date = new Date()) {
  const key = getLocalDateKey(date);
  if (!state.activity.includes(key)) state.activity.push(key);
}

export const store = {
  getItems() { return state.items.map((item) => ({ ...item, ratings: (item.ratings || []).map((rating) => ({ ...rating, images: [...(rating.images || [])] })) })); },
  refreshAuctionData(rawData) {
    const data = JSON.parse(rawData);
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.auctionLots)) {
      throw new Error("Некорректные данные аукциона в локальном хранилище.");
    }
    state.items = data.items;
    state.auctionLots = data.auctionLots;
  },
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
  setEmail(email) { const previous = state.userEmail || ""; const next = String(email || "").trim(); state.userEmail = next; try { persist(); } catch (error) { state.userEmail = previous; throw error; } },
  getEmail() { return state.userEmail || ""; },
  setPhone(phone) { const previous = state.userPhone || ""; const next = String(phone || "").trim(); state.userPhone = next; try { persist(); } catch (error) { state.userPhone = previous; throw error; } },
  getPhone() { return state.userPhone || ""; },
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
  syncAuctionState(now = Date.now()) {
    const finalizeLot = (lot) => {
      if (!lot || !lot.id || !lot.auctionEndAt || !lot.status || ["AUCTION_SOLD", "AUCTION_EXPIRED"].includes(String(lot.status))) return false;
      const isActive = String(lot.status).trim() === "AUCTION_ACTIVE";
      const endAt = Number(lot.auctionEndAt || 0);
      if (!isActive || Number.isNaN(endAt) || now < endAt) return false;
      const winner = String(lot.auctionWinner || "").trim();
      const bids = Array.isArray(lot.auctionBidHistory) ? lot.auctionBidHistory : [];
      const current = Number(lot.auctionCurrentPrice ?? lot.auctionStartPrice ?? 0);
      const maxBid = bids.reduce((largest, bid) => Math.max(largest, Number(bid?.amount ?? 0)), current);
      const winnerName = bids.length ? bids.reduce((best, bid) => (Number(bid?.amount ?? 0) > Number(best?.amount ?? 0) ? bid : best), bids[0])?.bidderName || winner : winner;
      if (bids.length > 0 || Number(lot.auctionBidCount || 0) > 0) {
        lot.auctionWinner = winnerName;
        lot.auctionCurrentPrice = maxBid;
        lot.auctionFinalPrice = maxBid;
        lot.status = "AUCTION_SOLD";
        const historyKey = `${lot.id}`;
        if (!state.purchaseHistory.includes(winnerName)) state.purchaseHistory.push(winnerName);
        if (!state.chats[historyKey]) state.chats[historyKey] = [];
        const firstPurchase = state.purchaseHistory.filter((name) => name === winnerName).length === 1;
        const systemMessage = firstPurchase
          ? "Поздравляем с приобретенной вещью!\nВам предоставляется подарок в виде именной кофты, укажите ваш адрес доставки."
          : "Поздравляем с приобретенной вещью!";
        const hasSystemMessage = (state.chats[historyKey] || []).some((message) => message.text === systemMessage);
        if (!hasSystemMessage) state.chats[historyKey].push({ sender: "bot", text: systemMessage });
      } else {
        lot.status = "AUCTION_EXPIRED";
        lot.auctionWinner = "";
        lot.auctionFinalPrice = 0;
      }
      return true;
    };

    let changed = false;
    for (const item of state.items) {
      if (!item || !item.category || item.category === "Документы") continue;
      const normalized = String(item.status ?? "").trim();
      if (["Возвращено", "returned"].includes(normalized)) continue;
      const startTime = item.foundAt ? new Date(item.foundAt).getTime() : new Date(item.createdAt || Date.now()).getTime();
      const auctionStartAt = Number(item.auctionStartAt ?? (Number.isFinite(startTime) ? startTime + 21 * 24 * 60 * 60 * 1000 : 0));
      const auctionEndAt = Number(item.auctionEndAt ?? (auctionStartAt ? auctionStartAt + 30 * 1000 : 0));
      let nextStatus = normalized;
      if (now >= auctionEndAt) {
        nextStatus = Number(item.auctionBidCount || 0) > 0 ? "AUCTION_SOLD" : "AUCTION_EXPIRED";
      } else if (now >= auctionStartAt) {
        nextStatus = "AUCTION_ACTIVE";
      }
      if (nextStatus !== normalized) {
        item.status = nextStatus;
        item.auctionStartAt = auctionStartAt || now;
        item.auctionEndAt = auctionEndAt || now + 30 * 1000;
        changed = true;
      }
      if (item.status === "AUCTION_ACTIVE" && now >= Number(item.auctionEndAt || 0)) {
        const sold = Number(item.auctionBidCount || 0) > 0;
        item.status = sold ? "AUCTION_SOLD" : "AUCTION_EXPIRED";
        item.auctionWinner = sold ? (item.auctionWinner || "") : "";
        item.auctionFinalPrice = sold ? Number(item.auctionCurrentPrice ?? 0) : 0;
        changed = true;
      }
    }
    for (const lot of state.auctionLots || []) {
      if (finalizeLot(lot)) changed = true;
    }
    if (changed) {
      try { persist(); } catch (error) { throw error; }
    }
    return changed;
  },
  getAuctionLots(now = Date.now()) {
    const normalized = (list = []) => (list || []).map((item) => {
      if (!item) return item;
      const auctionStartAt = Number(item.auctionStartAt ?? now);
      const auctionEndAt = Number(item.auctionEndAt ?? now + 30 * 1000);
      const auctionBidCount = Number(item.auctionBidCount || 0);
      const auctionCurrentPrice = Number(item.auctionCurrentPrice ?? item.auctionStartPrice ?? 0);
      const auctionStartPrice = Number(item.auctionStartPrice ?? item.startPrice ?? (auctionCurrentPrice || 0));
      return {
        ...item,
        image: item.image || item.imageFile || "",
        auctionStartAt,
        auctionEndAt,
        auctionCurrentPrice,
        auctionBidCount,
        auctionBidIncrement: Number(item.auctionBidIncrement || 200),
        auctionStartPrice,
        auctionWinner: item.auctionWinner || "",
        status: String(item.status || "").trim() || "AUCTION_ACTIVE"
      };
    });

    const demoLots = normalized(state.auctionLots).filter((item) => item && item.auctionDemo && !["AUCTION_SOLD", "AUCTION_EXPIRED"].includes(String(item.status || "")));
    const regularLots = this.getItems().filter((item) => {
      if (!item || item.category === "Документы") return false;
      const status = String(item.status || "").trim();
      if (["Возвращено", "returned"].includes(status)) return false;
      if (["AUCTION_ACTIVE"].includes(status)) return true;
      const startTime = item.foundAt ? new Date(item.foundAt).getTime() : new Date(item.createdAt || Date.now()).getTime();
      if (!Number.isFinite(startTime)) return false;
      const auctionStartAt = Number(item.auctionStartAt ?? startTime + 21 * 24 * 60 * 60 * 1000);
      const auctionEndAt = Number(item.auctionEndAt ?? auctionStartAt + 30 * 1000);
      return now >= auctionStartAt && now < auctionEndAt;
    }).map((item) => ({
      ...item,
      image: item.image || item.imageFile || "",
      auctionStartAt: Number(item.auctionStartAt ?? (item.foundAt ? new Date(item.foundAt).getTime() + 21 * 24 * 60 * 60 * 1000 : now)),
      auctionEndAt: Number((item.auctionEndAt ?? ((item.foundAt ? new Date(item.foundAt).getTime() : now) + 21 * 24 * 60 * 60 * 1000)) + 30 * 1000),
      auctionCurrentPrice: Number(item.auctionCurrentPrice ?? item.startPrice ?? 0),
      auctionBidCount: Number(item.auctionBidCount || 0),
      auctionBidIncrement: Number(item.auctionBidIncrement || 200),
      auctionStartPrice: Number(item.auctionStartPrice ?? item.startPrice ?? 0),
      status: String(item.status || "").trim() || "AUCTION_ACTIVE"
    }));

    const seen = new Set();
    const seenTitles = new Set();
    const seenImages = new Set();
    return [...demoLots, ...regularLots].filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      const title = String(item.title || "").trim().toLocaleLowerCase("ru");
      const image = String(item.image || "").trim();
      if (!title || !image || seenTitles.has(title) || seenImages.has(image)) return false;
      seen.add(item.id);
      seenTitles.add(title);
      seenImages.add(image);
      return true;
    });
  },
  placeAuctionBid(id, amount, bidderName = "Гость") {
    const demoLot = Array.isArray(state.auctionLots) ? state.auctionLots.find((entry) => entry.id === id) : null;
    const item = demoLot || state.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Лот не найден.");
    if (item.category === "Документы") throw new Error("Документы не участвуют в аукционе.");
    if (["AUCTION_SOLD", "AUCTION_EXPIRED"].includes(String(item.status || ""))) throw new Error("Аукцион для этого лота уже завершён.");

    const now = Date.now();
    const currentBidHistory = Array.isArray(item.auctionBidHistory) ? item.auctionBidHistory : [];
    const current = currentBidHistory.length
      ? currentBidHistory.reduce((max, bid) => Math.max(max, Number(bid?.amount ?? 0)), Number(item.auctionCurrentPrice ?? item.auctionStartPrice ?? 0))
      : Number(item.auctionCurrentPrice ?? item.auctionStartPrice ?? 0);
    const minimum = Number(item.auctionBidIncrement || 200);
    const nextAmount = Number(amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= current) {
      throw new RangeError("Ставка должна быть выше текущей цены.");
    }
    if (nextAmount < current + minimum) {
      throw new RangeError(`Минимальная ставка — ${current + minimum}.`);
    }

    const startTime = item.foundAt ? new Date(item.foundAt).getTime() : new Date(item.createdAt || Date.now()).getTime();
    const auctionStartAt = Number(item.auctionStartAt ?? (Number.isFinite(startTime) ? startTime + 21 * 24 * 60 * 60 * 1000 : now));
    const auctionEndAt = Number(item.auctionEndAt ?? (auctionStartAt + 30 * 1000));
    if (now < auctionStartAt || now > auctionEndAt) throw new Error("Ставки доступны только во время активного аукциона.");

    const previous = {
      status: item.status,
      auctionCurrentPrice: item.auctionCurrentPrice,
      auctionBidCount: item.auctionBidCount,
      auctionWinner: item.auctionWinner,
      auctionStartAt: item.auctionStartAt,
      auctionEndAt: item.auctionEndAt,
      auctionBidHistory: Array.isArray(item.auctionBidHistory) ? item.auctionBidHistory.map((bid) => ({ ...bid })) : []
    };
    item.status = "AUCTION_ACTIVE";
    item.auctionCurrentPrice = nextAmount;
    item.auctionBidCount = Number(item.auctionBidCount || 0) + 1;
    item.auctionWinner = bidderName;
    item.auctionStartAt = auctionStartAt;
    item.auctionEndAt = auctionEndAt;
    item.auctionBidHistory = [...currentBidHistory, { bidderName, amount: nextAmount, at: now }];
    item.auctionFinalPrice = nextAmount;
    try { persist(); } catch (error) { Object.assign(item, previous); throw error; }
    return { ...item, auctionBidHistory: item.auctionBidHistory.map((bid) => ({ ...bid })) };
  },
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

ensureDemoAuctionLots();

export { STORAGE_KEY };
