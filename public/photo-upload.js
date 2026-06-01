const photoInput = document.getElementById("photoUploadInput");
const photoDataUrl = document.getElementById("photoDataUrl");
const photoPreview = document.getElementById("previewImage");
const photoSubmit = document.getElementById("photoUploadSubmit");
const photoStatus = document.getElementById("photoUploadStatus");

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la imagen."));
    image.src = dataUrl;
  });
}

async function prepareImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));

  if (scale === 1 && file.size < 1_500_000) {
    return dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

if (photoInput) {
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];

    if (!file) {
      return;
    }

    photoSubmit.disabled = true;
    photoDataUrl.value = "";
    photoStatus.textContent = "Preparando foto...";

    try {
      const dataUrl = await prepareImage(file);
      photoDataUrl.value = dataUrl;
      photoPreview.src = dataUrl;
      photoPreview.classList.add("visible");
      photoSubmit.disabled = false;
      photoStatus.textContent = "Foto lista para guardar.";
    } catch (error) {
      photoStatus.textContent = error.message;
    }
  });

  photoSubmit.closest("form").addEventListener("submit", (event) => {
    if (!photoDataUrl.value) {
      event.preventDefault();
      photoStatus.textContent = "Elige una foto antes de guardar.";
      return;
    }

    photoSubmit.disabled = true;
    photoStatus.textContent = "Guardando foto...";
  });
}
