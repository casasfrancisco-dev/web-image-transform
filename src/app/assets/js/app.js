
const imageInput = document.getElementById("imageInput");
const uploadArea = document.getElementById("uploadArea");
const uploadContent = document.getElementById("uploadContent");

const imagePreview = document.getElementById("imagePreview");
const originalImage = document.getElementById("originalImage");
const comparisonOriginal = document.getElementById("comparisonOriginal");

const imageInfo = document.getElementById("imageInfo");
const processingStatus = document.getElementById("processingStatus");

const selectImage = document.getElementById("selectImage");
const clearImage = document.getElementById("clearImage");

const processButton = document.getElementById("processButton");
const downloadButton = document.getElementById("downloadButton");

let currentFile = null;
let currentImageURL = null;

// Navigation

const navLinks = document.querySelectorAll(".nav-link");
const transformPage = document.getElementById("transform");

let featuresLoaded = false;

navLinks.forEach(button => {

    button.addEventListener("click", async () => {

        const page = button.dataset.page;

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        button.classList.add("active");

        if (page === "transform") {
            document.querySelectorAll(".page")
                .forEach(item => item.classList.remove("active"));

            transformPage.classList.add("active");
            return;
        }

        if (page === "features") {

            if (!featuresLoaded) {
                try {
                    const response = await fetch("pages/features.html");

                    if (!response.ok) {
                        throw new Error("Error al cargar Funcionalidades");
                    }

                    const html = await response.text();

                    document.getElementById("featuresContainer")
                        .innerHTML = html;

                    featuresLoaded = true;

                } catch (error) {
                    console.error(error);
                    alert("No se pudo cargar la página de Funcionalidades.");
                    button.classList.remove("active");
                    document.querySelector('[data-page="transform"]')
                        .classList.add("active");
                    return;
                }
            }

            document.querySelectorAll(".page")
                .forEach(item => item.classList.remove("active"));

            document.getElementById("features").classList.add("active");
        }
    });

});


// Open file selector

selectImage.addEventListener("click", () => {
    imageInput.click();
});

uploadArea.addEventListener("click", event => {
    if (event.target.closest("button")) return;

    if (!currentFile) {
        imageInput.click();
    }
});


// Select image

imageInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (file) {
        loadImage(file);
    }
});


// Drag and drop

uploadArea.addEventListener("dragover", event => {
    event.preventDefault();
    uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", event => {
    event.preventDefault();

    uploadArea.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (file) {
        loadImage(file);
    }
});


// Load image

function loadImage(file) {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert("Selecciona una imagen JPG, PNG o WEBP.");
        return;
    }

    if (currentImageURL) {
        URL.revokeObjectURL(currentImageURL);
    }

    currentFile = file;
    currentImageURL = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {

        originalImage.src = currentImageURL;
        comparisonOriginal.src = currentImageURL;

        uploadContent.classList.add("hidden");
        imagePreview.classList.remove("hidden");

        comparisonOriginal.classList.remove("hidden");

        document.getElementById("originalPlaceholder")
            .classList.add("hidden");

        imageInfo.textContent =
            `${file.name} · ${image.naturalWidth} × ${image.naturalHeight} px · ${formatSize(file.size)}`;

        processingStatus.textContent = "Imagen cargada";

        processButton.disabled = false;
    };

    image.onerror = () => {
        alert("No se pudo cargar la imagen.");
        resetImage();
    };

    image.src = currentImageURL;
}


// Format file size

function formatSize(bytes) {

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


// Clear image

clearImage.addEventListener("click", resetImage);

function resetImage() {

    if (currentImageURL) {
        URL.revokeObjectURL(currentImageURL);
    }

    currentFile = null;
    currentImageURL = null;

    imageInput.value = "";

    originalImage.src = "";
    comparisonOriginal.src = "";

    uploadContent.classList.remove("hidden");
    imagePreview.classList.add("hidden");

    comparisonOriginal.classList.add("hidden");

    document.getElementById("originalPlaceholder")
        .classList.remove("hidden");

    document.getElementById("resultPlaceholder")
        .classList.remove("hidden");

    document.getElementById("resultImage")
        .classList.add("hidden");

    imageInfo.textContent = "";

    processingStatus.textContent = "Esperando imagen";

    processButton.disabled = true;
    downloadButton.disabled = true;
}


// Download original (temporary test)

downloadButton.addEventListener("click", () => {

    if (!currentFile) return;

    const link = document.createElement("a");

    link.href = currentImageURL;
    link.download = `original-${currentFile.name}`;

    link.click();
});


// Processing placeholder

processButton.addEventListener("click", () => {

    if (!currentFile) return;

    processingStatus.textContent =
        "Procesamiento pendiente de integración con WebGPU";

});


// Clean up

window.addEventListener("pagehide", () => {

    if (currentImageURL) {
        URL.revokeObjectURL(currentImageURL);
    }

});
