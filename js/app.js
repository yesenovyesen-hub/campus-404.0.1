import { CATEGORIES, REWARDS, REQUIRED_ACTIVE_DAYS } from "./constants.js";
import { renderEditor as mountEditor } from "./editor.js";
import { createCardImage, initImagePicker } from "./image-upload.js";
import { getWeekProgress } from "./rewards.js";
import { store } from "./store.js";

const app = document.querySelector("#app-view");
const searchInput = document.querySelector("#search-input");
const drawer = document.querySelector("#menu-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const toast = document.querySelector("#toast");
const chatModal = document.querySelector("#chatModal");
const chatMessages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatSend = document.querySelector("#chatSend");
const typingIndicator = document.querySelector("#typingIndicator");
const categoryOptions = document.querySelector("#category-options");
const toastTimeout = { id: 0 };
let activeItem = null;
let activeHistory = [];
let pendingReplies = 0;
let selectedCategory = "all";
let activeView = "feed";
let drawerCloseTimeout;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(label, text = "×") {
  const button = element("button", "icon-button", text);
  button.type = "button";
  button.setAttribute("aria-label", label);
  return button;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout.id);
  toastTimeout.id = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function reportStorageError(error) {
  if (error?.name === "QuotaExceededError") {
    showToast("Хранилище браузера заполнено. Удалите старые изображения или объявления; данные формы сохранены.");
  } else {
    showToast(`Не удалось сохранить данные: ${error.message}`);
  }
}

function applyTheme() {
  const preference = store.getTheme() || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = preference;
  const toggle = document.querySelector("#theme-switch");
  toggle.setAttribute("aria-checked", String(preference === "light"));
}

function updateIdentity() {
  const name = store.getName();
  document.querySelector("#avatar-letter").textContent = name ? [...name][0].toLocaleUpperCase("ru") : "?";
}

function renderCategories() {
  categoryOptions.replaceChildren();
  for (const [value, label] of [["all", "Все"], ...CATEGORIES.map((category) => [category, category])]) {
    const button = element("button", "category-option", label);
    button.type = "button";
    button.dataset.category = value;
    button.addEventListener("click", () => {
      selectedCategory = value;
      updateCategorySelection();
      document.querySelector("#category-toggle").setAttribute("aria-expanded", "false");
      categoryOptions.hidden = true;
      closeDrawer();
      searchInput.value = "";
      navigate("/");
      renderRoute();
    });
    categoryOptions.append(button);
  }
  updateCategorySelection();
}

function updateCategorySelection() {
  categoryOptions.querySelectorAll(".category-option").forEach((button) => {
    const selected = button.dataset.category === selectedCategory;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    if (selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

function updateNavigationState(route = decodeURIComponent(location.hash.replace(/^#\/?/, ""))) {
  if (drawer?.classList.contains("is-open")) {
    activeView = "menu";
  } else if (route === "profile") {
    activeView = "profile";
  } else if (route === "chats") {
    activeView = "chats";
  } else if (["add", "edit", "sell"].includes(route)) {
    activeView = "add";
  } else {
    activeView = "feed";
  }

  document.querySelectorAll(".bottom-nav [data-route]").forEach((button) => {
    const isActive = button.dataset.route === activeView;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function averageText(item) {
  const average = store.getAverageRating(item.id);
  const score = average ?? item.rating ?? null;
  return score === null ? "Пока без оценок" : `★ ${score.toFixed(1)} · ${item.ratings.length || 1} ${(item.ratings.length || 1) === 1 ? "оценка" : "оценок"}`;
}

function iconForItem(item) {
  const titleAndType = `${item.title} ${item.type}`.toLocaleLowerCase("ru");
  if (/часы/.test(titleAndType)) return "fa-clock";
  if (/золото|кольцо|серьг|медальон|цепоч|украш/.test(titleAndType)) return "fa-gem";
  if (/игруш|мишк|заяц|дракон|кукл|капибар/.test(titleAndType)) return "fa-heart";
  if (/билет|книж|пропуск|документ|проездн/.test(titleAndType)) return "fa-id-card";
  if (/airpods|наушник|гарнитур/.test(titleAndType)) return "fa-headphones";
  if (/смартфон|телефон/.test(titleAndType)) return "fa-mobile-screen-button";
  if (/power bank|пауэрбанк|аккумулятор|зарядк/.test(titleAndType)) return "fa-battery-full";
  if (/шарф/.test(titleAndType)) return "fa-snowflake";
  if (/худи|толстовк|кофт|перчатк/.test(titleAndType)) return "fa-shirt";
  if (/книг|учебник|тетрад|ежедневник/.test(titleAndType)) return "fa-book-open";
  if (/ключ/.test(titleAndType)) return "fa-key";
  if (/очк/.test(titleAndType)) return "fa-glasses";
  if (/зонт/.test(titleAndType)) return "fa-umbrella";
  if (/рюкзак/.test(titleAndType)) return "fa-suitcase";
  if (/ракетк/.test(titleAndType)) return "fa-baseball";
  if (/скейт/.test(titleAndType)) return "fa-person-snowboarding";
  if (/гитар/.test(titleAndType)) return "fa-guitar";
  if (/кружк|термос/.test(titleAndType)) return "fa-mug-hot";
  if (/ручк/.test(titleAndType)) return "fa-pen";
  return "fa-box";
}

function makeCard(item, index) {
  const card = element("article", "item-card");
  const variant = ["value", "toy", "doc", "tech", "cloth", "book", "misc"].includes(item.variant) ? item.variant : "misc";
  card.classList.add(`item-card--${variant}`);
  if ((index + 1) % 5 === 0) card.classList.add("item-card--wide");
  card.dataset.cardId = item.id;
  card.dataset.ownerName = item.ownerName;
  card.dataset.category = item.category;
  card.dataset.search = `${item.title} ${item.type || ""} ${item.keywords || ""} ${item.description || ""} ${item.location} ${item.category}`.toLocaleLowerCase("ru");

  const imageBox = createCardImage(item, iconForItem(item));
  imageBox.classList.add(`item-image--${variant}`);
  const imageLabel = element("span", "image-index", item.isOwn ? "МОЯ НАХОДКА" : "НАХОДКА");
  imageBox.append(imageLabel);
  if (item.isValuable) {
    const valuable = element("span", "item-ribbon item-ribbon--value");
    valuable.append(element("i", "fa-solid fa-gem"), document.createTextNode(" Ценная находка"));
    valuable.firstChild.setAttribute("aria-hidden", "true");
    imageBox.append(valuable);
  } else if (variant === "doc") {
    const documentBadge = element("span", "item-ribbon item-ribbon--doc");
    documentBadge.append(element("i", "fa-solid fa-id-card"), document.createTextNode(" Документ"));
    documentBadge.firstChild.setAttribute("aria-hidden", "true");
    imageBox.append(documentBadge);
  }
  if (item.isOwn) {
    const remove = iconButton(`Удалить объявление «${item.title}»`, "⌫");
    remove.className = "remove-item";
    remove.addEventListener("click", () => {
      try {
        if (store.removeItem(item.id)) {
          showToast("Объявление удалено");
          renderRoute();
        }
      } catch (error) { reportStorageError(error); }
    });
    imageBox.append(remove);
  }

  const info = element("div", "item-info");
  const titleRow = element("div", "item-title-row");
  titleRow.append(element("h3", "", item.title));
  const isReturned = item.status === "returned" || item.status === "Возвращено";
  const status = element("span", `status ${isReturned ? "status-returned" : "status-found"}`, isReturned ? "Возвращено" : "Найдено");
  titleRow.append(status);
  const type = element("p", "item-type", item.type || item.category);
  const place = element("p", "item-location", `⌖ ${item.location}`);
  const meta = element("div", "item-meta");
  meta.append(element("span", "category-tag", item.category), element("time", "", item.time || item.createdAt || ""));
  info.append(titleRow, type);
  if (item.description) info.append(element("p", "item-description", item.description));
  info.append(place, meta, element("p", "rating-summary", averageText(item)));

  const actions = element("div", "card-actions");
  const contact = element("button", "contact-button", "Написать");
  contact.type = "button";
  contact.addEventListener("click", () => openChat(item.id));
  actions.append(contact);
  if (!item.isOwn) {
    const review = element("button", "text-button", "Оценить");
    review.type = "button";
    review.addEventListener("click", () => navigate(`/review/${encodeURIComponent(item.id)}`));
    actions.append(review);
  }
  if (!isReturned) {
    const returned = element("button", "text-button", "Отметить как возвращено");
    returned.type = "button";
    returned.addEventListener("click", () => {
      try {
        if (store.markReturned(item.id)) {
          showToast("Вещь отмечена как возвращённая. Активность учтена!");
          renderRoute();
        }
      } catch (error) { reportStorageError(error); }
    });
    actions.append(returned);
  }
  info.append(actions);
  card.append(imageBox, info);
  return card;
}

function renderFeed() {
  app.className = "page-layout feed-page";
  const heading = element("div", "content-topline");
  const title = element("div");
  title.append(element("p", "eyebrow", "БЮРО НАХОДОК · КОРПУС А"));
  const h1 = element("h1");
  h1.append(document.createTextNode("Потерялось? "), element("span", "", "Найдётся."));
  title.append(h1);
  const items = store.getItems().filter((item) => {
    const query = searchInput.value.trim().toLocaleLowerCase("ru");
    return (selectedCategory === "all" || item.category === selectedCategory)
      && `${item.title} ${item.type || ""} ${item.keywords || ""} ${item.description || ""} ${item.location} ${item.category}`.toLocaleLowerCase("ru").includes(query);
  });
  const count = element("div", "results-count");
  count.append(element("strong", "", String(items.length)), document.createTextNode(` ${items.length === 1 ? "объявление" : "объявлений"}`));
  heading.append(title, count);
  const feedHeading = element("div", "feed-heading");
  feedHeading.append(element("h2", "", "Последние находки"), element("span", "", "Обновлено недавно"));
  const grid = element("div", "items-grid");
  grid.id = "items-grid";
  items.forEach((item, index) => grid.append(makeCard(item, index)));
  app.append(heading, feedHeading, grid);
  if (!items.length) app.append(element("p", "empty-state", "Ничего не нашлось. Попробуйте изменить запрос или категорию."));
}

function renderAddPage() {
  app.className = "page-layout subpage";
  app.append(element("p", "eyebrow", "НОВОЕ ОБЪЯВЛЕНИЕ"), element("h1", "", "Чем помочь кампусу?"));
  const choices = element("div", "choice-grid");
  const found = element("a", "choice-card", "Создать анкету с найденной пропавшей вещью");
  found.href = "#/edit";
  found.append(element("span", "choice-mark", "+"));
  const sell = element("a", "choice-card", "Продать найденную вещь");
  sell.href = "#/sell";
  sell.append(element("span", "choice-mark", "↗"));
  choices.append(found, sell);
  app.append(choices);
}

function renderSellPage() {
  app.className = "page-layout sell-page";
  const image = document.createElement("img");
  image.id = "sell-meme";
  image.alt = "Юмористическая иллюстрация о продаже найденной вещи";
  fetch("assets/sell-meme.png")
    .then((response) => {
    if (!response.ok) throw new Error("Файл assets/sell-meme.png не найден.");
    image.src = "assets/sell-meme.png";
    })
    .catch(() => {
    image.hidden = true;
    if (app.querySelector(".empty-state")) return;
    const notice = element("p", "empty-state", "Изображение assets/sell-meme.png не найдено. Добавьте предоставленный файл, чтобы показать страницу продажи.");
    app.insertBefore(notice, app.firstChild);
    });
  const back = element("a", "primary-button", "Назад");
  back.href = "#/add";
  app.append(image, back);
}

function renderEditor() {
  mountEditor(app, () => {
    navigate("/");
    showToast("Находка опубликована");
  }, reportStorageError);
}

function renderChats() {
  app.className = "page-layout subpage";
  app.append(element("p", "eyebrow", "СООБЩЕНИЯ"), element("h1", "", "Ваши диалоги"));
  const chats = store.getChats();
  if (!chats.length) {
    app.append(element("p", "empty-state", "Пока нет переписок. Откройте карточку находки и нажмите «Написать»."));
    return;
  }
  const list = element("div", "dialog-list");
  for (const { item, messages } of chats) {
    const button = element("button", "dialog-list-item");
    button.type = "button";
    button.append(element("strong", "", item.title), element("span", "", messages.at(-1)?.text || ""));
    button.addEventListener("click", () => openChat(item.id));
    list.append(button);
  }
  app.append(list);
}

function renderProfile() {
  app.className = "page-layout subpage";
  app.append(element("p", "eyebrow", "ВАШ CAMPUS 404"), element("h1", "", "Профиль"));
  const profile = element("section", "profile-card glass");
  const name = element("div", "profile-top");
  const h2 = element("h2", "", store.getName());
  const editName = element("button", "text-button", "Изменить имя");
  editName.type = "button";
  editName.addEventListener("click", openNameDialog);
  name.append(h2, editName);
  const owned = store.getItems().filter((item) => item.isOwn);
  const averages = owned.map((item) => store.getAverageRating(item.id)).filter((rating) => rating !== null);
  const average = averages.length ? averages.reduce((sum, rating) => sum + rating, 0) / averages.length : null;
  const stats = element("div", "profile-stats");
  stats.append(statCard("Мои находки", String(owned.length)), statCard("Средний рейтинг", average === null ? "—" : `★ ${average.toFixed(1)}`));
  profile.append(name, stats, element("h2", "section-title", "Бонусная неделя"));
  const progress = getWeekProgress(store.getActivity());
  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт"];
  const weekdays = element("div", "week-progress");
  progress.forEach((day, index) => {
    const dayNode = element("div", `week-day${day.active ? " is-active" : ""}`, dayNames[index]);
    dayNode.setAttribute("aria-label", `${dayNames[index]}: ${day.active ? "засчитан" : "не засчитан"}`);
    weekdays.append(dayNode);
  });
  profile.append(weekdays);
  const earned = store.hasWeeklyBonus();
  profile.append(element("p", "bonus-status", earned ? "Бонус этой недели получен!" : `Отметьте активность в ${REQUIRED_ACTIVE_DAYS} рабочих дней, чтобы получить бонус.`));
  profile.append(element("h2", "section-title", "Список призов"));
  const rewards = element("ul", "reward-list");
  REWARDS.forEach((reward) => rewards.append(element("li", "", reward)));
  profile.append(rewards, element("h2", "section-title", "Мои объявления"));
  const ownedList = element("div", "owned-list");
  if (!owned.length) ownedList.append(element("p", "empty-state", "Пока нет опубликованных находок."));
  owned.forEach((item) => ownedList.append(element("p", "", `${item.title} · ${item.status}`)));
  profile.append(ownedList);
  app.append(profile);
}

function statCard(label, value) {
  const card = element("div", "stat-card");
  card.append(element("span", "", label), element("strong", "", value));
  return card;
}

function renderReview(id) {
  const item = store.getItem(id);
  if (!item || item.isOwn) {
    app.className = "page-layout subpage";
    app.append(element("h1", "", "Нельзя оценить собственную или неизвестную находку."), backLink());
    return;
  }
  app.className = "page-layout subpage";
  app.append(element("p", "eyebrow", "ОТЗЫВ"), element("h1", "", `Оцените находку «${item.title}»`));
  const form = element("form", "editor-form glass");
  const ratingGroup = element("div", "rating-group");
  ratingGroup.setAttribute("role", "radiogroup");
  ratingGroup.setAttribute("aria-label", "Оценка от одного до пяти");
  const radios = [];
  for (let score = 1; score <= 5; score += 1) {
    const label = element("label", "star-option");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "score";
    radio.value = String(score);
    radio.required = score === 1;
    radio.setAttribute("aria-label", `${score} из 5 звёзд`);
    const star = element("span", "", "★");
    label.append(radio, star);
    ratingGroup.append(label);
    radios.push(radio);
  }
  ratingGroup.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const current = Math.max(0, radios.findIndex((radio) => radio.checked || radio === document.activeElement));
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next = radios[(current + direction + radios.length) % radios.length];
    next.checked = true;
    next.focus();
  });
  const reviewLabel = element("label", "field-label", "Отзыв (до 500 символов)");
  const reviewText = document.createElement("textarea");
  reviewText.maxLength = 500;
  reviewText.rows = 4;
  reviewLabel.append(reviewText);
  const reviewPicker = initImagePicker({ multiple: true });
  form.append(reviewPicker.element);
  const message = element("p", "form-error");
  message.setAttribute("role", "alert");
  const submit = element("button", "primary-button", "Отправить отзыв");
  submit.type = "submit";
  form.append(ratingGroup, reviewLabel, message, submit, backLink());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      store.addRating(id, { score: Number(form.elements.score.value), text: reviewText.value, images: reviewPicker.get() });
      navigate("/");
      showToast("Спасибо за оценку!");
    } catch (error) { message.textContent = error.message; }
  });
  app.append(form);
  for (const rating of item.ratings || []) {
    const review = element("article", "review-card");
    review.append(element("p", "rating-summary", `★ ${rating.score} / 5`), element("p", "", rating.text));
    for (const src of rating.images || []) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "Изображение из отзыва";
      review.append(image);
    }
    app.append(review);
  }
}

function backLink() {
  const back = element("a", "text-button", "Назад");
  back.href = "#/";
  return back;
}

function navigate(path) {
  window.location.hash = path === "/" ? "#/" : `#${path}`;
}

function renderRoute() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  updateNavigationState(route);
  searchInput.hidden = route !== "" && route !== "/";
  app.replaceChildren();
  if (route === "" || route === "/") renderFeed();
  else if (route === "add") renderAddPage();
  else if (route === "sell") renderSellPage();
  else if (route === "edit") renderEditor();
  else if (route === "chats") renderChats();
  else if (route === "profile") renderProfile();
  else if (route.startsWith("review/")) renderReview(route.slice("review/".length));
  else navigate("/");
  updateIdentity();
  updateUnreadBadge();
}

function updateUnreadBadge() {
  const badge = document.querySelector("#unreadCount");
  const count = store.getUnread();
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.hidden = count === 0;
}

function openDrawer() {
  window.clearTimeout(drawerCloseTimeout);
  drawer.hidden = false;
  drawer.inert = false;
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  window.requestAnimationFrame(() => {
    drawer.classList.add("is-open");
    updateNavigationState();
  });
  document.querySelector('[data-route="menu"]').setAttribute("aria-expanded", "true");
  document.querySelector("#drawer-close").focus();
}

function closeDrawer() {
  if (drawer.hidden) return;
  drawer.classList.remove("is-open");
  drawer.inert = true;
  drawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
  document.querySelector('[data-route="menu"]').setAttribute("aria-expanded", "false");
  updateNavigationState();
  document.querySelector('[data-route="menu"]').focus();
  drawerCloseTimeout = window.setTimeout(() => { drawer.hidden = true; }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250);
}

const botResponses = [
  { keywords: ["привет", "здравствуй", "хай", "добрый", "hello", "hi"], answers: ["Привет! 👋 Рад, что вы откликнулись. Да, вещь ещё у меня.", "Здравствуйте! Да, я нашёл эту вещь и она пока у меня."] },
  { keywords: ["где", "место", "встрет", "забрать", "отдать"], answers: ["Можем встретиться в главном корпусе, у ресепшена. Вам удобно?", "Обычно я бываю в библиотеке на 2 этаже. Или можем договориться о другом месте."] },
  { keywords: ["когда", "время", "сегодня", "завтра", "час"], answers: ["Сегодня я свободен после 15:00. Завтра — в любое время с 10 до 18.", "Давайте сегодня? Я могу подождать у главного входа."] },
  { keywords: ["описан", "как выглядит", "цвет", "признак", "детал", "фото"], description: true },
  { keywords: ["спасибо", "благодар", "thanks", "спс"], answers: ["Не за что! 😊 Рад помочь.", "Пожалуйста! Давайте встретимся и я передам вещь."] },
  { keywords: ["состоян", "цел", "работ", "поврежд", "сломан"], answers: ["Вещь в хорошем состоянии, я её бережно хранил.", "Всё цело, повреждений не заметил."] },
  { keywords: ["вернул", "забрал", "получил", "встретил"], answers: ["Вещь уже возвращена владельцу. Спасибо за интерес!"] }
];
const defaultReplies = ["Понял вас. Уточните, пожалуйста, что именно вас интересует?", "Хорошо, давайте обсудим детали. Когда вам удобно встретиться?", "Принято. Я на связи, пишите!"];

async function getBotReply(text, item) {
  const normalized = text.toLocaleLowerCase("ru");
  const matched = botResponses.find((response) => response.keywords.some((word) => normalized.includes(word)));
  const returned = matched?.keywords.some((word) => ["вернул", "забрал", "получил", "встретил"].includes(word))
    || item.status === "Возвращено";
  const replies = matched?.answers || defaultReplies;
  const reply = matched?.description
    ? `Это ${item.title}. Нашёл в ${item.location}. Категория: ${item.category}. Состояние хорошее.`
    : returned
      ? "Вещь уже возвращена владельцу. Спасибо за интерес!"
      : replies[Math.floor(Math.random() * replies.length)];
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  return reply;
}

function appendMessage(message) {
  const bubble = element("div", `chat-message chat-message--${message.sender}`, message.text);
  chatMessages.append(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveActiveChat() {
  try { store.setChat(activeItem.id, activeHistory); }
  catch (error) { reportStorageError(error); }
}

function openChat(id) {
  const item = store.getItem(id);
  if (!item) return;
  activeItem = item;
  activeHistory = store.getChat(id);
  if (!activeHistory.length) {
    activeHistory.push({ sender: "bot", text: `Здравствуйте! Я нашёл вещь «${item.title}» в месте «${item.location}». Задавайте любые вопросы, договоримся о встрече.` });
    saveActiveChat();
  }
  document.querySelector("#chatTitle").textContent = item.title;
  chatMessages.replaceChildren();
  activeHistory.forEach(appendMessage);
  try { store.setUnread(0); } catch (error) { reportStorageError(error); }
  updateUnreadBadge();
  if (!chatModal.open) chatModal.showModal();
  chatInput.focus();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeItem) return;
  const item = activeItem;
  const history = activeHistory;
  history.push({ sender: "user", text });
  appendMessage(history.at(-1));
  chatInput.value = "";
  saveActiveChat();
  typingIndicator.hidden = false;
  pendingReplies += 1;
  chatSend.disabled = true;
  try {
    const reply = await getBotReply(text, item);
    history.push({ sender: "bot", text: reply });
    try { store.setChat(item.id, history); } catch (error) { reportStorageError(error); }
    if (activeItem?.id === item.id && chatModal.open) {
      activeHistory = history;
      appendMessage(history.at(-1));
    } else {
      try { store.setUnread(store.getUnread() + 1); } catch (error) { reportStorageError(error); }
      updateUnreadBadge();
    }
  } finally {
    pendingReplies -= 1;
    chatSend.disabled = pendingReplies > 0;
    if (activeItem?.id === item.id) typingIndicator.hidden = true;
  }
}

function openNameDialog() {
  const dialog = document.querySelector("#name-dialog");
  document.querySelector("#name-input").value = store.getName();
  if (!dialog.open) dialog.showModal();
  document.querySelector("#name-input").focus();
}

document.querySelector("#search-form").addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", () => { if (!location.hash || location.hash === "#/") renderRoute(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && !drawer.hidden) closeDrawer();
});
document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.route === "menu") openDrawer();
  else navigate(`/${button.dataset.route}`);
}));
document.querySelector("#header-profile").addEventListener("click", () => navigate("/profile"));
document.querySelector("#drawer-close").addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);
document.querySelector("#edit-button").addEventListener("click", () => { closeDrawer(); navigate("/edit"); });
document.querySelector("#category-toggle").addEventListener("click", (event) => {
  const expanded = event.currentTarget.getAttribute("aria-expanded") !== "true";
  event.currentTarget.setAttribute("aria-expanded", String(expanded));
  categoryOptions.hidden = !expanded;
});
document.querySelector("#theme-switch").addEventListener("click", (event) => {
  const theme = event.currentTarget.getAttribute("aria-checked") === "true" ? "dark" : "light";
  try { store.setTheme(theme); applyTheme(); } catch (error) { reportStorageError(error); }
});
document.querySelector("#name-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#name-input").value.trim();
  if (!name) return;
  try {
    store.setName(name);
    document.querySelector("#name-dialog").close();
    updateIdentity();
    renderRoute();
  } catch (error) { reportStorageError(error); }
});
document.querySelector("#chatClose").addEventListener("click", () => chatModal.close());
chatModal.addEventListener("click", (event) => { if (event.target === chatModal) chatModal.close(); });
chatModal.addEventListener("close", () => { activeItem = null; activeHistory = []; typingIndicator.hidden = true; });
document.querySelector("#chatForm").addEventListener("submit", (event) => { event.preventDefault(); sendMessage(); });
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); document.querySelector("#chatForm").requestSubmit(); }
});
window.addEventListener("hashchange", renderRoute);

renderCategories();
applyTheme();
renderRoute();
if (!store.getName()) openNameDialog();
