export const AUCTION_CATEGORY_CONFIG = Object.freeze({
  Электроника: { startPrice: 5000, bidIncrement: 500 },
  Одежда: { startPrice: 2000, bidIncrement: 200 },
  Книги: { startPrice: 1000, bidIncrement: 100 },
  Другое: { startPrice: 2000, bidIncrement: 200 }
});

export const AUCTION_READY_MS = 1 * 24 * 60 * 60 * 1000;
export const AUCTION_ACTIVE_MS = 30 * 1000;

export function getDefaultAvatar() {
  return "assets/default-profile-avatar.png";
}

export function getAuctionConfig(category) {
  return AUCTION_CATEGORY_CONFIG[category] || { startPrice: 2000, bidIncrement: 200 };
}

export function formatTenge(value) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toLocaleString("ru-RU") : "0"} ₸`;
}

export function getAuctionWindow(item, now = Date.now()) {
  if (!item || item.category === "Документы") {
    return { foundAt: 0, auctionStartAt: 0, auctionEndAt: 0, isEligible: false };
  }

  const dateSource = item.foundAt || item.createdAt || new Date().toISOString();
  const foundAt = new Date(dateSource).getTime();
  if (!Number.isFinite(foundAt)) {
    return { foundAt: 0, auctionStartAt: 0, auctionEndAt: 0, isEligible: false };
  }

  const auctionStartAt = foundAt + AUCTION_READY_MS;
  const auctionEndAt = auctionStartAt + AUCTION_ACTIVE_MS;
  return { foundAt, auctionStartAt, auctionEndAt, isEligible: true };
}

export function computeAuctionState(item, now = Date.now()) {
  if (!item || item.category === "Документы") {
    return { ...item, status: item?.status || "FOUND", auctionStartAt: null, auctionEndAt: null, auctionCurrentPrice: item?.auctionCurrentPrice ?? 0, auctionBidCount: Number(item?.auctionBidCount || 0) };
  }

  const normalizedStatus = String(item.status || "").trim();
  const { auctionStartAt, auctionEndAt, isEligible } = getAuctionWindow(item, now);
  const startPrice = Number(item.auctionStartPrice ?? item.startPrice ?? getAuctionConfig(item.category).startPrice);
  const currentPrice = Number(item.auctionCurrentPrice ?? startPrice);
  const bidIncrement = Number(item.auctionBidIncrement ?? getAuctionConfig(item.category).bidIncrement);
  const bidCount = Number(item.auctionBidCount || 0);

  if (["Возвращено", "returned"].includes(normalizedStatus)) {
    return { ...item, status: normalizedStatus, auctionStartAt: null, auctionEndAt: null, auctionCurrentPrice: currentPrice, auctionBidCount: bidCount, auctionBidIncrement: bidIncrement, auctionStartPrice: startPrice };
  }

  if (!isEligible) {
    return { ...item, status: normalizedStatus || "FOUND", auctionStartAt: null, auctionEndAt: null, auctionCurrentPrice: currentPrice, auctionBidCount: bidCount, auctionBidIncrement: bidIncrement, auctionStartPrice: startPrice };
  }

  let nextStatus = normalizedStatus || "FOUND";
  if (now >= auctionEndAt) {
    nextStatus = bidCount > 0 ? "AUCTION_SOLD" : "AUCTION_EXPIRED";
  } else if (now >= auctionStartAt) {
    nextStatus = "AUCTION_ACTIVE";
  }

  return {
    ...item,
    status: nextStatus,
    auctionStartAt,
    auctionEndAt,
    auctionCurrentPrice: currentPrice,
    auctionStartPrice: startPrice,
    auctionBidCount: bidCount,
    auctionBidIncrement: bidIncrement,
    auctionWinner: item.auctionWinner || ""
  };
}

export function getActiveAuctionLots(items = [], now = Date.now()) {
  return (items || [])
    .map((item) => computeAuctionState(item, now))
    .filter((item) => item.category !== "Документы" && item.status === "AUCTION_ACTIVE");
}

export function getTimeRemaining(endAt, now = Date.now()) {
  const diff = Math.max(0, Number(endAt || 0) - now);
  return String(Math.ceil(diff / 1000));
}

export function isAuctionReady(item, now = Date.now()) {
  const { auctionStartAt } = getAuctionWindow(item, now);
  return item && item.category !== "Документы" && now >= auctionStartAt;
}
