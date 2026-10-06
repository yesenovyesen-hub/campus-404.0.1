const ITEM_IMAGES = Object.freeze({
  gradebook: "assets/seed/gradebook.jpg",
  campusPass: "assets/seed/campus-pass.png",
  earrings: "assets/seed/silver-earrings.jpg",
  transitTicket: "assets/seed/transit-ticket.jpg",
  hoodie: "assets/seed/gray-hoodie.jpg",
  airpods: "assets/seed/airpods.jpg",
  goldWatch: "assets/seed/gold-watch.jpg",
  teddyBear: "assets/seed/teddy-bear.jpg"
});

const ITEM_MATCHES = [
  [/зач[её]тн(?:ая|ой)?\s*книжк|зач[её]тк|grade\s*book/i, ITEM_IMAGES.gradebook],
  [/пропуск|студенческ(?:ий|ого)?\s+билет|campus\s+pass|student\s+(?:id|card)/i, ITEM_IMAGES.campusPass],
  [/серьг|earrings?/i, ITEM_IMAGES.earrings],
  [/проездн|транспортн(?:ый|ого)?\s+билет|transit\s+(?:pass|ticket)|bus\s+ticket/i, ITEM_IMAGES.transitTicket],
  [/худи|толстов|hoodie/i, ITEM_IMAGES.hoodie],
  [/airpods|наушник/i, ITEM_IMAGES.airpods],
  [/золот(?:ые|ых)\s+час|часы|watch/i, ITEM_IMAGES.goldWatch]
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

  const searchable = [item.title, item.type, item.description]
    .filter((value) => typeof value === "string")
    .join(" ")
    .normalize("NFKC");

  for (const [pattern, image] of ITEM_MATCHES) {
    if (pattern.test(searchable)) return image;
  }

  if (item.variant === "toy") return ITEM_IMAGES.teddyBear;

  switch (item.category) {
    case "Электроника": return ITEM_IMAGES.airpods;
    case "Документы": return ITEM_IMAGES.campusPass;
    case "Книги": return ITEM_IMAGES.gradebook;
    default: return null;
  }
}
