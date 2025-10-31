// PatientDatabase.js - Browser-based patient record storage using IndexedDB

class PatientDatabase {
  constructor() {
    this.dbName = "PGScannerDB";
    this.version = 1;
    this.db = null;
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Database failed to open");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("Database opened successfully");
        resolve(this.db);
      };

      // Create object store if it doesn't exist
      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains("patients")) {
          const objectStore = db.createObjectStore("patients", {
            keyPath: "id",
            autoIncrement: true,
          });

          // Create indexes for searching
          objectStore.createIndex("name", "name", { unique: false });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });

          console.log("Object store created");
        }
      };
    });
  }

  // Add a new patient record
  async addPatient(patientData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readwrite");
      const objectStore = transaction.objectStore("patients");

      // Add timestamp
      const patient = {
        ...patientData,
        createdAt: new Date().toISOString(),
      };

      const request = objectStore.add(patient);

      request.onsuccess = () => {
        console.log("Patient added with ID:", request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("Error adding patient");
        reject(request.error);
      };
    });
  }

  // Get all patients
  async getAllPatients() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readonly");
      const objectStore = transaction.objectStore("patients");
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get patient by ID
  async getPatientById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readonly");
      const objectStore = transaction.objectStore("patients");
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Search patients by name
  async searchPatientsByName(searchTerm) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readonly");
      const objectStore = transaction.objectStore("patients");
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const patients = request.result;
        const filtered = patients.filter((p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        resolve(filtered);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Update patient record
  async updatePatient(id, updates) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readwrite");
      const objectStore = transaction.objectStore("patients");

      // First get the existing record
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        const patient = getRequest.result;
        if (patient) {
          // Merge updates with existing data
          const updatedPatient = { ...patient, ...updates };
          const updateRequest = objectStore.put(updatedPatient);

          updateRequest.onsuccess = () => {
            resolve(updatedPatient);
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error("Patient not found"));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Delete patient record
  async deletePatient(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["patients"], "readwrite");
      const objectStore = transaction.objectStore("patients");
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Create a global instance
const patientDB = new PatientDatabase();
