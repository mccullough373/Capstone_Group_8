/**
 * App.js - PG Scanner Main Application Logic
 *
 * Handles:
 * - Patient form validation
 * - Camera initialization
 * - Patient record management (CRUD operations)
 * - Modal interactions
 * - Database integration
 */

// ========== DOM Element References ==========
const StartCamBtn = document.getElementById("StartCamBtn");
const PDFbtn = document.getElementById("PDFbtn");
const textElement = document.getElementById("text");
const patientForm = document.getElementById("patient-form");
const patientFormContainer = document.getElementById("patient-form-container");
const viewRecordsBtn = document.getElementById("view-records-btn");
const recordsModal = document.getElementById("records-modal");
const closeModal = document.querySelector(".close");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const showAllBtn = document.getElementById("show-all-btn");
const recordsList = document.getElementById("records-list");

// ========== Application State ==========
let currentPatientData = null;

// ========== Database Initialization ==========
patientDB
  .init()
  .then(() => {
    console.log("Patient database initialized");
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    alert("Warning: Database initialization failed. Records may not be saved.");
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
 * Validates form, stores patient data, and initializes webcam + ML model
 */
StartCamBtn.addEventListener("click", async () => {
  console.log("Start Camera button clicked");

  // Validate form before starting camera
  if (!validatePatientForm()) {
    return;
  }

  // Store patient data for later PDF export
  currentPatientData = {
    name: document.getElementById("patient-name").value.trim(),
    age: parseInt(document.getElementById("patient-age").value),
    sex: document.getElementById("patient-sex").value,
    notes: document.getElementById("patient-notes").value.trim(),
  };

  console.log("Patient data captured:", currentPatientData);

  // Update button state
  StartCamBtn.disabled = true;
  StartCamBtn.textContent = "Loading...";

  try {
    console.log("Calling init() function...");
    await init(); // Defined in TeachableScript.js
    console.log("Camera initialized successfully");

    // Update UI: hide form and start button, show PDF button
    StartCamBtn.style.display = "none";
    PDFbtn.style.display = "inline-block";
    textElement.style.display = "inline-block";
    patientFormContainer.style.display = "none";
  } catch (error) {
    console.error("Failed to start camera:", error);
    alert(
      "Failed to start camera. Please check permissions and try again.\n\nError: " +
        error.message
    );

    // Reset button state on error
    StartCamBtn.disabled = false;
    StartCamBtn.textContent = "Start Camera Feed";
  }
});

// ========== PDF Export with Database Save ==========

/**
 * Exports current scan to PDF and saves patient record to database
 * Called via onclick handler in HTML
 */
async function exportToPDFWithPatient() {
  if (!currentPatientData) {
    alert("Patient data not found. Please restart the application.");
    return;
  }

  try {
    // Generate PDF (returns filename)
    const pdfFilename = await exportToPDF(); // Defined in PdfExport.js

    // Add PDF filename to patient data
    currentPatientData.pdfFilename = pdfFilename;

    // Save complete record to IndexedDB
    const patientId = await patientDB.addPatient(currentPatientData);

    alert(`Patient record saved successfully! Record ID: ${patientId}`);
  } catch (error) {
    console.error("Error saving patient record:", error);
    alert(
      "PDF exported but failed to save patient record.\n\nError: " +
        error.message
    );
  }
}

// ========== Records Modal Management ==========

/**
 * Open modal and load all patient records
 */
viewRecordsBtn.addEventListener("click", () => {
  recordsModal.style.display = "block";
  loadAllRecords();
});

/**
 * Close modal when X is clicked
 */
closeModal.addEventListener("click", () => {
  recordsModal.style.display = "none";
});

/**
 * Close modal when clicking outside the modal content
 */
window.addEventListener("click", (event) => {
  if (event.target === recordsModal) {
    recordsModal.style.display = "none";
  }
});

// ========== Search Functionality ==========

/**
 * Search patient records by name
 */
searchBtn.addEventListener("click", async () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    const results = await patientDB.searchPatientsByName(searchTerm);
    displayRecords(results);
  }
});

/**
 * Show all records (clear search filter)
 */
showAllBtn.addEventListener("click", () => {
  loadAllRecords();
});

/**
 * Allow Enter key to trigger search
 */
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

// ========== Database Operations ==========

/**
 * Loads all patient records from database and displays them
 */
async function loadAllRecords() {
  try {
    const patients = await patientDB.getAllPatients();
    displayRecords(patients);
  } catch (error) {
    console.error("Error loading records:", error);
    recordsList.innerHTML = "<p>Error loading records.</p>";
  }
}

/**
 * Displays patient records in a table format
 * @param {Array} patients - Array of patient objects from database
 */
function displayRecords(patients) {
  if (patients.length === 0) {
    recordsList.innerHTML = "<p>No records found.</p>";
    return;
  }

  // Build table HTML
  let html = "<table class='records-table'>";
  html +=
    "<thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Sex</th><th>Date</th><th>PDF</th><th>Actions</th></tr></thead>";
  html += "<tbody>";

  patients.forEach((patient) => {
    const date = new Date(patient.createdAt).toLocaleDateString();
    html += `<tr>
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.sex}</td>
            <td>${date}</td>
            <td>${patient.pdfFilename || "N/A"}</td>
            <td>
              <button onclick="viewPatientDetails(${patient.id})">View</button>
              <button onclick="deletePatientRecord(${
                patient.id
              })">Delete</button>
            </td>
          </tr>`;
  });

  html += "</tbody></table>";
  recordsList.innerHTML = html;
}

/**
 * Displays detailed information for a specific patient
 * @param {number} id - Patient record ID
 */
async function viewPatientDetails(id) {
  try {
    const patient = await patientDB.getPatientById(id);
    if (patient) {
      alert(
        `Patient Details:\n\nName: ${patient.name}\nAge: ${patient.age}\nSex: ${
          patient.sex
        }\nNotes: ${patient.notes || "None"}\nPDF: ${
          patient.pdfFilename || "N/A"
        }\nCreated: ${new Date(patient.createdAt).toLocaleString()}`
      );
    }
  } catch (error) {
    console.error("Error viewing patient:", error);
  }
}

/**
 * Deletes a patient record after confirmation
 * @param {number} id - Patient record ID to delete
 */
async function deletePatientRecord(id) {
  if (confirm("Are you sure you want to delete this patient record?")) {
    try {
      await patientDB.deletePatient(id);
      alert("Record deleted successfully!");
      loadAllRecords(); // Refresh the list
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Failed to delete record.");
    }
  }
}

// ========== Global Function Exports ==========
// Make functions available for onclick handlers in dynamically generated HTML
window.viewPatientDetails = viewPatientDetails;
window.deletePatientRecord = deletePatientRecord;
window.exportToPDFWithPatient = exportToPDFWithPatient;

// ========== Debug Logging ==========
window.addEventListener("load", () => {
  console.log("Page fully loaded");
  console.log("init function available:", typeof init !== "undefined");
});
