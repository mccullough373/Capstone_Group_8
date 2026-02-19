/**
 * App.js - PG Scanner Main Application Logic - FIXED PASSWORD VERIFICATION
 *
 * Handles:
 * - Encryption setup and initialization with verification token
 * - Proper password verification on load
 * - Patient form validation
 * - Camera initialization
 * - Patient record management (CRUD operations)
 * - model interactions
 * - Database integration
 */

// ========== DOM Element References ==========
const StartCamBtn = document.getElementById("StartCamBtn");
const PDFbtn = document.getElementById("PDFbtn");
const backBtn = document.getElementById("back-btn");
const textElement = document.getElementById("text");
const patientForm = document.getElementById("patient-form");
const patientFormContainer = document.getElementById("patient-form-container");
const viewRecordsBtn = document.getElementById("view-records-btn");
const recordsmodel = document.getElementById("records-model");
const closemodel = document.querySelector(".close");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const showAllBtn = document.getElementById("show-all-btn");
const recordsList = document.getElementById("records-list");

// Encryption model elements
const encryptionmodel = document.getElementById("encryption-model");
const setupEncryptionBtn = document.getElementById("setup-encryption-btn");
const masterPasswordInput = document.getElementById("master-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const encryptionError = document.getElementById("encryption-error");

// Image upload elements
const patientImageInput = document.getElementById("patient-image");
const imagePreviewContainer = document.getElementById(
  "image-preview-container",
);
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");

// ========== Application State ==========
let currentPatientData = null;
let uploadedImageData = null; // Stores base64 data URL of uploaded image

// ========== Encryption & Database Initialization ==========

/**
 * Initialize encryption and database on page load
 */
window.addEventListener("load", async () => {
  console.log("Page fully loaded");
  console.log("init function available:", typeof init !== "undefined");

  // Check if encryption is already set up
  const hasEncryption = localStorage.getItem("encryption_salt");

  if (!hasEncryption) {
    // First time - show encryption setup model
    console.log("First time setup - showing encryption model");
    encryptionmodel.style.display = "block";
  } else {
    // Returning user - ask for password with verification
    await promptForPassword();
  }
});

/**
 * Prompt user for master password to unlock application
 * NOW WITH PROPER PASSWORD VERIFICATION USING A TEST TOKEN!
 */
async function promptForPassword() {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const password = prompt(
      attempts === 0
        ? "Enter master password to unlock application:"
        : `Incorrect password. Attempt ${attempts + 1}/${maxAttempts}:`,
    );

    if (!password) {
      alert("Password required to access application");
      location.reload();
      return;
    }

    try {
      // Step 1: Initialize encryption with the password
      await encryption.init(password);
      console.log("Encryption key generated from password");

      // Step 2: CRITICAL - Verify password by decrypting the stored verification token
      const verificationToken = localStorage.getItem("encryption_verification");

      if (!verificationToken) {
        console.error(
          "No verification token found! Encryption was not set up properly.",
        );
        alert(
          "Security error: Verification token missing. Please clear browser data and set up again.",
        );
        localStorage.removeItem("encryption_salt");
        location.reload();
        return;
      }

      // Try to decrypt the verification token
      const decryptedToken = await encryption.decrypt(verificationToken);

      // Check if the decrypted token matches our expected value
      if (decryptedToken.verify === "PG_SCANNER_AUTH_TOKEN") {
        console.log(" Password verified successfully!");

        // Step 3: Initialize database after successful verification
        await patientDB.init();
        console.log("Database initialized");

        return; // Exit function - user is authenticated
      } else {
        throw new Error("Verification token mismatch");
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      attempts++;

      // Reset encryption key on failed attempt
      encryption.key = null;

      if (attempts >= maxAttempts) {
        alert(
          "Too many failed attempts.\n\nPlease refresh the page and try again.",
        );
        location.reload();
        return;
      }
      // Loop will continue for another attempt
    }
  }
}

/**
 * Handle encryption setup for first-time users
 * NOW CREATES A VERIFICATION TOKEN!
 */
setupEncryptionBtn.addEventListener("click", async () => {
  const password = masterPasswordInput.value;
  const confirm = confirmPasswordInput.value;

  // Validate password length
  if (!password || password.length < 8) {
    encryptionError.textContent = "Password must be at least 8 characters";
    encryptionError.style.display = "block";
    return;
  }

  // Validate password match
  if (password !== confirm) {
    encryptionError.textContent = "Passwords do not match";
    encryptionError.style.display = "block";
    return;
  }

  try {
    // Initialize encryption with master password
    await encryption.init(password);
    console.log("Encryption initialized successfully");

    // CRITICAL: Create and store a verification token
    const verificationData = {
      verify: "PG_SCANNER_AUTH_TOKEN",
      created: new Date().toISOString(),
    };

    const encryptedToken = await encryption.encrypt(verificationData);
    localStorage.setItem("encryption_verification", encryptedToken);
    console.log("Verification token created and stored");

    // Initialize database
    await patientDB.init();
    console.log("Patient database initialized");

    // Hide model and show success message
    encryptionmodel.style.display = "none";
    alert(
      "Encryption setup successful!\n\nIMPORTANT: Remember your password - it cannot be recovered!",
    );
  } catch (error) {
    console.error("Encryption setup error:", error);
    encryptionError.textContent = "Setup failed: " + error.message;
    encryptionError.style.display = "block";
  }
});

// ========== Image Upload Handling ==========

/**
 * Handle image file selection and preview
 */
patientImageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      patientImageInput.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Image file is too large. Please select an image under 5MB.");
      patientImageInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImageData = e.target.result;
      imagePreview.src = uploadedImageData;
      imagePreviewContainer.style.display = "block";
      console.log("Image uploaded and previewed successfully");
    };
    reader.onerror = () => {
      alert("Failed to read image file. Please try again.");
      patientImageInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

/**
 * Handle image removal
 */
removeImageBtn.addEventListener("click", () => {
  uploadedImageData = null;
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";
  console.log("Uploaded image removed");
});

// ========== Form Validation ==========

/**
 * Validates patient form inputs before camera activation
 * @returns {boolean} True if all required fields are valid
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

/**
 * Start Camera button event handler
 */
StartCamBtn.addEventListener("click", async () => {
  console.log("Start Camera button clicked");

  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }

  if (!validatePatientForm()) {
    return;
  }

  currentPatientData = {
    name: document.getElementById("patient-name").value.trim(),
    age: parseInt(document.getElementById("patient-age").value),
    sex: document.getElementById("patient-sex").value,
    notes: document.getElementById("patient-notes").value.trim(),
    uploadedImage: uploadedImageData,
  };

  console.log("Patient data captured:", currentPatientData);

  window.uploadedImageData = uploadedImageData;

  StartCamBtn.disabled = true;
  StartCamBtn.textContent = "Loading...";

  try {
    console.log("Calling init() function...");
    await init();
    console.log("Camera initialized successfully");

    StartCamBtn.style.display = "none";
    PDFbtn.style.display = "block";
    backBtn.style.display = "block";
    textElement.style.display = "block";
    patientFormContainer.style.display = "none";
  } catch (error) {
    console.error("Failed to start camera:", error);
    alert(
      "Failed to start camera. Please check permissions and try again.\n\nError: " +
        error.message,
    );
    StartCamBtn.disabled = false;
    StartCamBtn.textContent = "Start Camera Feed";
  }
});

