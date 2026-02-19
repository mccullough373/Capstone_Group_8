# PG Scanner

A web-based AI tool that uses machine learning to assist healthcare professionals in detecting Pyoderma Gangrenosum (PG) through live webcam analysis.

> **Disclaimer:** PG Scanner is not medical advice please seek a medical professional for serious concerns

---

## Requirements

- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- A webcam
- Python 3 (used by the launcher scripts to start a local server)

---

## Setup

**1. Download the project**

- Click the green **Code** button on the GitHub page and select **Download ZIP**
- Extract the ZIP file to a folder on your computer

**2. Run the launcher script for your OS**

- **Windows:** Double-click `PG Scanner Launcher.bat`
- **Mac:** Double-click `start_pg_scanner.command`

The script will start a local server and open the app in your browser automatically.

**Mac users — first time only:**

macOS may block the file since it was downloaded from the internet. If you see a security warning:

1. Go to **System Settings → Privacy & Security**
2. Scroll down and click **Allow Anyway** next to the PG Scanner message
3. Double-click the file again and click **Open**

**This only needs to be done once**

**3. Create a master password on first launch**

> ⚠️ This password cannot be recovered. Remember it.

---

## How to Use

1. Enter patient name, age, and sex
2. Click **Start Camera Feed** and allow webcam access
3. Hold the skin ulcer ~6 inches from the camera
4. View the real-time confidence result and lighting indicator
5. Click **Export PDF** to save the report and patient record

To view or search past records, click **View Records**.

---

## Project Structure

```
pg-scanner/
├── Index.html                  # Main page
├── Styles.css                  # Styling
├── App.js                      # App logic
├── TeachableScript.js          # ML inference
├── PatientDatabase.js          # Patient records (IndexedDB)
├── PdfExport.js                # PDF generation
├── Encryption.js               # AES-256-GCM encryption
├── model.json                  # Trained model
├── metadata.json               # Model metadata
├── model.weights.bin           # Model weights
├── PG Scanner Launcher.bat     # Windows launcher
└── start_pg_scanner.command    # Mac launcher
```

---

## Tech Stack

- **ML:** TensorFlow.js + Google Teachable Machine (MobileNetV2)
- **Storage:** IndexedDB
- **Encryption:** Web Crypto API — AES-256-GCM, PBKDF2
- **PDF:** jsPDF + Canvas API
- **Frontend:** HTML5, CSS3, Vanilla JS
