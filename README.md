# PG Scanner

**Real-time AI Physician Assistant for Pyoderma Gangrenosum Detection**

A web-based medical scanning application that uses machine learning to assist healthcare professionals in detecting Pyoderma Gangrenosum (PG) through live webcam analysis. Built with TensorFlow.js and Google's Teachable Machine.

[![Project Type](https://img.shields.io/badge/Project-Capstone_Group_8-blue)]()
[![Status](https://img.shields.io/badge/Status-Beta-yellow)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [Security Features](#security-features)
- [Architecture](#architecture)
- [Development](#development)
- [Future Enhancements](#future-enhancements)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)

---

## 🔬 Overview

PG Scanner is an AI-powered diagnostic assistance tool designed to help healthcare professionals identify Pyoderma Gangrenosum (PG), a rare and serious skin condition. The application:

1. **Captures** live video from the device's webcam
2. **Analyzes** skin conditions in real-time using a trained ML model
3. **Provides** confidence percentage for PG detection
4. **Stores** patient records with encrypted data
5. **Generates** professional PDF reports with snapshots and results

### What is Pyoderma Gangrenosum?

Pyoderma Gangrenosum (PG) is a rare inflammatory skin disease characterized by painful ulcers. Early detection is crucial for effective treatment. This tool provides a preliminary assessment to assist medical professionals in the diagnostic process.

### Use Case

Hold the skin ulcer approximately 6 inches from the camera, and the model will provide a confidence percentage indicating the likelihood of PG. Results can be exported to PDF with patient information for medical records.

---

## ✨ Features

### Core Functionality

- **🎥 Real-Time Classification** — Live webcam feed processed through trained TensorFlow.js model
- **📊 Confidence Scoring** — Color-coded results:
  - 🟢 Green: ≥70% (High confidence)
  - 🟡 Yellow: 40-70% (Moderate confidence)
  - 🔴 Red: <40% (Low confidence)
- **👤 Patient Management** — Complete CRUD operations for patient records
- **📄 PDF Export** — Professional medical reports with:
  - Patient demographics
  - Webcam snapshot
  - Confidence metrics
  - Timestamp and scan ID
- **🔍 Advanced Search** — Dual search by Patient ID and Name

### Security Features

- **🔐 Client-Side Encryption** — AES-256-GCM encryption for all patient data
- **🔑 Password Authentication** — Master password with verification token
- **🛡️ Secure Storage** — Encrypted IndexedDB with no external data transmission

---

## 🛠 Technology Stack

### Frontend

- **HTML5** — Semantic markup and structure
- **CSS3** — Responsive design with Grid and Flexbox
- **Vanilla JavaScript** — No frameworks, pure ES6+

### Machine Learning

- **TensorFlow.js** — Client-side inference
- **Teachable Machine** — Model training platform
- **MobileNetV2** — Base architecture for transfer learning

### Data & Security

- **IndexedDB** — Browser-based local storage
- **Web Crypto API** — AES-256-GCM encryption
- **PBKDF2** — Key derivation with 100,000 iterations

### PDF Generation

- **jsPDF** — PDF document creation
- **Canvas API** — Image capture and rendering

---

## 📋 Prerequisites

- **Modern Web Browser** with support for:
  - ES6+ JavaScript
  - WebRTC (getUserMedia API)
  - IndexedDB
  - Web Crypto API
  - Canvas API
- **Webcam** — Built-in or external camera
- **Local Web Server** — For development (VS Code Live Server, Python SimpleHTTPServer, etc.)

### Supported Browsers

| Browser | Minimum Version |
| ------- | --------------- |
| Chrome  | 90+             |
| Firefox | 88+             |
| Safari  | 14+             |
| Edge    | 90+             |

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pg-scanner.git
cd pg-scanner
```

### 2. Project Structure

```
pg-scanner/
├── Index.html              # Main HTML page
├── Styles.css              # Responsive styles
├── App.js                  # Main application logic
├── TeachableScript.js      # ML model inference
├── PatientDatabase.js      # IndexedDB operations
├── PdfExport.js            # PDF generation
├── Encryption.js           # Data encryption module
├── model.json              # Trained TensorFlow.js model Files
├── metadata.json           # Trained TensorFlow.js model Files
├── model.weights.bin       # Trained TensorFlow.js model Files
└── README.md               # This file
```

### Ways to currently run this project

### 3. Start Local Server

**Option A: VS Code Live Server**

1. Install Live Server extension
2. Right-click `Index.html`
3. Select "Open with Live Server"

**Option B: Python HTTP Server**

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### 4. Access Application

Open browser to: `http://localhost:8000`

### 5. First-Time Setup

1. **Security Setup Model** will appear
2. Create a **master password** (minimum 8 characters)
3. Confirm password
4. Click "Setup Encryption"

⚠️ **CRITICAL:** Remember your password — it cannot be recovered!

---

## 📖 Usage Guide

### Initial Login

1. Enter your master password when prompted
2. You have 3 attempts before lockout
3. Application will decrypt patient database

### Scanning a Patient

1. **Enter Patient Information:**

   - Patient Name (required)
   - Age (0-150, required)
   - Sex (required)
   - Notes (optional)

2. **Start Camera:**

   - Click "Start Camera" button
   - Grant webcam permission when prompted
   - Position skin ulcer ~6 inches from camera

3. **View Results:**

   - Real-time confidence percentage displayed
   - Color-coded confidence levels
   - Classification updates continuously

4. **Save Record:**

   - Click "Save Patient Record"
   - Record stored with encrypted data
   - Unique Patient ID generated automatically

5. **Export PDF:**
   - Click "Download PDF Report"
   - PDF includes:
     - Patient demographics
     - Webcam snapshot
     - Confidence scores
     - Scan timestamp
   - Filename format: `PG_Report_PatientID_Name_Timestamp.pdf`

### Managing Patient Records

1. **View Records:**

   - Click "View Patient Records" button
   - Model displays all records in table (desktop) or cards (mobile)

2. **Search Patients:**

   - Search by Patient ID or Name
   - Results update in real-time
   - Click "Show All" to reset search

3. **View Details:**

   - Click "View" button on any record
   - See complete patient information

4. **Delete Records:**
   - Click "Delete" button
   - Confirm deletion
   - Record permanently removed from database

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────┐
│         User Interface              │
│  (HTML + CSS + Responsive Design)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Application Layer (App.js)     │
│  • Form Validation                  │
│  • Event Handling                   │
│  • Camera Management                │
│  • Model Control                    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐ ┌──────────────┐
│   ML Layer  │ │  Data Layer  │
│ (Teachable  │ │  (Patient    │
│  Script.js) │ │  Database.js)│
└──────┬──────┘ └──────┬───────┘
       │               │
       │               ▼
       │        ┌──────────────┐
       │        │  Encryption  │
       │        │ (AES-256-GCM)│
       │        └──────┬───────┘
       │               │
       │               ▼
       │        ┌──────────────┐
       │        │  IndexedDB   │
       │        │   Storage    │
       │        └──────────────┘
       │
       ▼
┌─────────────────┐
│  PDF Export     │
│  (jsPDF)        │
└─────────────────┘
```

### Data Flow

```
User Input → Validation → Camera Init → ML Inference
                                             ↓
                                    Confidence Score
                                             ↓
                          ┌──────────────────┴──────────────┐
                          ↓                                  ↓
                   Save to Database                    Export to PDF
                          ↓                                  ↓
                   Encrypt Data                        Generate Report
                          ↓                                  ↓
                   IndexedDB Store                     Download File
```

### Component Details

#### **App.js** — Main Application Logic

- Encryption initialization and password verification
- Form validation and patient data capture
- Camera lifecycle management
- model interactions
- Database CRUD operations
- Event handling and UI updates

#### **TeachableScript.js** — ML Inference Engine

- Loads TensorFlow.js and Teachable Machine libraries
- Initializes trained model from local files
- Processes webcam frames at ~30 FPS
- Returns top prediction with confidence score
- Renders results to canvas element

#### **PatientDatabase.js** — Data Persistence Layer

- IndexedDB initialization and schema management
- CRUD operations with encryption integration
- Dual search functionality (ID and Name)
- Auto-incrementing Patient IDs
- Error handling and transaction management

#### **PdfExport.js** — Report Generation

- jsPDF integration for document creation
- Canvas snapshot capture
- Professional formatting with:
  - Header with title and logo space
  - Patient information section
  - Scan results with confidence metrics
  - Footer with timestamp and disclaimers
- Automatic filename generation

#### **Encryption.js** — Security Module

- AES-256-GCM encryption/decryption
- PBKDF2 key derivation (100,000 iterations)
- Random salt generation
- Verification token system
- Password validation and session management

---

## 🔒 Security Features

### Implemented Security Measures

#### 1. **Client-Side Encryption**

- **Algorithm:** AES-256-GCM (Advanced Encryption Standard)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Salt:** Random 16-byte salt stored in localStorage
- **IV:** Random 12-byte initialization vector per encryption

#### 2. **Password Authentication**

- Master password with minimum 8-character requirement
- Verification token system to validate password
- 3-attempt lockout mechanism
- No password recovery (by design for security)

#### 3. **Data Protection**

- All patient records encrypted before storage
- Encryption key never stored, derived from password
- Data never transmitted to external servers
- Local-only processing and storage

#### 4. **Input Validation**

- HTML5 form validation
- JavaScript validation layer
- Type checking and range validation

#### 5. **Session Management**

- Password required on each application load
- Encryption key cleared on failed attempts
- Automatic session termination on errors

### Security Best Practices

✅ **Implemented:**

- Client-side encryption for all sensitive data
- Secure random number generation for salts/IVs
- No external data transmission
- Password-based authentication
- Input validation and sanitization

⚠️ **Not Production-Ready:**

- No backend server authentication
- No multi-user support
- No audit trail storage
- No compliance certification (HIPAA, GDPR)
- No secure password recovery mechanism

---

## ⚠️ Disclaimer

### Important Legal and Medical Notices

**THIS APPLICATION IS A PROOF-OF-CONCEPT CAPSTONE PROJECT FOR EDUCATIONAL PURPOSES.**

1. **Not for Clinical Diagnosis:**

   - This tool is NOT approved for clinical use
   - Results should NOT be used as sole basis for medical decisions
   - Always consult qualified healthcare professionals

2. **Not HIPAA Compliant:**

   - This application is NOT HIPAA compliant
   - Do NOT use with real patient data in healthcare settings
   - Do NOT deploy in production medical environments

3. **No Medical Liability:**

   - Authors assume NO liability for medical decisions
   - Tool is for demonstration and research only
   - No warranty of accuracy or reliability

4. **Data Security:**

   - While encrypted, local storage has limitations
   - Not suitable for protected health information (PHI)
   - Use test data only

5. **Browser Limitations:**
   - Data stored in browser can be cleared
   - No cloud backup or recovery
   - Password loss means permanent data loss

**By using this application, you acknowledge these limitations and agree to use it for educational purposes only.**

_Remember: This is an educational project. Always consult qualified healthcare professionals for medical advice._
