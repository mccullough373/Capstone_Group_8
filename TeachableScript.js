/**
 * TeachableScript.js - ML Model Integration
 *
 * Handles:
 * - Loading TensorFlow.js model from Teachable Machine
 * - Webcam setup and frame capture
 * - Real-time image classification
 * - Confidence score display with color coding
 *
 * API Documentation:
 * https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image
 */

// ========== Configuration ==========
const CONFIG = {
  // Prediction update interval (milliseconds)
  UPDATE_INTERVAL: 1250,

  // path to model files
  MODEL_URL: "./ModelFiles/",

  // Minimum confidence threshold to display (percentage)
  CONFIDENCE_THRESHOLD: 5,
};

// ========== Global State ==========
let model, webcam, labelContainer, maxPredictions;
let lastUpdate = 0; // Timestamp of last prediction
let useUploadedImage = false; // Flag to use uploaded image instead of webcam
let uploadedImageElement = null; // Image element for uploaded image
let isRunning = false;
let currentFacingMode = "user"; // Start with front camera

// ========== Initialization ==========

/**
 * Initializes the ML model and webcam
 * Loads model from external URL and sets up webcam feed
 * @throws {Error} If model loading or camera access fails
 */
async function init() {
  try {
    const modelURL = CONFIG.MODEL_URL + "model.json";
    const metadataURL = CONFIG.MODEL_URL + "metadata.json";

    // Load pre-trained model and metadata
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    isRunning = true;

    // Check if user uploaded an image (from App.js global variable)
    if (window.uploadedImageData) {
      // Use uploaded image mode
      useUploadedImage = true;
      uploadedImageElement = new Image();
      uploadedImageElement.src = window.uploadedImageData;

      await new Promise((resolve, reject) => {
        uploadedImageElement.onload = resolve;
        uploadedImageElement.onerror = reject;
      });

      // Display uploaded image in webcam container
      // Styles are handled by CSS for consistent sizing
      document
        .getElementById("webcam-container")
        .appendChild(uploadedImageElement);

      labelContainer = document.getElementById("label-container");

      // Run prediction once for uploaded image
      await predict();
    } else {
      // Use webcam mode
      useUploadedImage = false;
      await startWebcam();

      // Start prediction loop
      window.requestAnimationFrame(loop);

      labelContainer = document.getElementById("label-container");

      // Show the flip button now that the camera is running
      const flipBtn = document.getElementById("FlipCamBtn");
      if (flipBtn) flipBtn.style.display = "inline-block";
    }
  } catch (error) {
    console.error("Initialization error:", error);
    alert(
      "Failed to initialize. Please check camera permissions and internet connection.",
    );

    // Re-enable start button on failure
    const startBtn = document.getElementById("StartCamBtn");
    if (startBtn) {
      startBtn.style.display = "inline-block";
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera Feed";
    }

    throw error;
  }
}

// ========== Camera Setup ==========

/**
 * Starts the webcam using getUserMedia with the current facing mode.
 * Builds a proxy object that matches the tmImage.Webcam interface
 * (canvas + update()) so the rest of the code works unchanged.
 * Using getUserMedia directly lets us control facingMode, which the
 * Teachable Machine library hardcodes to "user" (front camera).
 */
async function startWebcam() {
  const container = document.getElementById("webcam-container");

  // Stop and remove any existing stream/canvas
  if (webcam && webcam._videoEl) {
    webcam._videoEl.srcObject.getTracks().forEach((t) => t.stop());
    webcam._videoEl.remove();
  }
  container.innerHTML = "";

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: currentFacingMode },
    audio: false,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", ""); // Required for iOS — prevents fullscreen takeover
  video.muted = true;
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  container.appendChild(canvas);

  // Proxy object that matches the tmImage.Webcam interface used elsewhere
  webcam = {
    _videoEl: video,
    canvas: canvas,
    update() {
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    },
  };
}

