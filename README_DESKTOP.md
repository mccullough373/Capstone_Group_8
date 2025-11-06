# PG Scanner — Python Desktop (PyQt6)

A local desktop rewrite of your webapp. Features:
- Live camera preview (QtMultimedia).
- Confidence label updated every 1.25s (configurable).
- Patient form (name/age/sex/notes).
- Export current frame + confidence to a PDF.
- SQLite patient database with search/view/delete.
- Packaged as a single-file EXE via PyInstaller (instructions below).

## 1) Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

> Tested with Python 3.14 API surface. If a wheel is missing for your platform, pin PyQt6 to the latest available that supports your OS/Python.

## 2) Model Integration (from Teachable Machine)

Your web version uses a TensorFlow.js model. For desktop Python, export one of these from Teachable Machine:
- **TensorFlow Lite (.tflite)** — *recommended for desktop inference*
- **Keras (.h5 / SavedModel)** — if you prefer full TensorFlow

Then in `model_runner.py`:
1. Set `MODEL_BACKEND = "stub"` → `"tflite"` or `"keras"`.
2. Set `MODEL_PATH` to the exported model path.
3. Implement or uncomment the loader/predictor in the corresponding section.

Until then, the app runs with a **stub** that produces deterministic fake confidences for UI/dev.

## 3) Packaging as an executable (no console window)

```bash
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed app.py
# Result: dist/app.exe (Windows) or dist/app (macOS/Linux)
```

## 4) Database

- SQLite file: `patients.db` created in the working directory.
- Schema: id, name, age, sex, notes, pdf_filename, created_at (ISO 8601).

## 5) PDF Export

- Uses ReportLab. Snapshot is the last received camera frame.
- Output files named like `PG-Scan_YYYYMMDD_HHMMSS.pdf` in a `reports/` folder.

## 6) Mappings to original webapp

| Webapp             | Desktop (this project)                    |
|--------------------|-------------------------------------------|
| IndexedDB          | SQLite (`db.py`)                          |
| jsPDF              | ReportLab (`pdf_export.py`)               |
| HTML form          | PyQt form controls                        |
| TeachableScript.js | `model_runner.py` (pluggable)             |
| PdfExport.js       | `pdf_export.py`                           |
| View Records modal | Records dialog + table in main window     |

## 7) Known notes

- Camera: uses QtMultimedia. If your camera doesn’t appear:
  - Close any app that might be using the webcam.
  - Try selecting a different camera in the dropdown (if present).
  - Ensure platform multimedia codecs/drivers are installed.

## 8) Troubleshooting

- **No PyQt6 wheel for Python 3.14 on your OS yet**: try Python 3.12/3.11 temporarily, or build from source.
- **ReportLab font warnings**: harmless; we embed default fonts.
- **PDF looks empty**: ensure the camera is started before exporting.

## 9) Safety

This is a prototype and **not** a medical device. Do not use for clinical diagnosis.
