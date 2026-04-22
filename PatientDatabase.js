// PatientDatabase.js - Browser-based patient record storage with encryption

class PatientDatabase {
  constructor() {
    this.dbName = "PGScannerDB";
    this.version = 1;
    this.db = null;
  }

  // Wraps an IDB request in a Promise — avoids new Promise(async ...) anti-pattern
  _idbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Database failed to open");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains("patients")) {
          const objectStore = db.createObjectStore("patients", {
            keyPath: "id",
            autoIncrement: true,
          });

          objectStore.createIndex("name", "name", { unique: false });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });

        }
      };
    });
  }

  async addPatient(patientData) {
    if (!encryption.isInitialized()) {
      throw new Error("Encryption not initialized. Please set up encryption first.");
    }

    // Encrypt BEFORE creating transaction to prevent timeout
    const encryptedData = await encryption.encrypt({
      ...patientData,
      createdAt: new Date().toISOString(),
    });

    const transaction = this.db.transaction(["patients"], "readwrite");
    const request = transaction.objectStore("patients").add({
      encrypted: true,
      data: encryptedData,
      createdAt: new Date().toISOString(), // Keep unencrypted for sorting
    });

    return this._idbRequest(request);
  }

  async getAllPatients() {
    const transaction = this.db.transaction(["patients"], "readonly");
    const request = transaction.objectStore("patients").getAll();
    const encryptedPatients = await this._idbRequest(request);

    const decryptedPatients = await Promise.all(
      encryptedPatients.map(async (patient) => {
        if (patient.encrypted) {
          try {
            const decryptedData = await encryption.decrypt(patient.data);
            return { id: patient.id, ...decryptedData };
          } catch (error) {
            console.error("Failed to decrypt patient:", patient.id, error);
            return null;
          }
        }
        return patient; // legacy unencrypted
      })
    );

    return decryptedPatients.filter(Boolean);
  }

  async getPatientById(id) {
    const transaction = this.db.transaction(["patients"], "readonly");
    const request = transaction.objectStore("patients").get(id);
    const patient = await this._idbRequest(request);

    if (patient?.encrypted) {
      const decryptedData = await encryption.decrypt(patient.data);
      return { id: patient.id, ...decryptedData };
    }
    return patient;
  }

  async searchPatientsByName(searchTerm) {
    const allPatients = await this.getAllPatients();
    return allPatients.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async deletePatient(id) {
    const transaction = this.db.transaction(["patients"], "readwrite");
    const request = transaction.objectStore("patients").delete(id);
    return this._idbRequest(request);
  }
}

// Create a global instance
const patientDB = new PatientDatabase();
