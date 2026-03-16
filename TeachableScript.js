/**
 * TeachableScript.js - ML Model Integration
 *
 * Handles:
 * - Loading the TensorFlow.js / Teachable Machine model from local files
 * - Webcam setup and continuous frame capture
 * - Single-shot classification of uploaded images
 * - Real-time confidence score display with color coding
 * - Lighting quality check during webcam scans
 *
 * API Documentation:
 * https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image
 */

// ========== Configuration ==========
const CONFIG = {
  // How often to run a prediction when in webcam mode (milliseconds)
  UPDATE_INTERVAL: 1250,

  // Directory containing model.json and metadata.json
  MODEL_URL: "./",

  // Predictions below this confidence percentage are not displayed
  CONFIDENCE_THRESHOLD: 5,
};

// ========== Global State ==========
let model, webcam, labelContainer, maxPredictions;
let videoElement = null; // Raw video element used when tmImage.Webcam can't use rear camera
let lastUpdate = 0; // Timestamp of the last prediction run
let useUploadedImage = false; // True when classifying a still image instead of webcam
let uploadedImageElement = null; // <img> element holding the uploaded image
let isRunning = false; // Controls whether the prediction loop is active

// ========== Initialization ==========

/**
 * Loads the ML model and sets up either uploaded-image mode or live webcam mode.
 * Called by App.js when the user clicks "Start Scan".
 *
 * @param {string|null} imageData - Base64 data URL of the uploaded patient image,
 *                                  or null/undefined to use the webcam instead.
 * @throws {Error} If model loading or camera access fails
 */
async function init(imageData) {
  try {
    const modelURL = CONFIG.MODEL_URL + "model.json";
    const metadataURL = CONFIG.MODEL_URL + "metadata.json";

    // Load the pre-trained Teachable Machine model and class metadata
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    isRunning = true;

    // Check if user uploaded an image (passed from App.js)
    if (imageData) {
      // --- Uploaded image mode ---
      useUploadedImage = true;
      uploadedImageElement = new Image();
      uploadedImageElement.src = imageData;

      // Wait for the image to finish loading before running inference
      await new Promise((resolve, reject) => {
        uploadedImageElement.onload = resolve;
        uploadedImageElement.onerror = reject;
      });

      // Display the uploaded image in the webcam container area
      // Styles are handled by CSS for consistent sizing
      document
        .getElementById("webcam-container")
        .appendChild(uploadedImageElement);

      labelContainer = document.getElementById("label-container");

      // Run a single prediction on the static image (no loop needed)
      await predict();
    } else {
      // --- Live webcam mode ---
      useUploadedImage = false;

      // Use getUserMedia directly so we can request the rear camera on iOS.
      // tmImage.Webcam does not expose a facingMode option.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      videoElement = document.createElement("video");
      videoElement.srcObject = stream;
      videoElement.setAttribute("playsinline", ""); // Required for iOS Safari
      videoElement.setAttribute("autoplay", "");
      videoElement.setAttribute("muted", "");
      await videoElement.play();

      // Start the continuous prediction loop
      window.requestAnimationFrame(loop);

      // Add the video element to the DOM
      document.getElementById("webcam-container").appendChild(videoElement);
      labelContainer = document.getElementById("label-container");
    }
  } catch (error) {
    console.error("Initialization error:", error);
    alert(
      "Failed to initialize. Please check camera permissions and internet connection.",
    );

    // Re-enable the Start Scan button so the user can try again
    const startBtn = document.getElementById("StartCamBtn");
    if (startBtn) {
      startBtn.style.display = "inline-block";
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera Feed";
    }

    throw error;
  }
}

// ========== Animation Loop ==========

/**
 * Main animation loop for webcam updates and periodic predictions.
 * Runs continuously via requestAnimationFrame while isRunning is true.
 * Throttled by CONFIG.UPDATE_INTERVAL to avoid excessive inference calls.
 * Only active in webcam mode — skipped when using an uploaded image.
 */
async function loop() {
  if (!isRunning) return; // Stop immediately if the back button was pressed

  if (!useUploadedImage && videoElement) {

    // Schedule the next frame before awaiting predict() to keep the loop smooth
    window.requestAnimationFrame(loop);

    const now = Date.now();
    if (now - lastUpdate >= CONFIG.UPDATE_INTERVAL) {
      await predict();
      lastUpdate = now;
    }
  }
}

// ========== Prediction ==========

/**
 * Runs ML inference on the current webcam frame or the uploaded image.
 * Finds the "PG" class result and displays a color-coded confidence badge.
 *
 * Color coding:
 * - Green  (≥ 70%): High confidence — likely PG
 * - Yellow (40–69%): Medium confidence — uncertain
 * - Red    (< 40%): Low confidence — likely not PG
 */
async function predict() {
  let prediction;

  // Choose the image source based on the current mode
  if (useUploadedImage && uploadedImageElement) {
    // Draw the image to an offscreen canvas at its natural pixel dimensions.
    // This prevents CSS layout dimensions (the 600×450 forced by Styles.css)
    // from being read by TF.js, which would stretch the image before inference
    // and produce confidence scores that differ from the Teachable Machine website.
    const offscreen = document.createElement("canvas");
    offscreen.width = uploadedImageElement.naturalWidth;
    offscreen.height = uploadedImageElement.naturalHeight;
    offscreen.getContext("2d").drawImage(uploadedImageElement, 0, 0);
    prediction = await model.predict(offscreen);
  } else if (videoElement) {
    prediction = await model.predict(videoElement);
  } else {
    console.error("No image source available for prediction");
    return;
  }

  // Find the prediction entry whose class name contains "pg"
  let pgPrediction = null;
  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].className.toLowerCase().includes("pg")) {
      pgPrediction = prediction[i];
      break;
    }
  }

  // Update the lighting indicator (webcam mode only)
  checkLighting();

  // Clear previous result before writing the new one
  labelContainer.innerHTML = "";

  if (pgPrediction) {
    const prob = pgPrediction.probability * 100;
    const resultDiv = document.createElement("div");

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

// ========== Lighting Check ==========

/**
 * Analyzes the average brightness of the current webcam frame and displays
 * a color-coded indicator in the lighting container.
 *
 * Brightness ranges (0–255 luminance scale):
 * - Green  (80–200): Good lighting for accurate scanning
 * - Red    (< 80):   Too dark — move to a brighter area
 * - Yellow (> 200):  Too bright — reduce direct light
 *
 * Skipped automatically when using an uploaded image instead of the webcam.
 */
function checkLighting() {
  if (!videoElement || videoElement.readyState < 2) return; // No video available (uploaded image mode)

  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Calculate average luminance across all pixels using the standard
  // weighted formula: Y = 0.299R + 0.587G + 0.114B
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const brightness = total / (data.length / 4); // Average luminance (0–255)

  const lightingDiv = document.getElementById("lighting-container");
  if (!lightingDiv) return;

  let label, bg;
  if (brightness >= 80 && brightness <= 200) {
    label = "Lighting: Good";
    bg = "rgba(34, 197, 94, 0.9)"; // Green
  } else if (brightness < 80) {
    label = "Lighting: Too Dark";
    bg = "rgba(239, 68, 68, 0.9)"; // Red
  } else {
    label = "Lighting: Too Bright";
    bg = "rgba(234, 179, 8, 0.9)"; // Yellow
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
