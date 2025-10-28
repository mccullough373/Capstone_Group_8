// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// Configurable constants
const CONFIG = {
  // This is the interval at which the confidence percentages update their values
  UPDATE_INTERVAL: 1250,
  // This is the link to the google teachable model being used for analysis
  // If you change this link it will change what model is being used
  MODEL_URL: "https://teachablemachine.withgoogle.com/models/efDaJaMeI/",
  // This shows predictions only above this threshold percentage
  CONFIDENCE_THRESHOLD: 5,
};

let model, webcam, labelContainer, maxPredictions;
let lastUpdate = 0; // timestamp of last prediction update

// Load the image model and setup the webcam
async function init() {
  try {
    const modelURL = CONFIG.MODEL_URL + "model.json";
    const metadataURL = CONFIG.MODEL_URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // or files from your local hard drive
    // Note: the pose library adds "tmImage" object to your window (window.tmImage)
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    const flip = true; // whether to flip the webcam
    webcam = new tmImage.Webcam(); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append elements to the DOM
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
    // No need to create child divs - we'll create them dynamically in predict()
  } catch (error) {
    console.error("Initialization error:", error);
    alert(
      "Failed to initialize. Please check camera permissions and internet connection."
    );

    // Re-enable start button
    const startBtn = document.getElementById("StartCamBtn");
    if (startBtn) {
      startBtn.style.display = "inline-block";
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera Feed";
    }

    throw error; // Re-throw so the calling code knows it failed
  }
}

async function loop() {
  webcam.update(); // keep the video feed smooth
  window.requestAnimationFrame(loop);

  const now = Date.now();
  if (now - lastUpdate >= CONFIG.UPDATE_INTERVAL) {
    await predict(); // run your confidence prediction
    lastUpdate = now; // reset timer
  }
}

// run the webcam image through the image model
async function predict() {
  // predict can take in an image, video or canvas html element
  const prediction = await model.predict(webcam.canvas);

  // Find the PG prediction (assuming class name is "PG")
  let pgPrediction = null;
  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].className.toLowerCase().includes("pg")) {
      pgPrediction = prediction[i];
      break;
    }
  }

  // Clear the label container and show only the PG result
  labelContainer.innerHTML = "";

  if (pgPrediction) {
    const prob = pgPrediction.probability * 100;
    const resultDiv = document.createElement("div");

    // Display the PG confidence percentage
    resultDiv.innerHTML = `PG Detected: ${prob.toFixed(1)}%`;

    // Color code based on confidence level
    if (prob >= 70) {
      // High confidence = GREEN (likely PG)
      resultDiv.style.background = "rgba(34, 197, 94, 0.9)"; // green
      resultDiv.innerHTML = `PG Detected: ${prob.toFixed(1)}% `;
    } else if (prob >= 40) {
      // Medium confidence = YELLOW (uncertain)
      resultDiv.style.background = "rgba(234, 179, 8, 0.9)"; // yellow
      resultDiv.innerHTML = `PG Detected: ${prob.toFixed(1)}% `;
    } else {
      // Low confidence = RED (likely not PG)
      resultDiv.style.background = "rgba(239, 68, 68, 0.9)"; // red
      resultDiv.innerHTML = `PG Detected: ${prob.toFixed(1)}% `;
    }

    labelContainer.appendChild(resultDiv);
  }
}
