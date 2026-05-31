const photoInput = document.getElementById("photoUploadInput");
const photoDataUrl = document.getElementById("photoDataUrl");
const photoPreview = document.getElementById("previewImage");
const photoSubmit = document.getElementById("photoUploadSubmit");

if (photoInput) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      photoDataUrl.value = reader.result;
      photoPreview.src = reader.result;
      photoPreview.classList.add("visible");
      photoSubmit.disabled = false;
    };
    reader.readAsDataURL(file);
  });
}