/**
 * Toggles between front and rear cameras and restarts the webcam stream.
 * Wired to the Flip Camera button.
 */
async function flipCamera() {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  await startWebcam();
}

// Wire up the Flip Camera button once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const flipBtn = document.getElementById("FlipCamBtn");
  if (flipBtn) flipBtn.addEventListener("click", flipCamera);
});

// ========== Animation Loop ==========

/**
 * Main animation loop for webcam updates and periodic predictions
 * Runs continuously via requestAnimationFrame
 * Only runs when using webcam mode
 */
async function loop() {
  if (!isRunning) return; // check FIRST before anything else

  if (!useUploadedImage && webcam) {
    webcam.update();
    window.requestAnimationFrame(loop);
  }
}

/**
 * Captures the current webcam frame and runs a single prediction.
 * Wired to the Take Photo button.
 */
async function captureAndPredict() {
  const btn = document.getElementById("TakePhotoBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Analyzing...";
  }
  await predict();
  if (btn) {
    btn.disabled = false;
    btn.textContent = "Take Photo";
  }
}

// ========== Prediction ==========

/**
 * Runs ML prediction on current webcam frame or uploaded image
 * Finds PG classification and displays color-coded confidence level
 *
 * Color Coding:
 * - Green (≥70%): High confidence - likely PG
 * - Yellow (40-69%): Medium confidence - uncertain
 * - Red (<40%): Low confidence - likely not PG
 */
async function predict() {
  let prediction;

  // Run model inference on either uploaded image or webcam
  if (useUploadedImage && uploadedImageElement) {
    prediction = await model.predict(uploadedImageElement);
  } else if (webcam?.canvas) {
    prediction = await model.predict(webcam.canvas);
  } else {
    console.error("No image source available for prediction");
    return;
  }

  // Find PG prediction (assumes class name contains "pg")
  let pgPrediction = null;
  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].className.toLowerCase().includes("pg")) {
      pgPrediction = prediction[i];
      checkLighting();
      break;
    }
  }

  // Clear previous results
  labelContainer.innerHTML = "";

  if (pgPrediction) {
    const prob = pgPrediction.probability * 100;
    const resultDiv = document.createElement("div");

    // Set display text
    resultDiv.innerHTML = `PG Detected: ${prob.toFixed(1)}%`;

    // Apply color coding based on confidence level
    if (prob >= 70) {
      resultDiv.style.background = "rgba(34, 197, 94, 0.9)"; // Green
    } else if (prob >= 40) {
      resultDiv.style.background = "rgba(234, 179, 8, 0.9)"; // Yellow
    } else {
      resultDiv.style.background = "rgba(239, 68, 68, 0.9)"; // Red
    }

    labelContainer.appendChild(resultDiv);
  }
}

function checkLighting() {
  if (!webcam) return; // Not in webcam mode (uploaded image)
  const canvas = webcam.canvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Calculate average brightness across all pixels
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Standard luminance formula
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const brightness = total / (data.length / 4); // 0–255

  const lightingDiv = document.getElementById("lighting-container");
  if (!lightingDiv) return;

  let label, bg;
  if (brightness >= 80 && brightness <= 200) {
    label = "Lighting: Good";
    bg = "rgba(34, 197, 94, 0.9)"; // green
  } else if (brightness < 80) {
    label = "Lighting: Too Dark";
    bg = "rgba(239, 68, 68, 0.9)"; // red
  } else {
    label = "Lighting: Too Bright";
    bg = "rgba(234, 179, 8, 0.9)"; // yellow
  }

  lightingDiv.innerHTML = `<div style="
  background: ${bg};
  padding: 12px 24px;
  border-radius: 12px;
  color: white;
  font-weight: bold;
  width: fit-content;
  margin: 0 auto;
  box-shadow: 0 4px 10px rgba(0,0,0,0.7);
">${label}</div>`;
}
