import { getItemImage } from "./item-images.js";

function compressImage(file, maxSide = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать выбранное изображение."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Выбранный файл не является доступным изображением."));
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Браузер не поддерживает обработку изображения."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function initImagePicker({ multiple = false } = {}) {
  const element = document.createElement("div");
  element.className = "image-picker";
  const label = document.createElement("label");
  label.className = "file-label";
  label.append(document.createTextNode("Добавить изображение"));

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = multiple;
  input.className = "visually-hidden";
  label.append(input);

  const previews = document.createElement("div");
  previews.className = "image-previews";
  const errorElement = document.createElement("p");
  errorElement.className = "form-error";
  errorElement.setAttribute("role", "alert");
  const images = [];

  input.addEventListener("change", async () => {
    errorElement.textContent = "";
    const selected = [...(input.files || [])];
    if (multiple && images.length + selected.length > 3) {
      errorElement.textContent = "Можно добавить не более 3 изображений.";
      input.value = "";
      return;
    }

    for (const file of selected) {
      try {
        const src = await compressImage(file);
        images.push(src);
        const preview = document.createElement("div");
        preview.className = "image-preview";
        const image = document.createElement("img");
        image.src = src;
        image.alt = "Предпросмотр фото";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "icon-button";
        remove.setAttribute("aria-label", "Удалить фото");
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          const index = images.indexOf(src);
          if (index !== -1) images.splice(index, 1);
          preview.remove();
        });
        preview.append(image, remove);
        previews.append(preview);
      } catch (error) {
        errorElement.textContent = error.message;
      }
    }
    input.value = "";
  });

  element.append(label, previews, errorElement);
  return {
    element,
    errorElement,
    input,
    get() { return multiple ? [...images] : (images[0] || ""); }
  };
}

export function createCardImage(card, placeholderIcon = "fa-box") {
  const imageBox = document.createElement("div");
  imageBox.className = "item-image";
  let imageElement = null;
  const showPlaceholder = () => {
    const placeholder = document.createElement("div");
    placeholder.className = "item-image-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    const icon = document.createElement("i");
    icon.className = `fa-solid ${placeholderIcon}`;
    icon.setAttribute("aria-hidden", "true");
    placeholder.append(icon);
    imageBox.prepend(placeholder);
    imageElement?.remove();
  };
  const imageSrc = getItemImage(card);
  if (imageSrc) {
    imageElement = document.createElement("img");
    imageElement.alt = card.title;
    imageElement.loading = "lazy";
    imageElement.addEventListener("error", showPlaceholder, { once: true });
    imageElement.src = imageSrc;
    imageBox.append(imageElement);
  } else {
    showPlaceholder();
  }
  return imageBox;
}
