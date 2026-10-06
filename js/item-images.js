const ITEM_IMAGES = Object.freeze({
  gradebook: "assets/seed/gradebook.jpg",
  campusPass: "assets/seed/campus-pass.png",
  earrings: "assets/seed/silver-earrings.jpg",
  transitTicket: "assets/seed/transit-ticket.jpg",
  hoodie: "assets/seed/gray-hoodie.jpg",
  airpods: "assets/seed/airpods.jpg",
  goldWatch: "assets/seed/gold-watch.jpg"
});

const ITEM_MATCHES = [
  { pattern: /зач[её]тн(?:ая|ой)?\s*книжк|зач[её]тк|grade\s*book/i, image: ITEM_IMAGES.gradebook, categories: ["Документы", "Книги"] },
  { pattern: /пропуск|студенческ(?:ий|ого)?\s+билет|campus\s+pass|student\s+(?:id|card)/i, image: ITEM_IMAGES.campusPass, categories: ["Документы"] },
  { pattern: /серьг|earrings?/i, image: ITEM_IMAGES.earrings, categories: ["Другое"] },
  { pattern: /проездн|транспортн(?:ый|ого)?\s+билет|transit\s+(?:pass|ticket)|bus\s+ticket/i, image: ITEM_IMAGES.transitTicket, categories: ["Документы"] },
  { pattern: /худи|толстов|hoodie/i, image: ITEM_IMAGES.hoodie, categories: ["Одежда"] },
  { pattern: /airpods|наушник/i, image: ITEM_IMAGES.airpods, categories: ["Электроника"] },
  { pattern: /золот(?:ые|ых)\s+час|gold\s+watch/i, image: ITEM_IMAGES.goldWatch, categories: ["Другое"] }
];

function suppliedImage(item) {
  for (const field of ["image", "imageUrl", "photo", "photoUrl", "imageFile"]) {
    if (typeof item[field] === "string" && item[field].trim()) return item[field].trim();
  }
  return null;
}

export function getItemImage(item = {}) {
  const supplied = suppliedImage(item);
  if (supplied) return supplied;

  const primarySearch = [item.title, item.type]
    .filter((value) => typeof value === "string")
    .join(" ")
    .normalize("NFKC");

  for (const match of ITEM_MATCHES) {
    if (match.pattern.test(primarySearch) && (!item.category || match.categories.includes(item.category))) {
      return match.image;
    }
  }

  const description = typeof item.description === "string" ? item.description.normalize("NFKC") : "";
  for (const match of ITEM_MATCHES) {
    if (match.pattern.test(description) && (!item.category || match.categories.includes(item.category))) {
      return match.image;
    }
  }

  return null;
}
