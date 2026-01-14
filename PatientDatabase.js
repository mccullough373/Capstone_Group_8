// PatientDatabase.js - Browser-based patient record storage with encryption

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

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains("patients")) {
          const objectStore = db.createObjectStore("patients", {
            keyPath: "id",
            autoIncrement: true,
          });

          objectStore.createIndex("name", "name", { unique: false });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });

          console.log("Object store created");
        }
      };
    });
  }

  // Add a new patient record (with encryption)
  async addPatient(patientData) {
    // Check if encryption is initialized
    if (!encryption.isInitialized()) {
      throw new Error(
        "Encryption not initialized. Please set up encryption first."
      );
    }

    try {
      // IMPORTANT: Encrypt BEFORE creating transaction to prevent timeout
      const encryptedData = await encryption.encrypt({
        ...patientData,
        createdAt: new Date().toISOString(),
      });

      // Now create transaction with pre-encrypted data
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["patients"], "readwrite");
        const objectStore = transaction.objectStore("patients");

        // Store encrypted data
        const patient = {
          encrypted: true,
          data: encryptedData,
          createdAt: new Date().toISOString(), // Keep timestamp unencrypted for sorting
        };

        const request = objectStore.add(patient);

        request.onsuccess = () => {
          console.log("Patient added with ID:", request.result);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("Error adding patient:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Encryption error:", error);
      throw error;
    }
  }

  // Get all patients (with decryption)
  async getAllPatients() {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction(["patients"], "readonly");
        const objectStore = transaction.objectStore("patients");
        const request = objectStore.getAll();

        request.onsuccess = async () => {
          const encryptedPatients = request.result;

          // Decrypt all patients
          const decryptedPatients = await Promise.all(
            encryptedPatients.map(async (patient) => {
              if (patient.encrypted) {
                try {
                  const decryptedData = await encryption.decrypt(patient.data);
                  return {
                    id: patient.id,
                    ...decryptedData,
                  };
                } catch (error) {
                  console.error(
                    "Failed to decrypt patient:",
                    patient.id,
                    error
                  );
                  return null;
                }
              } else {
                // Legacy unencrypted data
                return patient;
              }
            })
          );

          // Filter out failed decryptions
          resolve(decryptedPatients.filter((p) => p !== null));
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get patient by ID (with decryption)
  async getPatientById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction(["patients"], "readonly");
        const objectStore = transaction.objectStore("patients");
        const request = objectStore.get(id);

        request.onsuccess = async () => {
          const patient = request.result;

          if (patient && patient.encrypted) {
            try {
              const decryptedData = await encryption.decrypt(patient.data);
              resolve({
                id: patient.id,
                ...decryptedData,
              });
            } catch (error) {
              console.error("Failed to decrypt patient:", error);
              reject(error);
            }
          } else {
            resolve(patient);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Search patients by name (with decryption)
  async searchPatientsByName(searchTerm) {
    // Get all patients and decrypt, then filter
    const allPatients = await this.getAllPatients();
    return allPatients.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Update patient record (with encryption)
  async updatePatient(id, updates) {
    try {
      // First get the existing record
      const patient = await this.getPatientById(id);

      if (!patient) {
        throw new Error("Patient not found");
      }

      // Merge updates
      const updatedData = { ...patient, ...updates };
      delete updatedData.id; // Remove id from data before encryption

      // IMPORTANT: Encrypt BEFORE creating transaction to prevent timeout
      const encryptedData = await encryption.encrypt(updatedData);

      // Now create transaction with pre-encrypted data
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["patients"], "readwrite");
        const objectStore = transaction.objectStore("patients");

        const updatedPatient = {
          id: id,
          encrypted: true,
          data: encryptedData,
          createdAt: patient.createdAt,
        };

        const request = objectStore.put(updatedPatient);

        request.onsuccess = () => {
          resolve(updatedData);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Update patient error:", error);
      throw error;
    }
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
