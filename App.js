/**
 * App.js - PG Scanner Application Logic
 *
 * Handles:
 * - Encryption setup and password verification
 * - Patient form validation and state
 * - Camera initialization and teardown
 * - Patient record management (CRUD)
 * - Modal interactions
 * - Database integration
 */

// ========== DOM Element References ==========
const StartCamBtn = document.getElementById("StartCamBtn");
const PDFbtn = document.getElementById("PDFbtn");
const backBtn = document.getElementById("back-btn");
const textElement = document.getElementById("text");
const patientFormContainer = document.getElementById("patient-form-container");
const takePhotoBtn = document.getElementById("TakePhotoBtn");
const viewRecordsBtn = document.getElementById("view-records-btn");
const recordsModal = document.getElementById("records-model");
const closeModal = document.querySelector(".close");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const showAllBtn = document.getElementById("show-all-btn");
const recordsList = document.getElementById("records-list");

// Encryption modal elements
const encryptionModal = document.getElementById("encryption-model");
const setupEncryptionBtn = document.getElementById("setup-encryption-btn");
const masterPasswordInput = document.getElementById("master-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const encryptionError = document.getElementById("encryption-error");

// Image upload elements
const patientImageInput = document.getElementById("patient-image");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");

// ========== Application State ==========
let currentPatientData = null;
let uploadedImageData = null;

// ========== Encryption & Database Initialization ==========

window.addEventListener("load", async () => {
  const hasEncryption = localStorage.getItem("encryption_salt");

  if (!hasEncryption) {
    encryptionModal.style.display = "block";
  } else {
    await promptForPassword();
  }
});

/**
 * Prompts the user for their master password and verifies it against
 * the stored verification token. Allows up to 3 attempts.
 */
async function promptForPassword() {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const password = prompt(
      attempts === 0
        ? "Enter master password to unlock application:"
        : `Incorrect password. Attempt ${attempts + 1}/${maxAttempts}:`
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
        await patientDB.init();
        return;
      } else {
        throw new Error("Verification token mismatch");
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      attempts++;
      encryption.key = null;

      if (attempts >= maxAttempts) {
        alert("Too many failed attempts.\n\nPlease refresh the page and try again.");
        location.reload();
        return;
      }
    }
  }
}

/**
 * Handles first-time encryption setup. Creates and stores a verification
 * token so the password can be checked on future logins.
 */
setupEncryptionBtn.addEventListener("click", async () => {
  const password = masterPasswordInput.value;
  const confirm = confirmPasswordInput.value;

  if (!password || password.length < 8) {
    encryptionError.textContent = "Password must be at least 8 characters";
    encryptionError.style.display = "block";
    return;
  }

  if (password !== confirm) {
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

// ========== Image Upload Handling ==========

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

/**
 * Validates required patient form fields before starting a scan.
 * @returns {boolean} True if all fields are valid
 */
function validatePatientForm() {
  const name = document.getElementById("patient-name").value.trim();
  const age = document.getElementById("patient-age").value;
  const sex = document.getElementById("patient-sex").value;

  if (!name) {
    alert("Please enter patient name.");
    return false;
  }
  if (!age || age < 0 || age > 150) {
    alert("Please enter a valid age (0-150).");
    return false;
  }
  if (!sex) {
    alert("Please select patient sex.");
    return false;
  }
  return true;
}

// ========== Camera Initialization ==========

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
    textElement.style.display = "block";
    patientFormContainer.style.display = "none";

    if (!window.uploadedImageData) {
      // Webcam mode: hold PDF/back until the user takes a photo
      takePhotoBtn.style.display = "inline-block";
    } else {
      // Uploaded image mode: prediction already ran, show all buttons
      PDFbtn.style.display = "block";
      backBtn.style.display = "block";
    }
  } catch (error) {
    console.error("Failed to start camera:", error);
    alert("Failed to start camera. Please check permissions and try again.\n\nError: " + error.message);
    StartCamBtn.disabled = false;
    StartCamBtn.textContent = "Start Scan";
  }
});

