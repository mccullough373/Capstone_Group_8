// export user data as a PDF file
async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

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

  const imgData = await getSnapshotDataURL();
  if (imgData) {
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
    pdf
      .setTextColor(200, 0, 0)
      .text("Snapshot unavailable (camera not ready).", margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  }

  pdf
    .setFont("helvetica", "bold")
    .setFontSize(14)
    .text("Confidence Levels", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal").setFontSize(12);
  const wrapped = pdf.splitTextToSize(getConfidenceText(), w - margin * 2);
  if (y + wrapped.length * 14 > h - margin) {
    pdf.addPage();
    y = margin;
  }
  pdf.text(wrapped, margin, y);

  pdf.save(`PG-Scan_${timestamp()}.pdf`);
}

const pad = (n) => String(n).padStart(2, "0");
const timestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// get snapshot from canvas or video as jpeg data URL
async function getSnapshotDataURL() {
  const canvas = document.querySelector("#webcam-container canvas");
  const video = document.querySelector("#webcam-container video");
  if (canvas) {
    try {
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch {}
  }
  if (video?.videoWidth && video?.videoHeight) {
    const temp = document.createElement("canvas");
    temp.width = video.videoWidth;
    temp.height = video.videoHeight;
    temp.getContext("2d").drawImage(video, 0, 0, temp.width, temp.height);
    return temp.toDataURL("image/jpeg", 0.92);
  }
  return null;
}

// get confidence text from label container
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
