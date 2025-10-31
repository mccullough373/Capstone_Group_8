# PG Scanner

A real-time medical image classification application using machine learning to detect and analyze medical conditions through live webcam feeds. Built with TensorFlow.js and Teachable Machine.

**Project Type:** Capstone Group 8 - Healthcare Technology
**Status:** Beta / Proof of Concept
**License:** [Add your license here]

---

## 📋 Table of Contents

- [Features](#features)
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security & Privacy](#security--privacy)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)
- [Support](#support)

---

## ✨ Features

### Core Functionality
- **Real-time Image Classification** — Live webcam feed processed through trained ML model
- **Confidence Level Display** — Color-coded results (Green ≥70%, Yellow 40-70%, Red <40%)
- **Patient Management** — Create and store patient records with demographic information
- **PDF Export** — Generate downloadable reports with snapshots and confidence metrics
- **Local Data Storage** — Browser-based IndexedDB for patient record persistence
- **Record Management** — Search, view, update, and delete patient records
- **Responsive Design** — Works on desktop and tablet browsers

---

## 📖 Project Overview

PG Scanner is a web-based healthcare application designed to assist in real-time medical image classification. The application:

1. **Captures** live video from a user's webcam
2. **Processes** frames through a trained TensorFlow.js model (MobileNetV2-based)
3. **Classifies** images with confidence scores
4. **Records** results with patient information
5. **Exports** findings in PDF format for record keeping

### Use Case
This tool is intended for [specify use case - e.g., "assisting healthcare professionals in preliminary medical condition assessment"]. It serves as a demonstration of edge-based ML inference for medical applications.

### Important Notes
⚠️ **This is a prototype/capstone project.** It is NOT intended for clinical diagnosis without professional medical review and proper HIPAA compliance infrastructure.

---

## 🛠 Technology Stack

### Frontend
- **HTML5** — Semantic markup and structure
- **CSS3** — Responsive styling and color-coded UI
- **JavaScript (ES5)** — Vanilla JavaScript, no frameworks

### Machine Learning
- **TensorFlow.js** — Client-side ML model inference
- **Google Teachable Machine** — Pre-trained MobileNetV2 model (v2.4.10)
- **Model Type** — Binary classification (224x224px image input)

### Database
- **IndexedDB** — Browser-based local storage for patient records

### Utilities
- **jsPDF** (v2.5.1) — PDF report generation
- **Fetch API** — Model loading and API calls

### Development (Recommended)
- **Node.js** (v16+) — Local development server
- **http-server** — HTTPS-capable server for testing
- **Git** — Version control

---

## 📂 Project Structure

```
Capstone_Group_8/
├── index.html                 # Main HTML file (UI + initialization)
├── TeachableScript.js         # ML model loading and inference
├── PatientDatabase.js         # IndexedDB operations (CRUD)
├── PdfExport.js               # PDF report generation
├── Styles.css                 # Application styling
├── README.md                  # This file
├── .gitignore                 # Git ignore configuration
├── .gitattributes             # Git attributes
└── my_model/                  # Trained ML model
    ├── model.json             # Neural network topology
    ├── metadata.json          # Model configuration (TensorFlow.js v1.7.4)
    └── weights.bin            # Trained weights (2.1 MB)
```

### File Descriptions

| File | Purpose |
|------|---------|
| `index.html` | Main application UI, initialization, event handlers (357 lines) |
| `TeachableScript.js` | Loads TensorFlow.js model, performs inference, displays results |
| `PatientDatabase.js` | Manages patient records using IndexedDB async API |
| `PdfExport.js` | Generates PDF reports with snapshots and metadata |
| `Styles.css` | Responsive CSS with color-coded confidence indicators |
| `my_model/` | Trained MobileNetV2 model files from Teachable Machine |

---

## 📋 Prerequisites

### Minimum Requirements
- **Browser:** Chrome, Firefox, Safari, or Edge (latest versions)
  - Webcam access required
  - HTTPS required for production (HTTP okay for localhost development)
- **Hardware:** Device with built-in or USB webcam
- **Internet:** Required to load TensorFlow.js and model from CDN

### For Development
- **Node.js** v16+ (for running local server with HTTPS)
- **Git** (for version control)
- **Text Editor** (VS Code, Sublime, etc.)

---

## 🚀 Installation & Setup

### Option 1: Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/yourusername/Capstone_Group_8.git
cd Capstone_Group_8

# Install Node.js dependencies (optional, for local server)
npm install http-server

# Start HTTPS server (required for webcam access)
npx http-server -p 8000 --cors -S -C cert.pem -K key.pem
```

Then open: `https://localhost:8000`

### Option 2: Using Python (Alternative)

If you prefer Python's built-in server:

```bash
# Python 3
python -m http.server 8000

# Note: This serves HTTP only; use a HTTPS proxy for production
```

### Option 3: Using a Static Web Host

1. Build or use files as-is
2. Deploy to: Vercel, Netlify, GitHub Pages, or your hosting provider
3. Ensure HTTPS is enabled (automatic on most modern hosts)

### Troubleshooting

**"Camera not working"**
- Ensure HTTPS is enabled (or localhost)
- Check browser permissions for camera access
- Verify no other app is using the camera

**"Model fails to load"**
- Check internet connection
- Verify Teachable Machine model URL is accessible
- Check browser console for CORS errors

**"IndexedDB not saving"**
- Clear browser cache/cookies
- Ensure private browsing is disabled
- Try a different browser

---

## 📖 Usage

### Basic Workflow

1. **Start Application**
   - Open `index.html` in browser
   - Allow camera permissions when prompted

2. **Activate Camera**
   - Click "Start Camera Feed" button
   - Real-time classification begins automatically

3. **Monitor Results**
   - View live confidence scores
   - Color-coded indicators show confidence level
   - Classification label displayed prominently

4. **Create Patient Record**
   - Enter patient name, age, sex (optional)
   - Add clinical notes (optional)
   - Click "Save Patient Record"

5. **Export Results**
   - Click "Download PDF Report"
   - Generates report with:
     - Patient demographics
     - Snapshot from webcam
     - Classification result
     - Confidence scores
     - Timestamp

6. **View Records**
   - Open "Patient Records" section
   - Search by patient name
   - View or delete previous records

### Keyboard Shortcuts
Currently none defined. Consider adding in future versions.

---

## 🏗 Architecture

### Data Flow

```
┌─────────────────┐
│  Webcam Feed    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ TeachableScript.js   │
│ (Model Inference)    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Confidence Scores   │ (Canvas Rendering)
│  Classification      │ (Color-coded display)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ PatientDatabase.js   │ (IndexedDB Store)
│ (Patient Records)    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│   PdfExport.js       │ (jsPDF Generation)
│   (Report Export)    │
└──────────────────────┘
```

### Component Overview

**TeachableScript.js**
- Loads TensorFlow.js from CDN
- Loads trained model from `my_model/` directory
- Performs inference on video frames
- Returns top prediction with confidence score

**PatientDatabase.js**
- Initializes IndexedDB with "patients" object store
- Implements CRUD operations: Create, Read, Update, Delete
- Stores records with schema: `{ id, name, age, sex, notes, createdAt }`
- Async/Promise-based API

**PdfExport.js**
- Uses jsPDF library for PDF generation
- Captures webcam snapshot
- Embeds classification data
- Formats patient information

**index.html**
- HTML structure and form elements
- Event listeners for user interactions
- DOM manipulation and rendering
- Initialization logic

---

## 👨‍💻 Development

### Code Organization

The codebase is organized into three main modules:

1. **Model & Inference** (TeachableScript.js)
2. **Data Persistence** (PatientDatabase.js)
3. **Report Generation** (PdfExport.js)

Each module is relatively independent and can be modified separately.

### Adding New Features

#### Add a New Patient Field
1. Update HTML form in `index.html`
2. Update `PatientDatabase.js` schema
3. Update PDF export in `PdfExport.js`
4. Test with browser DevTools

#### Retrain the Model
1. Visit Google Teachable Machine: https://teachablemachine.withgoogle.com
2. Upload new training images
3. Export as TensorFlow.js
4. Replace files in `my_model/` directory
5. Update class labels as needed

#### Modify Styling
- Edit `Styles.css` directly
- No build process needed
- Changes take effect on page refresh

### Recommended Improvements

- [ ] Extract HTML `<script>` blocks to external file
- [ ] Add error handling with try-catch blocks
- [ ] Add JSDoc comments to all functions
- [ ] Implement centralized configuration object
- [ ] Add console logging for debugging
- [ ] Use ES6 modules instead of global variables

---

## 🧪 Testing

### Current Testing Status
⚠️ **No automated tests implemented.** This is recommended for future versions.

### Manual Testing Checklist

- [ ] **Camera Access**
  - [ ] Webcam starts successfully
  - [ ] Permissions dialog appears
  - [ ] Video feed displays in canvas

- [ ] **Model Classification**
  - [ ] Model loads without errors
  - [ ] Real-time predictions display
  - [ ] Confidence scores are reasonable (0-100%)
  - [ ] Color coding works (Green/Yellow/Red)

- [ ] **Patient Database**
  - [ ] Records save successfully
  - [ ] Records persist after page reload
  - [ ] Search functionality works
  - [ ] Delete operation works

- [ ] **PDF Export**
  - [ ] PDF downloads without errors
  - [ ] Snapshot is captured correctly
  - [ ] Patient info is included
  - [ ] File opens in PDF reader

- [ ] **Browser Compatibility**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile browsers (if applicable)

### Recommended Testing Framework

For future versions, consider implementing:
- **Jest** — Unit testing framework
- **Cypress** — End-to-end testing
- **Lighthouse** — Performance auditing

---

## 🌐 Deployment

### Production Deployment Checklist

- [ ] **Security**
  - [ ] HTTPS enabled (required for webcam)
  - [ ] Security headers configured
  - [ ] CORS properly configured
  - [ ] No hardcoded credentials in code

- [ ] **Performance**
  - [ ] Assets minified (CSS, JS)
  - [ ] Images optimized
  - [ ] CDN links verified and pinned to versions
  - [ ] Caching headers configured

- [ ] **Privacy & Compliance**
  - [ ] Privacy policy created
  - [ ] Terms of service defined
  - [ ] User consent mechanism implemented
  - [ ] Data retention policy defined
  - [ ] GDPR compliance verified (if applicable)

- [ ] **Monitoring**
  - [ ] Error logging configured
  - [ ] Analytics enabled (if desired)
  - [ ] Uptime monitoring set up

### Deployment Platforms

**Recommended Options:**
- **Vercel** — Easy deployment, HTTPS included, Git integration
- **Netlify** — Similar to Vercel, good free tier
- **GitHub Pages** — Free, if repository is public
- **AWS S3 + CloudFront** — Production-grade, scalable
- **Your own server** — Full control, more responsibility

### Example: Vercel Deployment

```bash
npm install -g vercel
vercel
# Follow prompts to deploy
```

---

## 🔒 Security & Privacy

### Current Status: ⚠️ NOT PRODUCTION-READY

This is a prototype application. **Do not use for real medical diagnosis without proper security measures.**

### Security Considerations

**Implemented:**
- Local-only data storage (IndexedDB on client device)
- No data transmitted to external servers
- Webcam access permission gates

**NOT Implemented (Required for Production):**
- [ ] Data encryption
- [ ] User authentication
- [ ] HIPAA compliance
- [ ] Audit logging
- [ ] Secure backend storage
- [ ] SSL certificate management
- [ ] CORS security headers

### Privacy Policy

⚠️ **A privacy policy must be created before deploying to production.**

Consider:
- What data is collected?
- How long is it retained?
- Who has access?
- How is it encrypted?
- What are user rights?

### Recommended Security Improvements

1. **Add Backend Server** (Node.js/Python/Java)
   - User authentication
   - Encrypted database (PostgreSQL/MongoDB)
   - Server-side inference (more secure)
   - Audit logging for HIPAA

2. **Data Encryption**
   - Encrypt patient records in IndexedDB
   - Use TweetNaCl.js or similar

3. **Compliance**
   - Implement HIPAA compliance measures
   - Regular security audits
   - Incident response plan

---

## 🤝 Contributing

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages: `git commit -m "Add feature: description"`
6. **Push** to your fork: `git push origin feature/your-feature`
7. **Create** a Pull Request with description of changes

### Code Style Guidelines

- Use consistent indentation (2 or 4 spaces)
- Add comments for complex logic
- Keep functions focused and single-purpose
- Use meaningful variable names
- Test in multiple browsers

### Reporting Issues

Use GitHub Issues to report:
- Bugs with reproduction steps
- Feature requests with use cases
- Documentation improvements
- Security vulnerabilities (privately)

---

## 🚀 Future Enhancements

### High Priority
- [ ] **User Authentication** — Login/role-based access
- [ ] **Backend API** — Secure data storage with encryption
- [ ] **HIPAA Compliance** — For real healthcare deployment
- [ ] **Unit Tests** — Jest framework with test coverage
- [ ] **Error Handling** — Comprehensive error boundaries
- [ ] **Documentation** — JSDoc comments, API docs

### Medium Priority
- [ ] **Mobile App** — React Native or Flutter version
- [ ] **Model Management** — Upload/switch between models
- [ ] **Advanced Analytics** — Track model performance over time
- [ ] **Multi-language Support** — i18n implementation
- [ ] **Dark Mode** — UI theme switching
- [ ] **Accessibility** — WCAG 2.1 AA compliance (ARIA labels, keyboard navigation)

### Low Priority
- [ ] **Batch Processing** — Upload multiple images at once
- [ ] **API Integration** — Connect to EHR systems
- [ ] **Advanced Reporting** — Charts, trends, comparisons
- [ ] **Offline Mode** — Service Workers for offline access
- [ ] **Performance Optimization** — Model caching, image compression

---

## 📚 References & Resources

### Machine Learning
- [Google Teachable Machine](https://teachablemachine.withgoogle.com)
- [TensorFlow.js Documentation](https://js.tensorflow.org)
- [MobileNetV2 Paper](https://arxiv.org/abs/1801.04381)

### Web Technologies
- [MDN Web Docs — Webcam API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN Web Docs — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Web Security Academy](https://portswigger.net/web-security)

---

## 📝 License

[Add your license here - e.g., MIT, Apache 2.0, GPL, etc.]

---

## 👥 Team

**Group 8 Members:**
- [Your names here]

**Faculty Advisor:**
- [Advisor name and contact]

---

## 💬 Support & Contact

For questions or support:
- **GitHub Issues:** [Add issue link]
- **Email:** [Add team email]
- **Documentation:** See README.md and code comments

---

## 🙏 Acknowledgments

- Google Teachable Machine team for the ML framework
- TensorFlow.js contributors
- jsPDF library maintainers
- All testers and contributors

---

**Last Updated:** October 2024
**Version:** 0.1.0 (Beta)

**Note:** This is a capstone/prototype project. For production healthcare applications, significant additional development, security hardening, and compliance work is required.
