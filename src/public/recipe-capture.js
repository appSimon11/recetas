const photoInput = document.getElementById("photoInput");
const previewImage = document.getElementById("previewImage");
const imageDataUrl = document.getElementById("imageDataUrl");
const analyzeButton = document.getElementById("analyzeImage");
const statusText = document.getElementById("analysisStatus");

function setPhoto(dataUrl) {
  imageDataUrl.value = dataUrl;
  previewImage.src = dataUrl;
  previewImage.classList.add("visible");
  analyzeButton.disabled = false;
}

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

function ingredientsToText(ingredients) {
  return (ingredients || [])
    .map((item) =>
      [item.name, item.quantity, item.unit]
        .filter((part, index) => index === 0 || part)
        .join(", ")
    )
    .join("\n");
}

function fillAnalysis(analysis) {
  const fields = [
    ["title", "title"],
    ["subtitle", "subtitle"],
    ["category", "category"],
    ["cuisine", "cuisine"],
    ["mood", "mood"],
    ["instructions", "instructions"]
  ];

  fields.forEach(([elementId, key]) => {
    const element = document.getElementById(elementId);

    if (element && analysis[key]) {
      element.value = analysis[key];
    }
  });

  if (analysis.ingredients?.length) {
    document.getElementById("ingredients").value = ingredientsToText(analysis.ingredients);
  }

  document.getElementById("extractedText").value = analysis.extracted_text || "";
  document.getElementById("extractedPreview").value = analysis.extracted_text || "";
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];

  if (!file) {
    return;
  }

  statusText.textContent = "Preparando foto...";
  analyzeButton.disabled = true;

  try {
    setPhoto(await prepareImage(file));
    statusText.textContent = "Foto lista.";
  } catch (error) {
    statusText.textContent = error.message;
  }
});

analyzeButton.addEventListener("click", async () => {
  statusText.textContent = "Leyendo foto...";
  analyzeButton.disabled = true;

  try {
    const response = await fetch("/recetas/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_data_url: imageDataUrl.value })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "No se pudo analizar.");
    }

    fillAnalysis(payload.analysis || {});
    statusText.textContent = "Datos listos para revisar.";
  } catch (error) {
    statusText.textContent = `No se pudo leer: ${error.message}`;
  } finally {
    analyzeButton.disabled = false;
  }
});
