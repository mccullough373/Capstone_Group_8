import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any

DB_PATH = Path("patients.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    notes TEXT,
    pdf_filename TEXT,
    created_at TEXT NOT NULL
);
"""

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)

def add_patient(record: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO patients (name, age, sex, notes, pdf_filename, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (record["name"], record["age"], record["sex"], record.get("notes"), record.get("pdf_filename"), record["created_at"])
        )
        return cur.lastrowid

def get_all_patients() -> List[sqlite3.Row]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM patients ORDER BY id DESC")
        return cur.fetchall()

def get_patient_by_id(pid: int) -> Optional[sqlite3.Row]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM patients WHERE id = ?", (pid,))
        row = cur.fetchone()
        return row

def search_patients_by_name(query: str) -> List[sqlite3.Row]:
    q = f"%{query.lower()}%"
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM patients WHERE lower(name) LIKE ? ORDER BY id DESC", (q,))
        return cur.fetchall()

def delete_patient(pid: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM patients WHERE id = ?", (pid,))
