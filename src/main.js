import * as ort from "onnxruntime-web/webgpu";

async function testONNX() {
  const status = document.getElementById("status");
  const output = document.getElementById("output");

  try {
    status.textContent = "Cargando modelo ONNX...";

    // Crear sesión utilizando WebGPU
    const session = await ort.InferenceSession.create("/models/sigmoid.onnx", {
      executionProviders: ["webgpu"],
    });

    // Crear datos de entrada
    const inputData = Float32Array.from({ length: 60 }, (_, i) => i - 30);

    const inputTensor = new ort.Tensor("float32", inputData, [3, 4, 5]);

    // Obtener nombres de entrada y salida
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    // Ejecutar inferencia
    const results = await session.run({
      [inputName]: inputTensor,
    });

    const resultData = results[outputName].data;

    status.textContent = "Inferencia ONNX exitosa";

    output.textContent =
      "Proveedor: WebGPU\n" +
      "Entrada: " +
      inputName +
      "\n" +
      "Salida: " +
      outputName +
      "\n\n" +
      "Primeros 10 resultados:\n" +
      Array.from(resultData).slice(0, 10).join("\n");

    console.log("Sesión:", session);
    console.log("Resultados:", resultData);

    await session.release();
  } catch (error) {
    status.textContent = "Error durante la inferencia";
    output.textContent = error.message;

    console.error(error);
  }
}

testONNX();
