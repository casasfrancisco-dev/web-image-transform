import * as ort from "onnxruntime-web/webgpu";

const MODEL_URL =
  "https://huggingface.co/Saimon8420/realesr-general-x4v3-web/resolve/main/realesr-general-x4v3-static384.onnx";

const SIZE = 384;

const imageInput = document.getElementById("imageInput");
const processButton = document.getElementById("processButton");
const downloadButton = document.getElementById("downloadButton");
const originalImage = document.getElementById("originalImage");
const resultCanvas = document.getElementById("resultCanvas");
const status = document.getElementById("status");

let selectedImage = null;
let session = null;

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    selectedImage = image;
    originalImage.src = url;
    processButton.disabled = false;
    downloadButton.disabled = true;
    resultCanvas.width = 0;
    resultCanvas.height = 0;
    status.textContent = "Imagen cargada correctamente.";
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    status.textContent = "No se pudo cargar la imagen.";
  };

  image.src = url;
});

async function loadModel() {
  if (session) return;

  status.textContent = "Descargando modelo ONNX...";

  session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ["webgpu"],
  });

  console.log("Modelo cargado:", session);
}

function imageToTensor(image) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");

  // Mantener proporciones y rellenar con negro
  const scale = Math.min(SIZE / image.naturalWidth, SIZE / image.naturalHeight);

  const width = Math.max(1, Math.round(image.naturalWidth * scale));

  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const x = Math.floor((SIZE - width) / 2);
  const y = Math.floor((SIZE - height) / 2);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.drawImage(image, x, y, width, height);

  const pixels = ctx.getImageData(0, 0, SIZE, SIZE).data;

  const plane = SIZE * SIZE;
  const tensorData = new Float32Array(3 * plane);

  // RGBA -> RGB, HWC -> CHW
  for (let i = 0; i < plane; i++) {
    tensorData[i] = pixels[i * 4] / 255;
    tensorData[plane + i] = pixels[i * 4 + 1] / 255;
    tensorData[2 * plane + i] = pixels[i * 4 + 2] / 255;
  }

  return {
    tensor: new ort.Tensor("float32", tensorData, [1, 3, SIZE, SIZE]),
    width,
    height,
    x,
    y,
  };
}

function tensorToImage(output, crop) {
  const [, , outputHeight, outputWidth] = output.dims;
  const data = output.data;

  const factorX = outputWidth / SIZE;
  const factorY = outputHeight / SIZE;

  const startX = crop.x * factorX;
  const startY = crop.y * factorY;

  const width = crop.width * factorX;
  const height = crop.height * factorY;

  const plane = outputHeight * outputWidth;

  resultCanvas.width = width;
  resultCanvas.height = height;

  const ctx = resultCanvas.getContext("2d");
  const pixels = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceIndex = (startY + y) * outputWidth + startX + x;

      const targetIndex = (y * width + x) * 4;

      pixels.data[targetIndex] = Math.round(
        Math.max(0, Math.min(1, data[sourceIndex])) * 255,
      );

      pixels.data[targetIndex + 1] = Math.round(
        Math.max(0, Math.min(1, data[plane + sourceIndex])) * 255,
      );

      pixels.data[targetIndex + 2] = Math.round(
        Math.max(0, Math.min(1, data[2 * plane + sourceIndex])) * 255,
      );

      pixels.data[targetIndex + 3] = 255;
    }
  }

  ctx.putImageData(pixels, 0, 0);
}

async function processImage() {
  if (!selectedImage) return;

  processButton.disabled = true;
  downloadButton.disabled = true;

  try {
    await loadModel();

    status.textContent = "Preparando imagen...";

    const prepared = imageToTensor(selectedImage);

    status.textContent = "Ejecutando Real-ESRGAN...";

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    const results = await session.run({
      [inputName]: prepared.tensor,
    });

    status.textContent = "Generando imagen de salida...";

    tensorToImage(results[outputName], prepared);

    downloadButton.disabled = false;
    status.textContent = "Procesamiento completado.";

    console.log("Dimensiones de salida:", results[outputName].dims);
  } catch (error) {
    status.textContent = "Error: " + error.message;
    console.error(error);
  } finally {
    processButton.disabled = false;
  }
}

processButton.addEventListener("click", processImage);

downloadButton.addEventListener("click", () => {
  resultCanvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "image-transform-x4.png";
    link.click();

    URL.revokeObjectURL(url);
  }, "image/png");
});
