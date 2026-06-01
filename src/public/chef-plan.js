const copyPlanButton = document.getElementById("copyPlanButton");
const copyPlanText = document.getElementById("copyPlanText");

copyPlanButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(copyPlanText.value);
    copyPlanButton.textContent = "Copiado";
  } catch (error) {
    copyPlanText.select();
    document.execCommand("copy");
    copyPlanButton.textContent = "Copiado";
  }

  setTimeout(() => {
    copyPlanButton.textContent = "Copiar al portapapeles";
  }, 1800);
});
