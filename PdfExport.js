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
    // Load and scale image to fit page width
    const img = new Image();
    img.src = imgData;
    await new Promise((r) => (img.onload = r));
    const maxW = w - margin * 2;
    const scale = maxW / img.width;
    const drawW = maxW;
    const drawH = img.height * scale;
    pdf.addImage(imgData, "JPEG", margin, y, drawW, drawH);
    y += drawH + 18;
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
 * Captures current webcam frame as JPEG data URL
 * Tries canvas first, falls back to video element if needed
 * @returns {string|null} Data URL of snapshot, or null if unavailable
 */
async function getSnapshotDataURL() {
  const canvas = document.querySelector("#webcam-container canvas");
  const video = document.querySelector("#webcam-container video");

  // Try canvas element first (preferred)
  if (canvas) {
    try {
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch {}
  }

  // Fallback to video element
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