// ========== Back Button Handler ==========

/**
 * Handle back button click to return to patient form
 */
backBtn.addEventListener("click", () => {
  // Stop the prediction loop first
  isRunning = false;

  // Stop and clear webcam if running
  if (typeof webcam !== "undefined" && webcam) {
    try {
      webcam.stop();
    } catch (e) {
      console.log("Webcam already stopped or not initialized");
    }
  }

  // Wait for any in-flight predict() calls to finish before clearing
  setTimeout(() => {
    document.getElementById("label-container").innerHTML = "";
    document.getElementById("lighting-container").innerHTML = "";
  }, 100);

  // Clear webcam container
  const webcamContainer = document.getElementById("webcam-container");
  webcamContainer.innerHTML = "";

  // Reset application state
  currentPatientData = null;
  uploadedImageData = null;
  window.uploadedImageData = null;

  // Reset form fields
  document.getElementById("patient-name").value = "";
  document.getElementById("patient-age").value = "";
  document.getElementById("patient-sex").value = "";
  document.getElementById("patient-notes").value = "";
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";

  // Update UI
  patientFormContainer.style.display = "block";
  StartCamBtn.style.display = "block";
  StartCamBtn.disabled = false;
  StartCamBtn.textContent = "Start Camera Feed";
  PDFbtn.style.display = "none";
  backBtn.style.display = "none";
  textElement.style.display = "none";

  console.log("Returned to patient form - ready for new patient");
});

