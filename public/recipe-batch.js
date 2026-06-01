const batchText = document.getElementById("batchText");
const fillBatchSample = document.getElementById("fillBatchSample");
const downloadBatchTemplate = document.getElementById("downloadBatchTemplate");
const uploadBatchTemplate = document.getElementById("uploadBatchTemplate");

function csvCell(value) {
  const text = String(value || "");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(",");
}

const headers = [
  "nombre", "categoria", "cocina", "minutos", "porciones",
  "ingrediente 1", "cantidad 1", "unidad 1",
  "ingrediente 2", "cantidad 2", "unidad 2",
  "ingrediente 3", "cantidad 3", "unidad 3",
  "ingrediente 4", "cantidad 4", "unidad 4",
  "ingrediente 5", "cantidad 5", "unidad 5",
  "ingrediente 6", "cantidad 6", "unidad 6",
  "ingrediente 7", "cantidad 7", "unidad 7",
  "ingrediente 8", "cantidad 8", "unidad 8",
  "ingrediente 9", "cantidad 9", "unidad 9",
  "ingrediente 10", "cantidad 10", "unidad 10",
  "preparacion", "etiquetas", "subtitulo"
];

const sampleBatch = [
  "Mesa Viva - layout para cargar recetas por lote",
  "Llena una receta por renglon. Puedes borrar las recetas de ejemplo cuando cargues las tuyas.",
  "Las recetas empiezan en el renglon 5.",
  headers.join(","),
  csvRow([
    "Tacos de pollo", "cena", "mexicana", "25", "2",
    "pollo", "2", "piezas",
    "tortilla", "6", "piezas",
    "salsa", "1", "taza",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "Calienta el pollo y arma los tacos.", "rapida, pollo", "Tacos faciles"
  ]),
  csvRow([
    "Pasta con atun", "comida", "casera", "20", "2",
    "pasta", "200", "g",
    "atun", "1", "lata",
    "crema", "0.5", "taza",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "Cuece la pasta, mezcla con atun y crema.", "rapida, despensa", "Comida rapida de alacena"
  ])
].join("\n");

fillBatchSample.addEventListener("click", () => {
  batchText.value = sampleBatch;
});

downloadBatchTemplate.addEventListener("click", () => {
  const blob = new Blob([sampleBatch], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "layout-recetas.csv";
  link.click();
  URL.revokeObjectURL(url);
});

uploadBatchTemplate.addEventListener("change", () => {
  const file = uploadBatchTemplate.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    batchText.value = reader.result;
    batchText.focus();
  };
  reader.readAsText(file, "utf-8");
});
