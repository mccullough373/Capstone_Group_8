// ========== DOM References ==========

const StartCamBtn = document.getElementById("StartCamBtn");
const PDFbtn = document.getElementById("PDFbtn");
const patientFormContainer = document.getElementById("patient-form-container");
const takePhotoBtn = document.getElementById("TakePhotoBtn");
const xScanBtn = document.getElementById("XScanBtn");
const viewRecordsBtn = document.getElementById("view-records-btn");
const recordsModal = document.getElementById("records-model");
const closeModal = document.querySelector(".close");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const showAllBtn = document.getElementById("show-all-btn");
const recordsList = document.getElementById("records-list");

const encryptionModal = document.getElementById("encryption-model");
const setupEncryptionBtn = document.getElementById("setup-encryption-btn");
const masterPasswordInput = document.getElementById("master-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const encryptionError = document.getElementById("encryption-error");

const lockoutModal = document.getElementById("lockout-model");
const resetPasswordBtn = document.getElementById("reset-password-btn");

const patientImageInput = document.getElementById("patient-image");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");
const scanCounter = document.getElementById("scan-counter");

// ========== State ==========

let currentPatientData = null;
let uploadedImageData = null;
let scanResults = [];

// ========== Encryption & Initialization ==========

window.addEventListener("load", async () => {
  if (localStorage.getItem("account_locked") === "true") {
    lockoutModal.style.display = "block";
  } else if (!localStorage.getItem("encryption_salt")) {
    encryptionModal.style.display = "block";
  } else {
    await promptForPassword();
  }
});

resetPasswordBtn.addEventListener("click", () => {
  if (!confirm("Are you sure? This will permanently erase all patient data and cannot be undone.")) return;
  localStorage.clear();
  encryptionModal.style.display = "block";
  lockoutModal.style.display = "none";
});

async function promptForPassword() {
  const maxAttempts = 5;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const failedSoFar = parseInt(localStorage.getItem("failed_attempts") || "0", 10);
    const password = prompt(
      attempts === 0
        ? "Enter master password to unlock application:"
        : `Incorrect password. Attempt ${failedSoFar + 1}/${maxAttempts}:`
    );

    if (!password) {
      alert("Password required to access application");
      location.reload();
      return;
    }

    try {
      await encryption.init(password);

      const verificationToken = localStorage.getItem("encryption_verification");
      if (!verificationToken) {
        alert("Security error: Verification token missing. Please clear browser data and set up again.");
        localStorage.removeItem("encryption_salt");
        location.reload();
        return;
      }

      const decryptedToken = await encryption.decrypt(verificationToken);
      if (decryptedToken.verify === "PG_SCANNER_AUTH_TOKEN") {
        localStorage.removeItem("failed_attempts");
        await patientDB.init();
        return;
      } else {
        throw new Error("Verification token mismatch");
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      encryption.key = null;

      const newFailCount = parseInt(localStorage.getItem("failed_attempts") || "0", 10) + 1;
      localStorage.setItem("failed_attempts", newFailCount);

      if (newFailCount >= maxAttempts) {
        localStorage.setItem("account_locked", "true");
        alert("Account locked after too many failed attempts.\n\nYou must reset your password to continue.");
        location.reload();
        return;
      }
    }
  }
}

setupEncryptionBtn.addEventListener("click", async () => {
  const password = masterPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const passwordErrors = [];
  if (!password || password.length < 8) passwordErrors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) passwordErrors.push("an uppercase letter");
  if (!/[a-z]/.test(password)) passwordErrors.push("a lowercase letter");
  if (!/[0-9]/.test(password)) passwordErrors.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push("a special character");

  if (passwordErrors.length > 0) {
    encryptionError.textContent = "Password must contain: " + passwordErrors.join(", ");
    encryptionError.style.display = "block";
    return;
  }

  if (password !== confirmPassword) {
    encryptionError.textContent = "Passwords do not match";
    encryptionError.style.display = "block";
    return;
  }

  try {
    await encryption.init(password);

    const encryptedToken = await encryption.encrypt({
      verify: "PG_SCANNER_AUTH_TOKEN",
      created: new Date().toISOString(),
    });
    localStorage.setItem("encryption_verification", encryptedToken);

    await patientDB.init();
    encryptionModal.style.display = "none";
    alert("Encryption setup successful!\n\nIMPORTANT: Remember your password - it cannot be recovered!");
  } catch (error) {
    console.error("Encryption setup error:", error);
    encryptionError.textContent = "Setup failed: " + error.message;
    encryptionError.style.display = "block";
  }
});

