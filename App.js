/**
 * App.js - PG Scanner Main Application Logic
 *
 * Handles:
 * - Encryption setup and password verification on page load
 * - Patient form validation and data capture
 * - Camera / image scan initialization
 * - Patient record management (create, read, delete)
 * - PDF export and database integration
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
 * On page load, check whether encryption has been set up before.
 * - First visit: show the encryption setup modal.
 * - Returning user: prompt for the master password to unlock the app.
 */
window.addEventListener("load", async () => {
  console.log("Page fully loaded");
  console.log("init function available:", typeof init !== "undefined");

  // Check if encryption is already set up
  const hasEncryption = localStorage.getItem("encryption_salt");

  if (!hasEncryption) {
    // First time - show encryption setup modal
    console.log("First time setup - showing encryption modal");
    encryptionmodel.style.display = "block";
  } else {
    // Returning user - ask for password with verification
    await promptForPassword();
  }
});

/**
 * Prompts the returning user for their master password.
 * Verifies the entry by attempting to decrypt a stored verification token.
 * Locks the app after 3 consecutive failed attempts.
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
      // Step 1: Derive an AES-GCM key from the entered password
      await encryption.init(password);
      console.log("Encryption key generated from password");

      // Step 2: Verify the password is correct by decrypting the stored token.
      // If the wrong password was entered, decryption will throw an error.
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
        console.log("Password verified successfully!");

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

      // Clear the derived key so it cannot be used after a failed attempt
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
 * Handles first-time encryption setup.
 * Validates the password strength and match, derives an AES-GCM key,
 * stores an encrypted verification token in localStorage, then opens
 * the database so the app is ready to use.
 */
