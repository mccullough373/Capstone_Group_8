/**
 * PdfExport.js - PDF Report Generation
 *
 * Handles:
 * - PDF document creation with jsPDF
 * - Webcam snapshot capture
 * - Patient information formatting
 * - Confidence level reporting
 */

// ========== Main Export Function ==========

/**
 * Generates a PDF report with patient scan results
 * @returns {Object} {filename, pdfBlob} - Generated filename and blob for database storage
 */
async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  // ========== Title Section ==========
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(18)
    .text("PG Scanner Report", margin, y);
  y += 22;

  pdf
    .setFont("helvetica", "normal")
    .setFontSize(11)
    .text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 16;

  // ========== Snapshot Section ==========
  const imgData = await getSnapshotDataURL();
  if (imgData) {
    // Load image and calculate size to fit page while maintaining aspect ratio
    const img = new Image();
    img.src = imgData;
    await new Promise((r) => (img.onload = r));

    // Calculate maximum available space on current page
    const maxWidth = w - margin * 2; // Full page width minus margins
    const maxHeight = h - y - margin - 100; // Remaining height (leaving room for confidence section)

    // Calculate scaling to maintain aspect ratio while fitting in available space
    const imgAspectRatio = img.width / img.height;
    const maxAspectRatio = maxWidth / maxHeight;

    let drawWidth, drawHeight;
    if (imgAspectRatio > maxAspectRatio) {
      // Image is wider relative to available space - fit to width
      drawWidth = maxWidth;
      drawHeight = maxWidth / imgAspectRatio;
    } else {
      // Image is taller relative to available space - fit to height
      drawHeight = maxHeight;
      drawWidth = maxHeight * imgAspectRatio;
    }

    // Center the image horizontally
    const xOffset = (w - drawWidth) / 2;

    pdf.addImage(imgData, "JPEG", xOffset, y, drawWidth, drawHeight);
    y += drawHeight + 18;
  } else {
    // Handle case where snapshot is unavailable
    pdf
      .setTextColor(200, 0, 0)
      .text("Snapshot unavailable (camera not ready).", margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  }

  // ========== Confidence Levels Section ==========
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(14)
    .text("Confidence Levels", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal").setFontSize(12);
  const wrapped = pdf.splitTextToSize(getConfidenceText(), w - margin * 2);

  // Add new page if content doesn't fit
  if (y + wrapped.length * 14 > h - margin) {
    pdf.addPage();
    y = margin;
  }
  pdf.text(wrapped, margin, y);

  // ========== Save PDF ==========
  const filename = `PG-Scan_${timestamp()}.pdf`;
  const pdfBlob = pdf.output("blob");
  pdf.save(filename);

  return { filename, pdfBlob };
}

// ========== Utility Functions ==========

/**
 * Pads a number with leading zeros
 * @param {number} n - Number to pad
 * @returns {string} Zero-padded string
 */
const pad = (n) => String(n).padStart(2, "0");

/**
 * Generates a timestamp string for filename
 * @returns {string} Formatted timestamp (YYYYMMDD_HHMMSS)
 */
const timestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Captures current webcam frame or uploaded image as JPEG data URL
 * Tries uploaded image first, then canvas, then video element
 * @returns {string|null} Data URL of snapshot, or null if unavailable
 */
async function getSnapshotDataURL() {
  // Check for uploaded image first
  const uploadedImg = document.querySelector("#webcam-container img");
  if (uploadedImg && uploadedImg.src) {
    // If image is already a data URL, return it directly
    if (uploadedImg.src.startsWith("data:")) {
      return uploadedImg.src;
    }

    // Otherwise, convert to canvas and get data URL
    const temp = document.createElement("canvas");
    temp.width = uploadedImg.naturalWidth || uploadedImg.width;
    temp.height = uploadedImg.naturalHeight || uploadedImg.height;
    const ctx = temp.getContext("2d");
    ctx.drawImage(uploadedImg, 0, 0);
    return temp.toDataURL("image/jpeg", 0.92);
  }

  // Try canvas element (webcam)
  const canvas = document.querySelector("#webcam-container canvas");
  if (canvas) {
    try {
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch {}
  }

  // Fallback to video element
  const video = document.querySelector("#webcam-container video");
  if (video?.videoWidth && video?.videoHeight) {
    const temp = document.createElement("canvas");
    temp.width = video.videoWidth;
    temp.height = video.videoHeight;
    temp.getContext("2d").drawImage(video, 0, 0, temp.width, temp.height);
    return temp.toDataURL("image/jpeg", 0.92);
  }

  return null;
}

/**
 * Extracts confidence text from the label container
 * @returns {string} Formatted confidence text
 */
function getConfidenceText() {
  const c = document.getElementById("label-container");
  if (!c) return "No confidence values available.";

  // Extract text from child elements
  const lines = Array.from(c.children)
    .map((el) => (el.innerText ?? el.textContent ?? "").trim())
    .filter(Boolean);
  if (lines.length) return lines.join("\n");

  // Fallback to container text
  const t = (c.innerText ?? c.textContent ?? "").trim();
  return t || "No confidence values available.";
}