// ========== Image Upload ==========

patientImageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file.");
    patientImageInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image file is too large. Please select an image under 5MB.");
    patientImageInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = e.target.result;
    imagePreview.src = uploadedImageData;
    imagePreviewContainer.style.display = "block";
  };
  reader.onerror = () => {
    alert("Failed to read image file. Please try again.");
    patientImageInput.value = "";
  };
  reader.readAsDataURL(file);
});

removeImageBtn.addEventListener("click", () => {
  uploadedImageData = null;
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";
});

// ========== Form Validation ==========

function validatePatientForm() {
  const name = document.getElementById("patient-name").value.trim();
  const age = document.getElementById("patient-age").value;
  const sex = document.getElementById("patient-sex").value;

  if (!name) { alert("Please enter patient name."); return false; }
  if (!age || age < 0 || age > 150) { alert("Please enter a valid age (0-150)."); return false; }
  if (!sex) { alert("Please select patient sex."); return false; }
  return true;
}

// ========== Scan Helpers ==========

// Show a captured frame in the camera area with the X button and result badge
function showCapturedFrame(frameData) {
  const container = document.getElementById("webcam-container");
  container.innerHTML = "";
  const img = document.createElement("img");
  img.src = frameData;
  container.appendChild(img);

  xScanBtn.style.display = "block";
  document.getElementById("lighting-container").style.display = "none";
  PDFbtn.style.display = "block";

  const badge = document.getElementById("scan-result-badge");
  if (window.lastPGResult) {
    badge.textContent = window.lastPGResult.text;
    badge.style.background = window.lastPGResult.bg;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
}

// Save the currently displayed scan to results (implicit "keep")
function savePendingScan() {
  if (!window.scannedFrameData) return;
  scanResults.push({
    frameData: window.scannedFrameData,
    confidenceText: getConfidenceText(),
    timestamp: new Date().toLocaleString(),
  });
  window.scanResults = scanResults;
  window.scannedFrameData = null;
  updateScanCounter();
  PDFbtn.style.display = "block";
}

function updateScanCounter() {
  const n = scanResults.length;
  scanCounter.textContent = `${n} previous scan${n === 1 ? "" : "s"}`;
  scanCounter.style.display = "block";
}

// Restore the live camera feed (used by both X and "Scan Again")
function restoreLiveFeed() {
  const container = document.getElementById("webcam-container");
  container.innerHTML = "";
  if (webcam?.canvas) container.appendChild(webcam.canvas);
  xScanBtn.style.display = "none";
  document.getElementById("scan-result-badge").style.display = "none";
  document.getElementById("lighting-container").style.display = "";
  takePhotoBtn.textContent = "Scan";
}

// ========== X Scan Button (discard) ==========

xScanBtn.addEventListener("click", () => {
  window.scannedFrameData = null;
  window.lastPGResult = null;
  restoreLiveFeed();
});

// ========== Camera ==========

StartCamBtn.addEventListener("click", async () => {
  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }

  if (!validatePatientForm()) return;

  currentPatientData = {
    name: document.getElementById("patient-name").value.trim(),
    age: parseInt(document.getElementById("patient-age").value),
    sex: document.getElementById("patient-sex").value,
    notes: document.getElementById("patient-notes").value.trim(),
    uploadedImage: uploadedImageData,
  };

  window.uploadedImageData = uploadedImageData;

  StartCamBtn.disabled = true;
  StartCamBtn.textContent = "Loading...";

  try {
    await init();

    StartCamBtn.style.display = "none";
    viewRecordsBtn.style.display = "none";
    patientFormContainer.style.display = "none";

    if (!window.uploadedImageData) {
      takePhotoBtn.style.display = "inline-block";
    } else {
      const normalizedFirst = await normalizeImageOrientation(window.uploadedImageData);
      scanResults.push({
        frameData: normalizedFirst,
        confidenceText: getConfidenceText(),
        timestamp: new Date().toLocaleString(),
      });
      window.scanResults = scanResults;
      updateScanCounter();
      document.getElementById("AddImageBtn").style.display = "inline-block";
      PDFbtn.style.display = "block";

      const badge = document.getElementById("scan-result-badge");
      if (window.lastPGResult) {
        badge.textContent = window.lastPGResult.text;
        badge.style.background = window.lastPGResult.bg;
        badge.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Failed to start camera:", error);
    alert("Failed to start camera. Please check permissions and try again.\n\nError: " + error.message);
    StartCamBtn.disabled = false;
    StartCamBtn.textContent = "Start Scan";
  }
});

takePhotoBtn.addEventListener("click", async () => {
  // "Scan Again" — save the current frozen scan and return to live feed
  if (window.scannedFrameData) {
    savePendingScan();
    restoreLiveFeed();
    return;
  }

  // "Scan" — capture a new frame from the live feed
  if (webcam?.canvas) {
    window.scannedFrameData = webcam.canvas.toDataURL("image/jpeg", 0.92);
  }
  await captureAndPredict();
  showCapturedFrame(window.scannedFrameData);
  takePhotoBtn.textContent = "Scan Again";
});

// ========== Reset Helpers ==========

function resetState() {
  isRunning = false;
  currentPatientData = null;
  uploadedImageData = null;
  scanResults = [];
  window.uploadedImageData = null;
  window.scannedFrameData = null;
  window.scanResults = null;
  window.lastPGResult = null;
}

function resetUI() {
  document.getElementById("lighting-container").innerHTML = "";
  document.getElementById("webcam-container").innerHTML = "";

  document.getElementById("patient-name").value = "";
  document.getElementById("patient-age").value = "";
  document.getElementById("patient-sex").value = "";
  document.getElementById("patient-notes").value = "";
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";

  patientFormContainer.style.display = "block";
  StartCamBtn.disabled = false;
  StartCamBtn.textContent = "Start Scan";
  StartCamBtn.style.display = "block";
  viewRecordsBtn.style.display = "block";
  takePhotoBtn.style.display = "none";
  takePhotoBtn.textContent = "Scan";
  xScanBtn.style.display = "none";
  document.getElementById("scan-result-badge").style.display = "none";
  scanCounter.style.display = "none";
  document.getElementById("FlipCamBtn").style.display = "none";
  document.getElementById("AddImageBtn").style.display = "none";
  PDFbtn.style.display = "none";
}

// ========== Image Helpers ==========

// Draws the image through a canvas so jsPDF receives orientation-corrected pixel data.
// Modern browsers apply EXIF rotation when rendering <img> but jsPDF uses the raw bytes.
function normalizeImageOrientation(dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataURL;
  });
}