setupEncryptionBtn.addEventListener("click", async () => {
  const password = masterPasswordInput.value;
  const confirm = confirmPasswordInput.value;

  // Validate password length
  if (!password || password.length < 8) {
    encryptionError.textContent = "Password must be at least 12 characters";
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
    // Derive the AES-GCM key from the master password
    await encryption.init(password);
    console.log("Encryption initialized successfully");

    // Store a known plaintext encrypted with the key so we can verify
    // the correct password is entered on future visits.
    const verificationData = {
      verify: "PG_SCANNER_AUTH_TOKEN",
      created: new Date().toISOString(),
    };

    const encryptedToken = await encryption.encrypt(verificationData);
    localStorage.setItem("encryption_verification", encryptedToken);
    console.log("Verification token created and stored");

    // Initialize the IndexedDB patient database
    await patientDB.init();
    console.log("Patient database initialized");

    // Hide modal and prompt the user to remember their password
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
 * Validates and previews the selected image file.
 * Rejects non-image files and files larger than 5 MB.
 * On success, reads the file as a base64 data URL and shows a thumbnail.
 */
patientImageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      patientImageInput.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB limit
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
 * Clears the uploaded image and hides the preview thumbnail.
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
 * Validates patient form inputs before camera activation.
 * @returns {boolean} True if all required fields are valid, false otherwise
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
 * Captures the patient form data, then calls init() in TeachableScript.js
 * to start the ML scan using either the uploaded image or the webcam.
 */
StartCamBtn.addEventListener("click", async () => {
  console.log("Start Scan button clicked");

  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }

  if (!validatePatientForm()) {
    return;
  }

  // Snapshot the form values into the current patient object
  currentPatientData = {
    name: document.getElementById("patient-name").value.trim(),
    age: parseInt(document.getElementById("patient-age").value),
    sex: document.getElementById("patient-sex").value,
    notes: document.getElementById("patient-notes").value.trim(),
    uploadedImage: uploadedImageData,
  };

  StartCamBtn.disabled = true;
  StartCamBtn.textContent = "Loading...";

  try {
    console.log("Calling init() function...");
    // Pass uploadedImageData directly so it never needs to be a window global
    await init(uploadedImageData);
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
    StartCamBtn.textContent = "Start Scan";
  }
});

// ========== Back Button Handler ==========

/**
 * Stops the ML scan, tears down the webcam, clears the form,
 * and returns the UI to the patient entry screen.
 */
backBtn.addEventListener("click", () => {
  // Signal the prediction loop to stop
  isRunning = false;

  // Stop the video stream if it was running in webcam mode
  if (typeof videoElement !== "undefined" && videoElement) {
    try {
      videoElement.srcObject?.getTracks().forEach((t) => t.stop());
      videoElement.srcObject = null;
      videoElement = null;
    } catch (e) {
      console.log("Video stream already stopped or not initialized");
    }
  }

  // Wait for any in-flight predict() calls to finish before clearing the DOM
  setTimeout(() => {
    document.getElementById("label-container").innerHTML = "";
    document.getElementById("lighting-container").innerHTML = "";
  }, 100);

  // Remove webcam canvas or uploaded image from the container
  const webcamContainer = document.getElementById("webcam-container");
  webcamContainer.innerHTML = "";

  // Reset application state
  currentPatientData = null;
  uploadedImageData = null;

  // Reset form fields
  document.getElementById("patient-name").value = "";
  document.getElementById("patient-age").value = "";
  document.getElementById("patient-sex").value = "";
  document.getElementById("patient-notes").value = "";
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";

  // Restore the patient entry UI
  patientFormContainer.style.display = "block";
  StartCamBtn.style.display = "block";
  StartCamBtn.disabled = false;
  StartCamBtn.textContent = "Start Scan";
  PDFbtn.style.display = "none";
  backBtn.style.display = "none";
  textElement.style.display = "none";

  console.log("Returned to patient form - ready for new patient");
});

// ========== PDF Export with Database Save ==========

/**
 * Generates a PDF report for the current scan result, then saves the patient
 * record (including the PDF blob) to the encrypted IndexedDB database.
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

// ========== Records Modal Management ==========

// Open the records modal and load all stored patient records.
viewRecordsBtn.addEventListener("click", () => {
  if (!encryption.isInitialized()) {
    alert("Encryption not initialized. Please refresh the page.");
    return;
  }

  recordsmodel.style.display = "block";
  loadAllRecords();
});

// Close the records modal when the × button is clicked.
closemodel.addEventListener("click", () => {
  recordsmodel.style.display = "none";
});

// Close the records modal when clicking outside of it.
window.addEventListener("click", (event) => {
  if (event.target === recordsmodel) {
    recordsmodel.style.display = "none";
  }
});

// ========== Search Functionality ==========

// Search patients by name or ID when the search button is clicked.
searchBtn.addEventListener("click", async () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    try {
      const results = await patientDB.searchPatients(searchTerm);
      displayRecords(results);
    } catch (error) {
      console.error("Error searching records:", error);
      alert("Failed to search records. Please try again.");
    }
  }
});

// Reset the list to show all records.
showAllBtn.addEventListener("click", () => {
  loadAllRecords();
});

// Allow pressing Enter in the search box to trigger the search.
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

// ========== Database Operations ==========

/**
 * Loads all patient records from the database and renders them in the modal.
 */
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

/**
 * Renders patient records as an HTML table inside the records modal.
 * Each row shows ID, name, age, sex, date, and action buttons.
 * A "Download PDF" button is only shown if a PDF blob is stored for the record.
 * @param {Array} patients - Array of decrypted patient objects from the database
 */
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

/**
 * Fetches a single patient record by ID and shows its details in an alert dialog.
 * @param {number} id - The patient's database record ID
 */
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

/**
 * Downloads the stored PDF report for a patient, triggering a browser save dialog.
 * Reconstructs the PDF Blob from stored data if it isn't already a Blob instance.
 * @param {number} id - The patient's database record ID
 */
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

    // Ensure we have a proper Blob (older records may store raw ArrayBuffer data)
    let blob;
    if (patient.pdfBlob instanceof Blob) {
      blob = patient.pdfBlob;
    } else {
      console.log("Reconstructing blob from stored data");
      blob = new Blob([patient.pdfBlob], { type: "application/pdf" });
    }

    // Create a temporary anchor element to trigger the file download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      patient.pdfFilename ||
      `Patient_${patient.id}_${patient.name.replace(/\s+/g, "_")}_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Free the object URL after download

    console.log(`PDF downloaded successfully: ${a.download}`);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert(`Failed to download PDF: ${error.message}`);
  }
}

/**
 * Asks for confirmation then permanently removes a patient record from the database.
 * @param {number} id - The patient's database record ID
 */
async function deletePatientRecord(id) {
  if (
    confirm(
      "Are you sure you want to delete this patient record?\n\nThis action cannot be undone.",
    )
  ) {
    try {
      await patientDB.deletePatient(id);
      alert("Record deleted successfully!");
      loadAllRecords(); // Refresh the list after deletion
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Failed to delete record.");
    }
  }
}

// ========== Global Function Exports ==========
// These functions are called from onclick attributes in dynamically generated HTML
// (see displayRecords), so they must be exposed on the window object.
window.viewPatientDetails = viewPatientDetails;
window.deletePatientRecord = deletePatientRecord;
window.exportToPDFWithPatient = exportToPDFWithPatient;
window.downloadPatientPDF = downloadPatientPDF;