// ========== PDF Export with Database Save ==========

/**
 * Exports current scan to PDF and saves patient record to database
 */
async function exportToPDFWithPatient() {
  if (!currentPatientData) {
    alert("Patient data not found. Please restart the application.");
    return;
  }

  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Cannot save patient data.");
    return;
  }

  try {
    const { filename, pdfBlob } = await exportToPDF();

    currentPatientData.pdfFilename = filename;
    currentPatientData.pdfBlob = pdfBlob;

    const patientId = await patientDB.addPatient(currentPatientData);

    alert(
      `Patient record saved successfully!\n\nRecord ID: ${patientId}\nData encrypted and stored securely.`,
    );
  } catch (error) {
    console.error("Error saving patient record:", error);
    alert(
      "PDF exported but failed to save patient record.\n\nError: " +
        error.message,
    );
  }
}

// ========== Records model Management ==========

viewRecordsBtn.addEventListener("click", () => {
  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }

  recordsmodel.style.display = "block";
  loadAllRecords();
});

closemodel.addEventListener("click", () => {
  recordsmodel.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === recordsmodel) {
    recordsmodel.style.display = "none";
  }
});

// ========== Search Functionality ==========

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
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

// ========== Database Operations ==========

async function loadAllRecords() {
  try {
    const patients = await patientDB.getAllPatients();
    displayRecords(patients);
  } catch (error) {
    console.error("Error loading records:", error);
    recordsList.innerHTML =
      "<p>Error loading records. Please check your password and try again.</p>";
  }
}

function displayRecords(patients) {
  if (patients.length === 0) {
    recordsList.innerHTML = "<p>No records found.</p>";
    return;
  }

  let html = "<table class='records-table'>";
  html +=
    "<thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Sex</th><th>Date</th><th>Actions</th></tr></thead>";
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
        ${
          showPdfButton
            ? `<button onclick="downloadPatientPDF(${patient.id})">Download PDF</button>`
            : ""
        }
        <button onclick="deletePatientRecord(${patient.id})">Delete</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table>";
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
          `This data is encrypted in storage.`,
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
      alert(
        "PDF file not available. The PDF may have been generated before this feature was added.",
      );
      return;
    }

    let blob;
    if (patient.pdfBlob instanceof Blob) {
      blob = patient.pdfBlob;
    } else {
      console.log("Reconstructing blob from stored data");
      blob = new Blob([patient.pdfBlob], { type: "application/pdf" });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      patient.pdfFilename ||
      `Patient_${patient.id}_${patient.name.replace(/\s+/g, "_")}_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`PDF downloaded successfully: ${a.download}`);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert(`Failed to download PDF: ${error.message}`);
  }
}

async function deletePatientRecord(id) {
  if (
    confirm(
      "Are you sure you want to delete this patient record?\n\nThis action cannot be undone.",
    )
  ) {
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