// ========== Additional Image Upload ==========

document.getElementById("AddImageBtn").addEventListener("click", () => {
  document.getElementById("extra-image-input").click();
});

document.getElementById("extra-image-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const normalizedURL = await normalizeImageOrientation(ev.target.result);

    const img = new Image();
    img.src = normalizedURL;
    await new Promise((r) => (img.onload = r));

    await predictOnImageElement(img);
    window.scannedFrameData = normalizedURL;
    showCapturedFrame(normalizedURL);
    takePhotoBtn.textContent = "Scan Again";
  };
  reader.readAsDataURL(file);
});

// ========== PDF Export ==========

async function exportToPDFWithPatient() {
  // Auto-save any pending scan before exporting
  savePendingScan();

  if (!currentPatientData) {
    alert("Patient data not found. Please restart the application.");
    return;
  }

  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Cannot save patient data.");
    return;
  }

  try {
    // @ts-ignore — exportToPDF is async; TS can't infer its return type across plain JS files
    const { filename, pdfBlob } = await exportToPDF();
    currentPatientData.pdfFilename = filename;
    currentPatientData.pdfBlob = pdfBlob;

    const patientId = await patientDB.addPatient(currentPatientData);
    alert(`Patient record saved successfully!\n\nRecord ID: ${patientId}\nData encrypted and stored securely.`);

    // Reset for the next patient
    if (webcam?._videoEl?.srcObject) {
      webcam._videoEl.srcObject.getTracks().forEach((t) => t.stop());
    }
    resetState();
    setTimeout(resetUI, 100);
  } catch (error) {
    console.error("Error saving patient record:", error);
    alert("PDF exported but failed to save patient record.\n\nError: " + error.message);
  }
}

// ========== Records Modal ==========

