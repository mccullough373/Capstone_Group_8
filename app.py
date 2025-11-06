import sys
from datetime import datetime
from dataclasses import dataclass
from typing import Optional

from PyQt6.QtCore import Qt, QTimer, QByteArray, QBuffer, QIODevice, QSize
from PyQt6.QtGui import QImage
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QVBoxLayout, QHBoxLayout, QPushButton, QLineEdit,
    QComboBox, QTextEdit, QMessageBox, QTableWidget, QTableWidgetItem, QHeaderView,
    QGroupBox, QGridLayout
)
from PyQt6.QtMultimedia import QMediaDevices, QCamera, QMediaCaptureSession
from PyQt6.QtMultimediaWidgets import QVideoWidget
from PyQt6.QtMultimedia import QVideoSink, QVideoFrame

import db
from pdf_export import export_pdf
from model_runner import ModelRunner

UPDATE_INTERVAL_MS = 1250  # match your web app default

@dataclass
class Patient:
    name: str
    age: int
    sex: str
    notes: str = ""
    pdf_filename: Optional[str] = None
    created_at: str = datetime.now().isoformat(timespec="seconds")

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PG Scanner (Desktop)")
        self.resize(1000, 700)

        db.init_db()
        self.model = ModelRunner(update_interval_ms=UPDATE_INTERVAL_MS)

        # UI
        self._build_ui()

        # Camera pipeline
        self.capture_session = QMediaCaptureSession()
        self.camera: Optional[QCamera] = None
        self.video_sink = QVideoSink()
        self.capture_session.setVideoSink(self.video_sink)
        self.video_sink.videoFrameChanged.connect(self.on_video_frame)

        self.last_frame: Optional[QImage] = None

        # Prediction timer
        self.timer = QTimer(self)
        self.timer.setInterval(UPDATE_INTERVAL_MS)
        self.timer.timeout.connect(self.update_prediction)

    def _build_ui(self):
        root = QVBoxLayout(self)

        title = QLabel("<h1>PG Scanner</h1>")
        title.setAlignment(Qt.AlignmentFlag.AlignHCenter)
        root.addWidget(title)

        # Patient form
        form_box = QGroupBox("Patient Information")
        form = QGridLayout(form_box)

        self.name_edit = QLineEdit()
        self.age_edit = QLineEdit()
        self.age_edit.setPlaceholderText("0-150")
        self.sex_combo = QComboBox()
        self.sex_combo.addItems(["", "Male", "Female", "Other"])
        self.notes_edit = QTextEdit()

        form.addWidget(QLabel("Patient Name:"), 0, 0)
        form.addWidget(self.name_edit, 0, 1)
        form.addWidget(QLabel("Age:"), 1, 0)
        form.addWidget(self.age_edit, 1, 1)
        form.addWidget(QLabel("Sex:"), 2, 0)
        form.addWidget(self.sex_combo, 2, 1)
        form.addWidget(QLabel("Notes (Optional):"), 3, 0, Qt.AlignmentFlag.AlignTop)
        form.addWidget(self.notes_edit, 3, 1)

        root.addWidget(form_box)

        # Camera + controls
        self.video_widget = QVideoWidget()
        self.video_widget.setMinimumSize(QSize(640, 360))
        root.addWidget(self.video_widget)

        self.conf_label_title = QLabel("<h3>Confidence Levels</h3>")
        self.conf_label_title.setVisible(False)
        root.addWidget(self.conf_label_title, alignment=Qt.AlignmentFlag.AlignHCenter)

        self.conf_value_label = QLabel("")
        self.conf_value_label.setVisible(False)
        font = self.conf_value_label.font()
        font.setPointSize(14)
        font.setBold(True)
        self.conf_value_label.setFont(font)
        root.addWidget(self.conf_value_label, alignment=Qt.AlignmentFlag.AlignHCenter)

        btn_row = QHBoxLayout()
        self.view_records_btn = QPushButton("View Records")
        self.export_pdf_btn = QPushButton("Export PDF")
        self.export_pdf_btn.setEnabled(False)
        self.start_cam_btn = QPushButton("Start Camera Feed")

        btn_row.addWidget(self.view_records_btn)
        btn_row.addWidget(self.export_pdf_btn)
        btn_row.addWidget(self.start_cam_btn)
        root.addLayout(btn_row)

        # Connections
        self.start_cam_btn.clicked.connect(self.start_camera)
        self.export_pdf_btn.clicked.connect(self.do_export_pdf)
        self.view_records_btn.clicked.connect(self.show_records)

    def validate_form(self) -> bool:
        name = self.name_edit.text().strip()
        age_txt = self.age_edit.text().strip()
        sex = self.sex_combo.currentText()

        if not name:
            QMessageBox.warning(self, "Validation", "Please enter patient name.")
            return False
        try:
            age = int(age_txt)
            if age < 0 or age > 150:
                raise ValueError
        except Exception:
            QMessageBox.warning(self, "Validation", "Please enter a valid age (0-150).")
            return False
        if not sex:
            QMessageBox.warning(self, "Validation", "Please select patient sex.")
            return False
        return True

    def start_camera(self):
        if not self.validate_form():
            return

        self.start_cam_btn.setEnabled(False)
        self.start_cam_btn.setText("Loading...")

        cams = QMediaDevices.videoInputs()
        if not cams:
            QMessageBox.critical(self, "Camera", "No camera device detected.")
            self.start_cam_btn.setEnabled(True)
            self.start_cam_btn.setText("Start Camera Feed")
            return
        self.camera = QCamera(cams[0])
        self.capture_session.setCamera(self.camera)
        self.capture_session.setVideoOutput(self.video_widget)
        self.camera.errorOccurred.connect(lambda e, s: print("Camera error:", e, s))
        self.camera.start()

        self.conf_label_title.setVisible(True)
        self.conf_value_label.setVisible(True)
        self.export_pdf_btn.setEnabled(True)
        self.start_cam_btn.setVisible(False)

        self.timer.start()

    def on_video_frame(self, frame: QVideoFrame):
        if not frame.isValid():
            return
        img = frame.toImage()
        if not img.isNull():
            self.last_frame = img

    def qimage_to_bytes(self, image: QImage) -> bytes:
        ba = QByteArray()
        buff = QBuffer(ba)
        buff.open(QIODevice.OpenModeFlag.WriteOnly)
        image.save(buff, "JPEG", quality=92)
        return bytes(ba)

    def update_prediction(self):
        if self.last_frame is None:
            return
        pred = self.model.predict(self.last_frame)
        prob_pct = pred.probability * 100.0
        txt = f"{pred.class_name} Detected: {prob_pct:.1f}%"

        if prob_pct >= 70:
            bg = "#22C55E"   # green
        elif prob_pct >= 40:
            bg = "#EAB308"   # yellow
        else:
            bg = "#EF4444"   # red
        self.conf_value_label.setText(f"<div style='background:{bg};padding:10px;border-radius:8px;color:#000;font-weight:700'>{txt}</div>")

    def do_export_pdf(self):
        if self.last_frame is None:
            QMessageBox.warning(self, "Export PDF", "No frame available yet.")
            return
        import re
        conf_text = self.conf_value_label.text()
        conf_text_plain = re.sub('<[^<]+?>', '', conf_text) or "No confidence values available."

        img_bytes = self.qimage_to_bytes(self.last_frame)
        pdf_path = export_pdf(img_bytes, conf_text_plain)

        p = Patient(
            name=self.name_edit.text().strip(),
            age=int(self.age_edit.text().strip()),
            sex=self.sex_combo.currentText(),
            notes=self.notes_edit.toPlainText().strip(),
            pdf_filename=pdf_path,
            created_at=datetime.now().isoformat(timespec="seconds"),
        )
        pid = db.add_patient(p.__dict__)
        QMessageBox.information(self, "Export PDF", f"Patient record saved! ID: {pid}\nPDF: {pdf_path}")

    def show_records(self):
        rows = db.get_all_patients()

        dlg = QWidget(self, flags=Qt.WindowType.Dialog)
        dlg.setWindowTitle("Patient Records")
        v = QVBoxLayout(dlg)

        filter_row = QHBoxLayout()
        search_edit = QLineEdit()
        search_edit.setPlaceholderText("Search by name...")
        btn_search = QPushButton("Search")
        btn_all = QPushButton("Show All")
        filter_row.addWidget(search_edit)
        filter_row.addWidget(btn_search)
        filter_row.addWidget(btn_all)
        v.addLayout(filter_row)

        table = QTableWidget(0, 7)
        table.setHorizontalHeaderLabels(["ID", "Name", "Age", "Sex", "Date", "PDF", "Actions"])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        v.addWidget(table)

        def populate(data):
            table.setRowCount(0)
            for r in data:
                row = table.rowCount()
                table.insertRow(row)
                vals = [
                    str(r["id"]), r["name"], str(r["age"]), r["sex"],
                    str(r["created_at"]), r["pdf_filename"] or "N/A", ""
                ]
                for col, val in enumerate(vals[:-1]):
                    item = QTableWidgetItem(val)
                    table.setItem(row, col, item)

                btn_view = QPushButton("View")
                btn_del = QPushButton("Delete")
                hl = QHBoxLayout()
                cell = QWidget()
                hl.addWidget(btn_view); hl.addWidget(btn_del); hl.addStretch(1)
                hl.setContentsMargins(0,0,0,0)
                cell.setLayout(hl)
                table.setCellWidget(row, 6, cell)

                def do_view(rid=r["id"]):
                    rec = db.get_patient_by_id(rid)
                    if rec:
                        QMessageBox.information(dlg, "Patient Details",
                            f"Name: {rec['name']}\nAge: {rec['age']}\nSex: {rec['sex']}\nNotes: {rec['notes'] or 'None'}\nPDF: {rec['pdf_filename'] or 'N/A'}\nCreated: {rec['created_at']}")

                def do_del(rid=r["id"]):
                    from PyQt6.QtWidgets import QMessageBox
                    if QMessageBox.question(dlg, "Confirm", "Delete this record?") == QMessageBox.StandardButton.Yes:
                        db.delete_patient(rid)
                        populate(db.get_all_patients())

                btn_view.clicked.connect(do_view)
                btn_del.clicked.connect(do_del)

        populate(rows)

        def on_search():
            q = search_edit.text().strip()
            if q:
                populate(db.search_patients_by_name(q))

        btn_search.clicked.connect(on_search)
        btn_all.clicked.connect(lambda: populate(db.get_all_patients()))

        dlg.resize(900, 500)
        dlg.show()
        dlg.activateWindow()
        dlg.raise_()

def main():
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
