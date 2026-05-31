const batchText = document.getElementById("batchText");
const fillBatchSample = document.getElementById("fillBatchSample");
const downloadBatchTemplate = document.getElementById("downloadBatchTemplate");

const sampleBatch = [
  "nombre,categoria,cocina,minutos,porciones,ingredientes,preparacion,etiquetas,subtitulo",
  '"Tacos de pollo","cena","mexicana","25","2","pollo, 2, piezas; tortilla, 6, piezas; salsa, 1, taza","Calienta el pollo y arma los tacos.","rapida, pollo","Tacos faciles"',
  '"Pasta con atun","comida","casera","20","2","pasta, 200, g; atun, 1, lata; crema, 0.5, taza","Cuece la pasta, mezcla con atun y crema.","rapida, despensa","Comida rapida de alacena"'
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