takePhotoBtn.addEventListener("click", async () => {
  // Open the PDF tab NOW, synchronously, while iOS still considers this a user gesture.
  // Any window.open() called after an await is blocked by iOS Safari's popup rules.
  // On desktop, skip the pre-open — the download path doesn't need it.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const pdfWindow = isMobile ? window.open("", "_blank") : null;

  // Freeze the current frame before anything else so the PDF always matches the scan
  if (webcam?.canvas) {
    window.scannedFrameData = webcam.canvas.toDataURL("image/jpeg", 0.92);
  }

  await captureAndPredict();
  await exportToPDFWithPatient(pdfWindow);

  // Freeze the preview — stop the loop and release the camera stream
  isRunning = false;
  if (webcam?._videoEl?.srcObject) {
    webcam._videoEl.srcObject.getTracks().forEach((t) => t.stop());
  }

  takePhotoBtn.style.display = "none";
  document.getElementById("FlipCamBtn").style.display = "none";
  backBtn.style.display = "block";
});

// ========== Back Button ==========

backBtn.addEventListener("click", () => {
  isRunning = false;

  // Stop the active camera stream
  if (webcam && webcam._videoEl) {
    const stream = webcam._videoEl.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  // Brief delay lets any in-flight predict() call finish before clearing the UI
  setTimeout(() => {
    document.getElementById("label-container").innerHTML = "";
    document.getElementById("lighting-container").innerHTML = "";
  }, 100);

  document.getElementById("webcam-container").innerHTML = "";

  // Reset state
  currentPatientData = null;
  uploadedImageData = null;
  window.uploadedImageData = null;
  window.scannedFrameData = null;

  // Reset form
  document.getElementById("patient-name").value = "";
  document.getElementById("patient-age").value = "";
  document.getElementById("patient-sex").value = "";
  document.getElementById("patient-notes").value = "";
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";

  // Reset UI
  patientFormContainer.style.display = "block";
  StartCamBtn.style.display = "block";
  StartCamBtn.disabled = false;
  StartCamBtn.textContent = "Start Scan";
  takePhotoBtn.style.display = "none";
  document.getElementById("FlipCamBtn").style.display = "none";
  PDFbtn.style.display = "none";
  backBtn.style.display = "none";
  textElement.style.display = "none";
});

// ========== PDF Export ==========

/**
 * Exports the current scan to PDF and saves the patient record to the database.
 */
async function exportToPDFWithPatient(pdfWindow) {
  if (!currentPatientData) {
    alert("Patient data not found. Please restart the application.");
    return;
  }

  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Cannot save patient data.");
    return;
  }

  // iOS Safari blocks window.open() after an await, so pre-open the tab synchronously.
  // On desktop, window.open() after an await is fine, so skip the pre-open there —
  // navigating a blank window to a blob URL is less reliable than opening the URL directly.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const win = pdfWindow ?? (isMobile ? window.open("", "_blank") : null);

  try {
    const { filename, pdfBlob } = await exportToPDF(win);
    currentPatientData.pdfFilename = filename;
    currentPatientData.pdfBlob = pdfBlob;

    const patientId = await patientDB.addPatient(currentPatientData);
    alert(`Patient record saved successfully!\n\nRecord ID: ${patientId}\nData encrypted and stored securely.`);
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
  if (event.target === recordsModal) {
    recordsModal.style.display = "none";
  }
});

// ========== Search ==========

searchBtn.addEventListener("click", async () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    try {
      const results = await patientDB.searchPatientsByName(searchTerm);
      displayRecords(results);
    } catch (error) {
      console.error("Error searching records:", error);
      alert("Failed to search records. Please try again.");
    }
  }
});

showAllBtn.addEventListener("click", () => {
  loadAllRecords();
});

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
    if (patient) {
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
    }
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

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = patient.pdfFilename || `Patient_${patient.id}_${patient.name.replace(/\s+/g, "_")}_Report.pdf`;
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
      alert("Record deleted successfully!");
      loadAllRecords();
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Failed to delete record.");
    }
  }
}

// ========== Global Function Exports ==========
window.viewPatientDetails = viewPatientDetails;
window.deletePatientRecord = deletePatientRecord;
window.exportToPDFWithPatient = exportToPDFWithPatient;
window.downloadPatientPDF = downloadPatientPDF;
