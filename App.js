// ========== DOM References ==========

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

const encryptionModal = document.getElementById("encryption-model");
const setupEncryptionBtn = document.getElementById("setup-encryption-btn");
const masterPasswordInput = document.getElementById("master-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const encryptionError = document.getElementById("encryption-error");

const patientImageInput = document.getElementById("patient-image");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");

// ========== State ==========

let currentPatientData = null;
let uploadedImageData = null;

// ========== Encryption & Initialization ==========

window.addEventListener("load", async () => {
  if (!localStorage.getItem("encryption_salt")) {
    encryptionModal.style.display = "block";
  } else {
    await promptForPassword();
  }
});

async function promptForPassword() {
  const maxAttempts = 3;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
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
      encryption.key = null;

      if (attempts + 1 >= maxAttempts) {
        alert("Too many failed attempts.\n\nPlease refresh the page and try again.");
        location.reload();
        return;
      }
    }
  }
}

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
    textElement.style.display = "block";
    patientFormContainer.style.display = "none";

    if (!window.uploadedImageData) {
      takePhotoBtn.style.display = "inline-block";
    } else {
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
  if (webcam?.canvas) {
    window.scannedFrameData = webcam.canvas.toDataURL("image/jpeg", 0.92);
  }

  await captureAndPredict();
  await exportToPDFWithPatient();

  isRunning = false;
  if (webcam?._videoEl?.srcObject) {
    webcam._videoEl.srcObject.getTracks().forEach((t) => t.stop());
  }

  takePhotoBtn.style.display = "none";
  document.getElementById("FlipCamBtn").style.display = "none";
  backBtn.style.display = "block";
});

backBtn.addEventListener("click", () => {
  isRunning = false;

  if (webcam?._videoEl?.srcObject) {
    webcam._videoEl.srcObject.getTracks().forEach((t) => t.stop());
  }

  // Brief delay lets any in-flight predict() call finish before clearing the UI
  setTimeout(() => {
    document.getElementById("label-container").innerHTML = "";
    document.getElementById("lighting-container").innerHTML = "";
  }, 100);

  document.getElementById("webcam-container").innerHTML = "";

  currentPatientData = null;
  uploadedImageData = null;
  window.uploadedImageData = null;
  window.scannedFrameData = null;

  document.getElementById("patient-name").value = "";
  document.getElementById("patient-age").value = "";
  document.getElementById("patient-sex").value = "";
  document.getElementById("patient-notes").value = "";
  patientImageInput.value = "";
  imagePreview.src = "";
  imagePreviewContainer.style.display = "none";

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
    // @ts-ignore — exportToPDF is async; TS can't infer its return type across plain JS files
    const { filename, pdfBlob } = await exportToPDF();
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
