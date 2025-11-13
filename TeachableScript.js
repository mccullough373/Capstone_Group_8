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

  // External model URL (Teachable Machine hosted)
  MODEL_URL: "https://teachablemachine.withgoogle.com/models/efDaJaMeI/",

  // Minimum confidence threshold to display (percentage)
  CONFIDENCE_THRESHOLD: 5,
};

// ========== Global State ==========
let model, webcam, labelContainer, maxPredictions;
let lastUpdate = 0; // Timestamp of last prediction

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

    // Initialize webcam with mirroring enabled
    const flip = true;
    webcam = new tmImage.Webcam();
    await webcam.setup(); // Request camera permissions
    await webcam.play();

    // Start prediction loop
    window.requestAnimationFrame(loop);

    // Add webcam canvas to DOM
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
  } catch (error) {
    console.error("Initialization error:", error);
    alert(
      "Failed to initialize. Please check camera permissions and internet connection."
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

// ========== Animation Loop ==========

/**
 * Main animation loop for webcam updates and periodic predictions
 * Runs continuously via requestAnimationFrame
 */
async function loop() {
  webcam.update(); // Keep video feed smooth
  window.requestAnimationFrame(loop);

  // Run prediction at configured interval
  const now = Date.now();
  if (now - lastUpdate >= CONFIG.UPDATE_INTERVAL) {
    await predict();
    lastUpdate = now;
  }
}

// ========== Prediction ==========

/**
 * Runs ML prediction on current webcam frame
 * Finds PG classification and displays color-coded confidence level
 *
 * Color Coding:
 * - Green (≥70%): High confidence - likely PG
 * - Yellow (40-69%): Medium confidence - uncertain
 * - Red (<40%): Low confidence - likely not PG
 */
async function predict() {
  // Run model inference on current frame
  const prediction = await model.predict(webcam.canvas);

  // Find PG prediction (assumes class name contains "pg")
  let pgPrediction = null;
  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].className.toLowerCase().includes("pg")) {
      pgPrediction = prediction[i];
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