viewRecordsBtn.addEventListener("click", () => {
  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }
  recordsModal.style.display = "block";
  loadAllRecords();
});

closeModal.addEventListener("click", () => {
  recordsModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === recordsModal) recordsModal.style.display = "none";
});

// ========== Search ==========

searchBtn.addEventListener("click", async () => {
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) return;

  try {
    const results = await patientDB.searchPatientsByName(searchTerm);
    displayRecords(results);
  } catch (error) {
    console.error("Error searching records:", error);
    alert("Failed to search records. Please try again.");
  }
});

showAllBtn.addEventListener("click", () => loadAllRecords());

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// ========== Database Operations ==========

async function loadAllRecords() {
  try {
    const patients = await patientDB.getAllPatients();
    displayRecords(patients);
  } catch (error) {
    console.error("Error loading records:", error);
    recordsList.innerHTML = "<p>Error loading records. Please check your password and try again.</p>";
  }
}

function displayRecords(patients) {
  if (patients.length === 0) {
    recordsList.innerHTML = "<p>No records found.</p>";
    return;
  }

  let html = "<div class='table-wrapper'><table class='records-table'>";
  html += "<thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Sex</th><th>Date</th><th>Actions</th></tr></thead>";
  html += "<tbody>";

  patients.forEach((patient) => {
    const date = new Date(patient.createdAt).toLocaleDateString();
    const showPdfButton = patient.pdfBlob || patient.pdfFilename;

    html += `<tr>
      <td>${patient.id}</td>
      <td>${patient.name}</td>
      <td>${patient.age}</td>
      <td>${patient.sex}</td>
      <td>${date}</td>
      <td>
        <button onclick="viewPatientDetails(${patient.id})">View</button>
        ${showPdfButton ? `<button onclick="downloadPatientPDF(${patient.id})">Download PDF</button>` : ""}
        <button onclick="deletePatientRecord(${patient.id})">Delete</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table></div>";
  recordsList.innerHTML = html;
}

async function viewPatientDetails(id) {
  try {
    const patient = await patientDB.getPatientById(id);
    if (!patient) return;

    const pdfInfo = patient.pdfBlob
      ? `PDF: ${patient.pdfFilename} (Available for download)`
      : patient.pdfFilename
        ? `PDF: ${patient.pdfFilename} (File not stored)`
        : "PDF: Not available";

    alert(
      `Patient Details:\n\n` +
      `Name: ${patient.name}\n` +
      `Age: ${patient.age}\n` +
      `Sex: ${patient.sex}\n` +
      `Notes: ${patient.notes || "None"}\n` +
      `${pdfInfo}\n` +
      `Created: ${new Date(patient.createdAt).toLocaleString()}\n\n` +
      `This data is encrypted in storage.`
    );
  } catch (error) {
    console.error("Error viewing patient:", error);
    alert("Failed to load patient details. Decryption may have failed.");
  }
}

async function downloadPatientPDF(id) {
  try {
    const patient = await patientDB.getPatientById(id);

    if (!patient) {
      alert("Patient record not found.");
      return;
    }

    if (!patient.pdfBlob) {
      alert("PDF file not available. The PDF may have been generated before this feature was added.");
      return;
    }

    const blob = patient.pdfBlob instanceof Blob
      ? patient.pdfBlob
      : new Blob([patient.pdfBlob], { type: "application/pdf" });

    const filename = patient.pdfFilename || `Patient_${patient.id}_${patient.name.replace(/\s+/g, "_")}_Report.pdf`;
    const pdfFile = new File([blob], filename, { type: "application/pdf" });

    // Use the native share sheet on mobile — iOS Safari ignores <a download> on blob URLs
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: filename });
      } catch (e) {
        if (e.name !== "AbortError") console.warn("Share failed:", e);
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert(`Failed to download PDF: ${error.message}`);
  }
}

async function deletePatientRecord(id) {
  if (confirm("Are you sure you want to delete this patient record?\n\nThis action cannot be undone.")) {
    try {
      await patientDB.deletePatient(id);
      loadAllRecords();
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Failed to delete record.");
    }
  }
}

// ========== Global Exports ==========

window.viewPatientDetails = viewPatientDetails;
window.deletePatientRecord = deletePatientRecord;
window.exportToPDFWithPatient = exportToPDFWithPatient;
window.downloadPatientPDF = downloadPatientPDF;
