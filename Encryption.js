// Encryption.js - Client-side encryption for patient data

class DataEncryption {
  constructor() {
    this.algorithm = "AES-GCM";
    this.keyLength = 256;
    this.key = null;
  }

  // Generate encryption key from password
  async generateKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: this.algorithm, length: this.keyLength },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Initialize with master password
  async init(password) {
    // Get or create salt
    let salt = localStorage.getItem("encryption_salt");
    if (!salt) {
      // Generate new salt (first time setup)
      const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
      salt = this.arrayBufferToBase64(saltBuffer);
      localStorage.setItem("encryption_salt", salt);
    }

    const saltBuffer = this.base64ToArrayBuffer(salt);
    this.key = await this.generateKey(password, saltBuffer);
    return true;
  }

  // Encrypt data
  async encrypt(data) {
    if (!this.key) {
      throw new Error("Encryption key not initialized. Call init() first.");
    }

    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      // Generate random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        this.key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error("Encryption error:", error);
      throw error;
    }
  }

  // Decrypt data
  async decrypt(encryptedData) {
    if (!this.key) {
      throw new Error("Encryption key not initialized. Call init() first.");
    }

    try {
      // Convert from base64
      const combined = this.base64ToArrayBuffer(encryptedData);
      const combinedArray = new Uint8Array(combined);

      // Extract IV and encrypted data
      const iv = combinedArray.slice(0, 12);
      const encryptedBuffer = combinedArray.slice(12);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        this.key,
        encryptedBuffer
      );

      // Convert back to object
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedBuffer);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Decryption error:", error);
      throw error;
    }
  }

  // Helper: ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Check if encryption is initialized
  isInitialized() {
    return this.key !== null;
  }
}

// Create global instance
const encryption = new DataEncryption();
