// ========== Configuration ==========

const CONFIG = { MODEL_URL: "./ModelFiles/" };

// ========== State ==========

let model, webcam;
let lastLightingCheck = 0;
let useUploadedImage = false;
let uploadedImageElement = null;
let isRunning = false;
let currentFacingMode = "user";

// ========== Initialization ==========

async function init() {
  try {
    model = await tmImage.load(
      CONFIG.MODEL_URL + "model.json",
      CONFIG.MODEL_URL + "metadata.json"
    );
    isRunning = true;

    if (window.uploadedImageData) {
      useUploadedImage = true;
      uploadedImageElement = new Image();
      uploadedImageElement.src = window.uploadedImageData;

      await new Promise((resolve, reject) => {
        uploadedImageElement.onload = resolve;
        uploadedImageElement.onerror = reject;
      });

      document.getElementById("webcam-container").appendChild(uploadedImageElement);
      await predict();
    } else {
      useUploadedImage = false;
      await startWebcam();
      window.requestAnimationFrame(loop);

      // Add webcam canvas to DOM
      document.getElementById("webcam-container").appendChild(webcam.canvas);

      const flipBtn = document.getElementById("FlipCamBtn");
      if (flipBtn) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        flipBtn.style.display = videoInputs.length > 1 ? "inline-block" : "none";
      }
    }
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Failed to initialize. Please check camera permissions and internet connection.");

    const startBtn = document.getElementById("StartCamBtn");
    if (startBtn) {
      startBtn.style.display = "inline-block";
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera Feed";
    }

    throw error;
  }
}

// ========== Camera ==========

async function startWebcam() {
  const container = document.getElementById("webcam-container");

  // iOS Safari requires { exact: "environment" } to reliably switch to the back camera
  const facingConstraint = currentFacingMode === "environment" ? { exact: "environment" } : "user";

  // Get the new stream before touching the existing preview so there's no blank flash
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facingConstraint },
    audio: false,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", ""); // Required for iOS — prevents fullscreen takeover
  video.muted = true;
  await video.play();

  await new Promise((resolve) => {
    if (video.readyState >= 1) resolve();
    else video.addEventListener("loadedmetadata", resolve, { once: true });
  });

  // New stream is ready — now tear down the old one and swap in the new canvas
  if (webcam?._videoEl) {
    webcam._videoEl.srcObject?.getTracks().forEach((t) => t.stop());
    webcam._videoEl.remove();
  }
  container.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : ""; // Mirror front camera
  container.appendChild(canvas);

  webcam = {
    _videoEl: video,
    canvas,
    update() {
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    },
  };
}

async function flipCamera() {
  const previousMode = currentFacingMode;
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  try {
    await startWebcam();
  } catch (error) {
    console.warn("Camera flip failed, reverting:", error);
    currentFacingMode = previousMode;
    await startWebcam();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const flipBtn = document.getElementById("FlipCamBtn");
  if (flipBtn) flipBtn.addEventListener("click", flipCamera);
});

// ========== Loop ==========

function loop() {
  if (!isRunning) return;

  if (!useUploadedImage && webcam) {
    webcam.update();

    // Update lighting ~2x per second to avoid hammering getImageData every frame
    const now = Date.now();
    if (now - lastLightingCheck >= 500) {
      checkLighting();
      lastLightingCheck = now;
    }

    window.requestAnimationFrame(loop);
  }
}

// ========== Prediction ==========

async function predictOnImageElement(imgEl) {
  const prevEl = uploadedImageElement;
  const prevUseUploaded = useUploadedImage;
  uploadedImageElement = imgEl;
  useUploadedImage = true;
  await predict();
  uploadedImageElement = prevEl;
  useUploadedImage = prevUseUploaded;
}

async function captureAndPredict() {
  const btn = document.getElementById("TakePhotoBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Scanning..."; }
  await predict();
  if (btn) { btn.disabled = false; btn.textContent = "Scan"; }
}

async function predict() {
  let prediction;

  if (useUploadedImage && uploadedImageElement) {
    prediction = await model.predict(uploadedImageElement);
  } else if (webcam?.canvas) {
    prediction = await model.predict(webcam.canvas);
  } else {
    console.error("No image source available for prediction");
    return;
  }

  const pgPrediction = prediction.find((p) => p.className.toLowerCase().includes("pg")) ?? null;

  if (pgPrediction) {
    const prob = pgPrediction.probability * 100;
    const bg = prob >= 70 ? "rgba(34, 197, 94, 0.9)"
              : prob >= 40 ? "rgba(234, 179, 8, 0.9)"
              : "rgba(239, 68, 68, 0.9)";
    window.lastPGResult = { text: `PG Detected: ${prob.toFixed(1)}%`, bg };
  } else {
    window.lastPGResult = null;
  }
}

// ========== Lighting ==========

function checkLighting() {
  if (!webcam?.canvas) return;

  const ctx = webcam.canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, webcam.canvas.width, webcam.canvas.height);

  // Standard luminance formula averaged across all pixels
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const brightness = total / (data.length / 4);

  const lightingDiv = document.getElementById("lighting-container");
  if (!lightingDiv) return;

  let label, cls;
  if (brightness >= 80 && brightness <= 200) {
    label = "Lighting: Good";
    cls = "lighting-good";
  } else if (brightness < 80) {
    label = "Lighting: Too Dark";
    cls = "lighting-dark";
  } else {
    label = "Lighting: Too Bright";
    cls = "lighting-bright";
  }

  lightingDiv.innerHTML = `<div class="lighting-badge ${cls}">${label}</div>`;
}
