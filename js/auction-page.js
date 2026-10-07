import { getActiveAuctionLots, formatTenge, getAuctionConfig, getTimeRemaining, getDefaultAvatar } from "./auction.js";
import { store } from "./store.js";

function makeAuctionCard(item, role, refresh) {
  const card = document.createElement("article");
  card.className = "auction-card glass";

  const imageWrap = document.createElement("div");
  imageWrap.className = "auction-image";
  const image = document.createElement("img");
  image.alt = item.title;
  image.src = item.image || getDefaultAvatar();
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
    ["Ставок", String(bidCount)]
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
      const nextPrice = currentPrice + bidIncrement;
      try {
        store.placeAuctionBid(item.id, nextPrice, store.getName() || "Гость");
        refresh();
      } catch (error) {
        window.alert(error.message || "Не удалось сделать ставку.");
      }
    });
    body.append(bidButton);
  }

  card.append(imageWrap, body);
  return card;
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
  const activeLots = getActiveAuctionLots(store.getItems());
  app.className = "page-layout auction-page";

  const heading = document.createElement("div");
  heading.className = "auction-header";
  heading.innerHTML = `<p class="eyebrow">АУКЦИОН</p><h1>${role === "bidder" ? "Задаватель" : "Наблюдатель"}</h1>`;
  app.append(heading);

  if (!activeLots.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Пока активных лотов нет. Как только вещь достигает 21 дня, она появится здесь автоматически.";
    app.append(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "auction-grid";
  activeLots.forEach((item) => {
    grid.append(makeAuctionCard(item, role, () => window.location.hash = "#/auction/bidder"));
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
