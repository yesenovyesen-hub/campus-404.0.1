import { getActiveAuctionLots, formatTenge, getAuctionConfig, getTimeRemaining, getDefaultAvatar } from "./auction.js";
import { STORAGE_KEY, store } from "./store.js";

function makeAuctionCard(item, role, refresh) {
  const card = document.createElement("article");
  card.className = "auction-card glass";

  const imageWrap = document.createElement("div");
  imageWrap.className = "auction-image";
  const image = document.createElement("img");
  image.alt = item.title;
  image.src = item.image || getDefaultAvatar();
  const onImageError = () => {
    image.removeEventListener("error", onImageError);
    image.src = getDefaultAvatar();
  };
  image.addEventListener("error", onImageError, { once: true });
  imageWrap.append(image);

  const body = document.createElement("div");
  body.className = "auction-body";

  const titleRow = document.createElement("div");
  titleRow.className = "auction-title-row";
  const title = document.createElement("h3");
  title.textContent = item.title;
  const category = document.createElement("span");
  category.className = "auction-category";
  category.textContent = item.category;
  titleRow.append(title, category);

  const details = document.createElement("div");
  details.className = "auction-meta";
  const config = getAuctionConfig(item.category);
  const startPrice = Number(item.auctionStartPrice ?? item.startPrice ?? config.startPrice);
  const currentPrice = Number(item.auctionCurrentPrice ?? startPrice);
  const bidIncrement = Number(item.auctionBidIncrement ?? config.bidIncrement);
  const bidCount = Number(item.auctionBidCount || 0);

  const lanes = [
    ["Начальная цена", formatTenge(startPrice)],
    ["Текущая цена", formatTenge(currentPrice)],
    ["Шаг ставки", formatTenge(bidIncrement)],
    ["Ставок", String(bidCount)],
    ["Текущий лидер", item.auctionWinner || "Пока нет"]
  ];

  for (const [label, value] of lanes) {
    const row = document.createElement("div");
    row.className = "auction-detail";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    details.append(row);
  }

  const timer = document.createElement("p");
  timer.className = "auction-timer";
  const endAt = Number(item.auctionEndAt || Date.now() + 60_000);
  timer.textContent = `Осталось: ${getTimeRemaining(endAt)}`;

  body.append(titleRow, details, timer);

  if (role === "bidder") {
    const bidButton = document.createElement("button");
    bidButton.type = "button";
    bidButton.className = "auction-bid-button";
    bidButton.textContent = "Сделать ставку";
    bidButton.addEventListener("click", () => {
      openBidDialog(item, refresh);
    });
    body.append(bidButton);
  }

  card.append(imageWrap, body);
  return card;
}

