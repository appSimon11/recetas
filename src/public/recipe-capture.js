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

function ingredientsToText(ingredients) {
  return (ingredients || [])
    .map((item) =>
      [item.name, item.quantity, item.unit, item.section, item.is_optional ? "opcional" : ""]
        .filter((part, index) => index === 0 || part)
        .join(" | ")
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

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => setPhoto(reader.result);
  reader.readAsDataURL(file);
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
