# PG Scanner — User Manual

## Product Description and Goal

PG Scanner is a web-based AI diagnostic assistance tool designed to help healthcare professionals detect **Pyoderma Gangrenosum (PG)** — a rare and serious skin ulcer condition that is frequently misdiagnosed. The application uses a trained machine learning model to analyze live webcam footage or uploaded images of wound sites and returns a confidence score indicating the likelihood of PG.

All patient data is stored locally on the device in an encrypted database. No information is ever transmitted to an external server. PG Scanner is intended to assist clinical judgment, not replace it.

> **This tool is not a substitute for professional medical diagnosis.**

**Sections of this manual:**
- [Product Usage](#product-usage) — requirements and how to access the app
- [How to Operate PG Scanner](#how-to-operate-pg-scanner) — step-by-step usage guide
- [Features](#features) — optional and advanced features
- [Basic Troubleshooting and Common Issues](#basic-troubleshooting-and-common-issues) — quick fixes for average users
- [Maintenance](#maintenance) — keeping the app working correctly over time
- [Engineering Troubleshooting Report](#engineering-troubleshooting-report) — technical reference for developers

---

## Product Usage

### Requirements

**Hardware:**
- A device with a working webcam (or the ability to upload image files)
- Adequate lighting at the wound site for accurate image capture

**Software / Browser:**
- A modern, up-to-date web browser:
  - Google Chrome 90 or later
  - Mozilla Firefox 88 or later
  - Microsoft Edge 90 or later
  - Safari 14 or later (macOS / iOS)

**Operating System:**
- Compatible with Windows, macOS, and Linux (desktop)
- Compatible with modern Android and iOS mobile browsers

**Network:**
- An internet connection is required to load the app and its libraries (TensorFlow.js, jsPDF). The machine learning model runs entirely in the browser — no data is sent to any server.

### Safety Requirements

PG Scanner is a software-only tool. There are no electrical hazards or physical components involved.

The following clinical and data-safety precautions must be observed:

- **Do not use PG Scanner as the sole basis for diagnosis.** Results are a probability estimate from a machine learning model, not a clinical determination. Always involve a qualified clinician in any diagnosis and treatment decision.
- **Protect patient privacy.** Although all data is encrypted on-device, the device running PG Scanner should be secured with a screen lock and should not be left unattended while the app is open.
- **Protect the master password.** If the master password is lost, all stored patient records are permanently unrecoverable — there is no password reset mechanism.
- **Avoid repeated incorrect password attempts.** After 5 consecutive incorrect attempts the account locks and recovery requires permanently erasing all patient records. Do not guess the master password.

---

## How to Operate PG Scanner

### Step 1 — Open the Application

Navigate to the PG Scanner website in your browser. No installation or download is required.

### Step 2 — Create or Enter Your Master Password

On **first launch**, you will be prompted to create a master password. The password must meet all of the following requirements:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (e.g., `!`, `@`, `#`, `$`)

On **subsequent launches**, enter your existing master password to unlock the app.

> ⚠️ This password cannot be recovered. Write it down and store it securely.

### Step 3 — Enter Patient Information

Fill in the patient information form:
- **Name** (required)
- **Age** (required)
- **Sex** (required)
- **Notes** (optional — any additional clinical context)
- **Image Upload** (optional — attach a still photo instead of using the webcam)

### Step 4 — Start a Scan

Click **Start Scan**. The app will request webcam access if it has not already been granted. Once the camera feed appears:

1. Position the wound site in frame, approximately 6 inches from the camera.
2. Check the **Lighting Indicator** — it will read *Good*, *Too Dark*, or *Too Bright*. Adjust the lighting until the indicator reads *Good*.
3. Observe the real-time PG confidence score as you adjust the frame.
4. When the wound is clearly in frame and lighting is good, click **Scan** to capture a still image.

### Step 5 — Review and Keep or Retake

After each capture you will be shown a preview of the still image alongside its PG confidence score, with two options:

- **Keep** — accept the scan and add it to the report.
- **Retake (X)** — discard the frame and return to the live camera to try again.

You may take multiple scans per patient to capture the wound from different angles or distances.

### Step 6 — Export the Report

When all scans are complete, click **Export PDF**. A timestamped PDF report will be generated containing all scan images and their corresponding PG confidence scores.

- On **mobile**, the native share sheet will appear so the report can be sent via email, message, or another app.
- On **desktop**, the PDF will download automatically to your default downloads folder.

### Step 7 — View Saved Records

Click **View Records** to open the patient records viewer. From here you can:
- Search for a patient by name
- View the details of any previous record
- Re-download the PDF for a previous record
- Delete a record

---

## Features

### Live Webcam Feed
The app streams a live webcam feed so you can frame the wound site before capturing. The ML model runs at the moment you click **Scan**, producing a PG confidence score for that captured frame. Use the live feed to adjust your angle, distance, and lighting before committing to a scan.

### Lighting Quality Indicator
A luminance check runs every 500 ms on the live frame and reports whether current lighting is *Good*, *Too Dark*, or *Too Bright*. Good lighting conditions significantly improve model accuracy. Adjust ambient light or move closer to a light source until the indicator reads *Good*.

### Multi-Scan per Patient
Multiple still frames can be captured for a single patient visit, useful for photographing the wound from multiple angles or at different zoom levels. All captured scans appear in the final PDF report.

### Camera Flip (Mobile)
On devices with both front and rear cameras (smartphones and tablets), a **Flip Camera** button allows switching between cameras without leaving the scan screen.

### Image Upload Mode
If a webcam is unavailable or a pre-existing photograph is to be analyzed, an image file can be uploaded from the patient form before starting a scan. Supported formats include JPEG and PNG. Maximum file size is 5 MB. The model will run inference on the uploaded image directly.

### Encrypted Local Storage
All patient records — including the PDF report — are encrypted with AES-256-GCM using a key derived from your master password (PBKDF2, 100,000 iterations, SHA-256) and stored in the browser's IndexedDB. No data ever leaves the device.

---

## Basic Troubleshooting and Common Issues

### The camera feed does not appear / the browser keeps asking for permission

**Cause:** Camera permission was denied in the browser or at the operating system level.

**Fix:** Click the camera icon or lock icon in the browser's address bar and set camera permission to *Allow*, then reload the page. If the problem persists, check OS-level camera permissions (macOS: System Settings → Privacy & Security → Camera; Windows: Settings → Privacy → Camera).

---

### The confidence score seems inaccurate or jumps around

**Cause:** Poor or inconsistent lighting is the most common cause of unstable results.

**Fix:** Check the Lighting Indicator. Position the wound under steady, diffuse light. Avoid strong shadows, direct sunlight, or reflections off the wound surface.

---

### The app says my account is locked

**Cause:** The master password was entered incorrectly 5 times consecutively.

**Fix:** Use the **Reset Account** option shown on the lock screen. **All existing patient records will be permanently deleted.** Ensure any needed PDFs have already been exported before resetting.

---

### The PDF does not download

**Cause:** The browser's pop-up or download blocker is preventing the file from saving.

**Fix:** Check for a blocked download notification in the browser's address bar and click to allow it. You may also need to temporarily disable a download-blocking browser extension.

---

### "Loading model…" stays on screen and never finishes

**Cause:** The browser could not download the ML model or CDN libraries, most likely due to a slow or unstable internet connection.

**Fix:** Check your internet connection and reload the page. If the problem persists on a stable connection, try a different browser or clear the browser cache and reload.

---

## Maintenance

### Keep the Browser Up to Date
The app relies on browser-native APIs (WebCrypto, IndexedDB, WebRTC). Keep your browser updated to a currently supported release to ensure these APIs function correctly.

### Master Password Management
There is no password rotation mechanism built in. If the master password needs to be changed (e.g., after a staff change), export all needed PDFs first, then reset the account to set a new password on next launch.

### Clear Old Patient Records
The local database grows as records accumulate. Periodically review and delete records that are no longer needed through the **View Records** screen to keep storage usage manageable.

---

## Engineering Troubleshooting Report

This section is intended for developers and technically proficient users who need to diagnose non-trivial issues.

### System Architecture Summary

PG Scanner is a 100% client-side single-page application. There is no backend server, no cloud component, and no build toolchain. All files are static assets served by any HTTP server. Dependencies are loaded from CDN at runtime. The ML model is served as a local static file from `ModelFiles/`.

**Key source files:**

| File | Responsibility |
|------|----------------|
| `index.html` | Entry point, CDN script tags, DOM structure |
| `App.js` | State management, camera flow, form handling, patient record UI |
| `TeachableScript.js` | ML model loading, webcam management, real-time inference loop, lighting analysis |
| `PatientDatabase.js` | IndexedDB CRUD wrapper |
| `Encryption.js` | AES-256-GCM encrypt/decrypt via Web Crypto API |
| `PdfExport.js` | PDF report generation via jsPDF |

**CDN dependencies (loaded in `index.html`):**

| Library | Purpose |
|---------|---------|
| TensorFlow.js | ML inference runtime |
| Teachable Machine Image | Model loading wrapper |
| jsPDF 2.5.1 | PDF generation |

**`localStorage` keys:**

| Key | Contents |
|-----|----------|
| `encryption_salt` | Base64-encoded 16-byte random salt for PBKDF2 key derivation |
| `encryption_verification` | AES-256-GCM encrypted token used to verify correct password entry |
| `failed_attempts` | Integer count of consecutive failed login attempts |
| `account_locked` | Boolean — set to `true` after 5 failed attempts |

**IndexedDB:** Database name `PGScannerDB`, version 1, single object store `patients`. Only `createdAt` is stored unencrypted (for sorting). All other fields including the PDF blob are AES-256-GCM encrypted.

**Model configuration** — the only configurable constant, at the top of `TeachableScript.js`:
```js
const CONFIG = { MODEL_URL: "./ModelFiles/" };
```

---

### Problem 1 — Camera Fails to Initialize or Freezes

**Symptoms:** Camera feed never appears, shows a black frame, or freezes after a few seconds.

**Causes:**
- Camera permission denied at the OS level
- Another application holds an exclusive lock on the camera (e.g., video conferencing software)
- Browser does not have camera permission for the GitHub Pages site
- On mobile, the browser tab was backgrounded during initialization

**Solutions:**
1. Confirm OS-level camera access is granted to the browser: macOS → System Settings → Privacy & Security → Camera; Windows → Settings → Privacy → Camera.
2. Close any other application using the camera.
3. In the browser, open Site Settings for the GitHub Pages URL and set Camera to *Allow*.
4. If the feed freezes intermittently, TensorFlow.js inference may be exhausting available RAM. Close unused browser tabs and retry.
5. Open DevTools (`F12`) → Console and look for `getUserMedia` errors for a specific error code.

---

### Problem 2 — ML Model Fails to Load

**Symptoms:** Confidence scores never appear; console shows a fetch error or 404 for `model.json`.

**Causes:**
- `ModelFiles/` directory is missing or not in the same directory as `index.html`
- The HTTP server is not running or is serving the wrong directory
- One or more model files (`model.json`, `model.weights.bin`, `metadata.json`) are missing or corrupted

**Solutions:**
1. Verify that `ModelFiles/` is committed to the repository and is being served by GitHub Pages (check the Pages deployment in the repo's Actions tab).
2. Navigate directly to `https://<your-pages-url>/ModelFiles/model.json` in the browser — you should see JSON content. A 404 confirms the folder was not deployed.
3. If the weights file is corrupt, restore `ModelFiles/` from source control and push a new commit.
4. If the model folder is relocated in the repo, update the path in `TeachableScript.js`:
   ```js
   const CONFIG = { MODEL_URL: "./ModelFiles/" };
   ```

---

### Problem 3 — Encryption / Decryption Errors (Records Cannot Be Read)

**Symptoms:** The patient records viewer shows an error or blank entries; the browser console logs a `DOMException` originating from `Encryption.js`.

**Causes:**
- The `encryption_salt` or `encryption_verification` keys in `localStorage` were cleared or corrupted (e.g., via "Clear Site Data" in DevTools)
- The master password was changed externally

**Solutions:**
1. Open DevTools → Application → Local Storage → the GitHub Pages URL. Confirm `encryption_salt` and `encryption_verification` are present and appear to be valid base64 strings.
2. If these keys are missing but IndexedDB records still exist, the records are unrecoverable — the decryption key cannot be reconstructed without the original salt.
3. If the salt is intact but the password is unknown, the account must be reset via the lock screen. **All patient records will be permanently deleted.**
4. To inspect raw IndexedDB contents: DevTools → Application → IndexedDB → PGScannerDB → patients.

---

### Problem 4 — PDF Export Fails or Produces a Blank File

**Symptoms:** The PDF download triggers but opens blank, or the export button does nothing.

**Causes:**
- jsPDF failed to load from CDN
- Canvas capture of the scan frame failed due to a cross-origin image
- On mobile, the Web Share API is not supported by the browser

**Solutions:**
1. Open DevTools → Network, reload the page, and confirm `jspdf.umd.min.js` loads with HTTP 200.
2. If jsPDF failed, `window.jspdf` will be undefined. Pin the CDN version in `index.html` to a specific release if the floating version is broken.
3. Uploaded images must be same-origin for `canvas.toDataURL()` to work. Cross-origin images taint the canvas and block export. Use locally uploaded files, not remote URLs.
4. On mobile browsers without Web Share API support, the share export silently fails. Test with Chrome for Android or Safari for iOS. As a fallback, the export logic in `PdfExport.js` can be modified to offer a standard file download instead.

---

### Problem 5 — IndexedDB Quota Exceeded

**Symptoms:** New patient records fail to save; console shows `QuotaExceededError`.

**Causes:**
- Many high-resolution scan images have filled the browser's available storage quota for the site

**Solutions:**
1. Open the Patient Records viewer and delete records that are no longer needed.
2. Check current storage usage: DevTools → Application → Storage.
3. Browser storage quotas vary: Chrome typically allows up to ~60% of available disk; Safari is more restrictive. On shared or low-storage devices, this limit may be reached sooner.
4. If storage pressure is a recurring issue, reduce the resolution of captured scan images by adjusting the canvas dimensions in `TeachableScript.js`.

---

*PG Scanner — Capstone Group 8*