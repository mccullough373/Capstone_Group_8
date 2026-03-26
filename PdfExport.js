async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  // Title
  pdf.setFont("helvetica", "bold").setFontSize(18).text("PG Scanner Report", margin, y);
  y += 22;
  pdf.setFont("helvetica", "normal").setFontSize(11).text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 16;

  // Snapshot
  const imgData = getSnapshotDataURL();
  if (imgData) {
    const img = new Image();
    img.src = imgData;
    await new Promise((r) => (img.onload = r));

    const maxWidth = w - margin * 2;
    const maxHeight = h - y - margin - 100;
    const imgAspectRatio = img.width / img.height;
    const maxAspectRatio = maxWidth / maxHeight;

    let drawWidth, drawHeight;
    if (imgAspectRatio > maxAspectRatio) {
      drawWidth = maxWidth;
      drawHeight = maxWidth / imgAspectRatio;
    } else {
      drawHeight = maxHeight;
      drawWidth = maxHeight * imgAspectRatio;
    }

    pdf.addImage(imgData, "JPEG", (w - drawWidth) / 2, y, drawWidth, drawHeight);
    y += drawHeight + 18;
  } else {
    pdf.setTextColor(200, 0, 0).text("Snapshot unavailable (camera not ready).", margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  }

  // Confidence levels
  pdf.setFont("helvetica", "bold").setFontSize(14).text("Confidence Levels", margin, y);
  y += 16;
  pdf.setFont("helvetica", "normal").setFontSize(12);
  const wrapped = pdf.splitTextToSize(getConfidenceText(), w - margin * 2);
  if (y + wrapped.length * 14 > h - margin) { pdf.addPage(); y = margin; }
  pdf.text(wrapped, margin, y);

  const filename = `PG-Scan_${timestamp()}.pdf`;
  const pdfBlob = pdf.output("blob");

  // On mobile, use the native share sheet — iOS Safari ignores <a download> on blob URLs
  const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], title: "PG Scanner Report" });
    } catch (e) {
      if (e.name !== "AbortError") console.warn("Share failed:", e);
    }
    return { filename, pdfBlob };
  }

  // Desktop: trigger a direct download
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  return { filename, pdfBlob };
}

// ========== Helpers ==========

const pad = (n) => String(n).padStart(2, "0");

const timestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

function getSnapshotDataURL() {
  if (window.scannedFrameData) return window.scannedFrameData;

  const uploadedImg = document.querySelector("#webcam-container img");
  if (uploadedImg?.src) {
    if (uploadedImg.src.startsWith("data:")) return uploadedImg.src;
    const temp = document.createElement("canvas");
    temp.width = uploadedImg.naturalWidth || uploadedImg.width;
    temp.height = uploadedImg.naturalHeight || uploadedImg.height;
    temp.getContext("2d").drawImage(uploadedImg, 0, 0);
    return temp.toDataURL("image/jpeg", 0.92);
  }

  const canvas = document.querySelector("#webcam-container canvas");
  if (canvas) {
    try { return canvas.toDataURL("image/jpeg", 0.92); } catch {}
  }

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

function getConfidenceText() {
  const c = document.getElementById("label-container");
  if (!c) return "No confidence values available.";

  const lines = Array.from(c.children)
    .map((el) => (el.innerText ?? el.textContent ?? "").trim())
    .filter(Boolean);
  if (lines.length) return lines.join("\n");

  const t = (c.innerText ?? c.textContent ?? "").trim();
  return t || "No confidence values available.";
}