function openBidDialog(item, refresh) {
  const dialog = document.createElement("dialog");
  dialog.className = "name-dialog glass auction-bid-dialog";
  dialog.setAttribute("aria-labelledby", "auction-bid-title");

  const form = document.createElement("form");
  form.className = "stack-form";
  form.noValidate = true;

  const heading = document.createElement("h2");
  heading.id = "auction-bid-title";
  heading.textContent = "Сделать ставку";

  const currentPrice = Number(item.auctionCurrentPrice ?? item.auctionStartPrice ?? 0);
  const bidIncrement = Number(item.auctionBidIncrement || 200);
  const minimumBid = currentPrice + bidIncrement;
  const currentPriceText = document.createElement("p");
  currentPriceText.textContent = `Текущая цена: ${formatTenge(currentPrice)}`;
  const minimumBidText = document.createElement("p");
  minimumBidText.textContent = `Минимальная следующая ставка: ${formatTenge(minimumBid)}`;
  const prompt = document.createElement("label");
  prompt.htmlFor = "auction-bid-amount";
  prompt.textContent = "Введите примерный взнос:";

  const inputRow = document.createElement("div");
  inputRow.className = "auction-bid-input-row";
  const input = document.createElement("input");
  input.id = "auction-bid-amount";
  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.required = true;
  input.setAttribute("pattern", "[0-9]*");
  input.setAttribute("aria-describedby", "auction-bid-currency auction-bid-preview auction-bid-error");
  const currency = document.createElement("span");
  currency.id = "auction-bid-currency";
  currency.textContent = "₸";
  inputRow.append(input, currency);

  const preview = document.createElement("output");
  preview.id = "auction-bid-preview";
  preview.className = "auction-bid-preview";
  preview.setAttribute("aria-live", "polite");
  const error = document.createElement("p");
  error.id = "auction-bid-error";
  error.className = "form-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "text-button";
  cancel.textContent = "Отмена";
  cancel.addEventListener("click", () => dialog.close());
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "primary-button";
  submit.textContent = "Подтвердить ставку";
  actions.append(cancel, submit);

  input.addEventListener("input", () => {
    error.hidden = true;
    preview.textContent = /^\d+$/.test(input.value) ? formatTenge(Number(input.value)) : "";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const rawAmount = input.value.trim();
    if (!/^\d+$/.test(rawAmount) || !Number.isSafeInteger(Number(rawAmount))) {
      error.textContent = "Введите корректную сумму.";
      error.hidden = false;
      input.focus();
      return;
    }
    const amount = Number(rawAmount);
    if (amount < minimumBid) {
      error.textContent = `Ставка должна быть не ниже ${formatTenge(minimumBid)}.`;
      error.hidden = false;
      input.focus();
      return;
    }

    try {
      store.placeAuctionBid(item.id, amount, store.getName() || "Гость");
      dialog.close();
      refresh();
    } catch (bidError) {
      error.textContent = bidError.message || "Не удалось сделать ставку.";
      error.hidden = false;
    }
  });

  form.append(heading, currentPriceText, minimumBidText, prompt, inputRow, preview, error, actions);
  dialog.append(form);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  input.value = String(minimumBid);
  preview.textContent = formatTenge(minimumBid);
  input.focus();
  input.select();
}

function renderRoleSelector(app) {
  app.className = "page-layout auction-page";
  const header = document.createElement("div");
  header.className = "auction-header";
  header.innerHTML = "<p class=\"eyebrow\">АУКЦИОН</p><h1>Выберите роль</h1>";

  const selector = document.createElement("div");
  selector.className = "auction-role-grid";

  const observerButton = document.createElement("button");
  observerButton.type = "button";
  observerButton.className = "auction-role-button glass";
  observerButton.textContent = "Наблюдатель";
  observerButton.addEventListener("click", () => {
    window.location.hash = "#/auction/observer";
  });

  const bidderButton = document.createElement("button");
  bidderButton.type = "button";
  bidderButton.className = "auction-role-button glass";
  bidderButton.textContent = "Задаватель";
  bidderButton.addEventListener("click", () => {
    window.location.hash = "#/auction/bidder";
  });

  selector.append(observerButton, bidderButton);
  app.append(header, selector);
}

function renderAuctionView(app, role) {
  app.replaceChildren();
  const activeLots = Array.isArray(store.getAuctionLots?.()) ? store.getAuctionLots() : getActiveAuctionLots(store.getItems());
  app.className = "page-layout auction-page";

  const heading = document.createElement("div");
  heading.className = "auction-header";
  heading.innerHTML = `<p class="eyebrow">АУКЦИОН</p><h1>${role === "bidder" ? "Задаватель" : "Наблюдатель"}</h1>`;
  app.append(heading);

  if (!activeLots.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Пока активных лотов нет.";
    app.append(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "auction-grid";
  activeLots.forEach((item) => {
    grid.append(makeAuctionCard(item, role, () => renderAuctionView(app, role)));
  });
  app.append(grid);
}

export function renderAuctionPage(app, role = "observer") {
  const normalizedRole = role === "bidder" ? "bidder" : "observer";
  if (!location.hash || !location.hash.startsWith("#/auction")) {
    window.location.hash = "#/auction";
    return;
  }

  const route = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (route === "auction") {
    renderRoleSelector(app);
    return;
  }

  renderAuctionView(app, normalizedRole);
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    store.refreshAuctionData(event.newValue);
    if (location.hash.startsWith("#/auction/")) {
      const role = location.hash.endsWith("/bidder") ? "bidder" : "observer";
      renderAuctionPage(document.querySelector("#app-view"), role);
    }
  } catch (error) {
    console.error("Не удалось синхронизировать состояние аукциона между вкладками.", error);
  }
});
