import { CATEGORIES } from "./constants.js";
import { initImagePicker } from "./image-upload.js";
import { store } from "./store.js";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderEditor(container, onPublished, onError) {
  container.className = "page-layout subpage";
  container.append(element("p", "eyebrow", "НОВАЯ НАХОДКА"), element("h1", "", "Добавить найденную вещь"));
  const form = element("form", "editor-form glass");
  const picker = initImagePicker();
  form.append(picker.element);

  const titleLabel = element("label", "field-label", "Введите название вещицы, которую вы нашли");
  const title = document.createElement("input");
  title.name = "title";
  title.required = true;
  title.maxLength = 60;
  title.autocomplete = "off";
  titleLabel.append(title);

  const descLabel = element("label", "field-label", "Добавьте описание к найденной вещицы, чтобы было легче опираться на детали");
  const description = document.createElement("textarea");
  description.name = "description";
  description.maxLength = 500;
  description.rows = 4;
  const descriptionCount = element("span", "character-count", "0 / 500");
  description.addEventListener("input", () => { descriptionCount.textContent = `${description.value.length} / 500`; });
  descLabel.append(description, descriptionCount);

  const locationLabel = element("label", "field-label", "Место находки");
  const location = document.createElement("input");
  location.name = "location";
  location.required = true;
  location.maxLength = 100;
  locationLabel.append(location);

  const categoryLabel = element("label", "field-label", "Категория");
  const category = document.createElement("select");
  category.name = "category";
  category.required = true;
  for (const name of CATEGORIES) {
    const option = element("option", "", name);
    option.value = name;
    category.append(option);
  }
  categoryLabel.append(category);

  const error = element("p", "form-error");
  error.setAttribute("role", "alert");
  const publish = element("button", "primary-button", "Опубликовать");
  publish.type = "submit";
  form.append(titleLabel, descLabel, locationLabel, categoryLabel, error, publish);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      store.saveItem({
        title: title.value,
        description: description.value,
        location: location.value,
        category: category.value,
        image: picker.get(),
        imageAlt: title.value
      });
      onPublished();
    } catch (exception) {
      error.textContent = exception?.name === "QuotaExceededError"
        ? "Хранилище заполнено. Удалите старые изображения или уменьшите их размер; введённые данные сохранены."
        : `Не удалось опубликовать находку: ${exception.message}`;
      if (exception?.name !== "QuotaExceededError") onError(exception);
    }
  });
  container.append(form);
}
