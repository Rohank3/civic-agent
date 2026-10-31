/**
 * Zero-Knowledge Client-Side Document Vault
 * 
 * Powered by W3C WebCrypto API:
 * - PBKDF2 (100,000 iterations, SHA-256) for password key derivation
 * - AES-GCM (256-bit key, 12-byte random IV) for authenticated encryption
 * - IndexedDB persistent storage with encrypted-payload fallback
 * 
 * Guarantees:
 * 1. Documents (transcripts, income certificates) persist across user sessions.
 * 2. Users never have to re-upload files when applying for multiple scholarships.
 * 3. Server never sees unencrypted documents or keys at rest.
 */

import type { CitizenProfile, DualDocumentExtractionResult } from '../types';

export interface StoredDocument {
  name: string;
  kind: 'pdf' | 'image' | 'text';
  content: string; // Base64 payload
  uploadedAt: string;
}

export interface VaultData {
  userId: string;
  profile: CitizenProfile;
  documents: {
    transcript?: StoredDocument;
    incomeCertificate?: StoredDocument;
  };
  dualDocResult?: DualDocumentExtractionResult | null;
  updatedAt: string;
}

export interface EncryptedEnvelope {
  version: 1;
  salt: string; // Base64 encoded 16 bytes
  iv: string;   // Base64 encoded 12 bytes
  ciphertext: string; // Base64 encoded ciphertext
}

const DB_NAME = 'CivicAgentClientVault';
const STORE_NAME = 'user_vaults';
const DB_VERSION = 1;

// Deterministic default salt basis for guest/demo sandbox sessions
const DEFAULT_DEMO_SECRET = 'civicagent-zk-vault-demo-key-2026';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a user password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary JSON serializable data with AES-256-GCM.
 */
export async function encryptVaultPayload<T>(data: T, password: string): Promise<EncryptedEnvelope> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    encodedData
  );

  return {
    version: 1,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypt AES-256-GCM encrypted envelope back into structured data.
 */
export async function decryptVaultPayload<T>(envelope: EncryptedEnvelope, password: string): Promise<T> {
  const salt = new Uint8Array(base64ToArrayBuffer(envelope.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(envelope.iv));
  const ciphertext = base64ToArrayBuffer(envelope.ciphertext);

  const key = await deriveKey(password, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

/**
 * Open or create IndexedDB instance for encrypted vaults.
 */
function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
  });
}

/**
 * Store encrypted vault in IndexedDB (with localStorage ciphertext fallback).
 */
export async function saveVault(
  userId: string,
  data: VaultData,
  passphrase?: string
): Promise<void> {
  const key = passphrase || DEFAULT_DEMO_SECRET;
  const encrypted = await encryptVaultPayload(data, key);

  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ userId, envelope: encrypted, updatedAt: data.updatedAt });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, storing encrypted envelope in localStorage fallback', err);
    localStorage.setItem(`civic_zk_vault_${userId}`, JSON.stringify(encrypted));
  }
}

/**
 * Load and decrypt vault data for the specified user.
 */
export async function loadVault(
  userId: string,
  passphrase?: string
): Promise<VaultData | null> {
  const key = passphrase || DEFAULT_DEMO_SECRET;
  let envelope: EncryptedEnvelope | null = null;

  try {
    const db = await openVaultDB();
    const record = await new Promise<{ userId: string; envelope: EncryptedEnvelope } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
    );
    if (record?.envelope) {
      envelope = record.envelope;
    }
  } catch {
    // Fallback to localStorage check
  }

  if (!envelope) {
    const fallback = localStorage.getItem(`civic_zk_vault_${userId}`);
    if (fallback) {
      try {
        envelope = JSON.parse(fallback);
      } catch {
        envelope = null;
      }
    }
  }

  if (!envelope) {
    return null;
  }

  try {
    return await decryptVaultPayload<VaultData>(envelope, key);
  } catch (err) {
    console.error('Failed to decrypt vault with provided passphrase', err);
    return null;
  }
}

/**
 * Check if an encrypted vault exists for the given user.
 */
export async function hasVault(userId: string): Promise<boolean> {
  try {
    const db = await openVaultDB();
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(userId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count > 0) return true;
  } catch {
    // Check fallback
  }

  return Boolean(localStorage.getItem(`civic_zk_vault_${userId}`));
}

/**
 * Delete encrypted vault for the user.
 */
export async function clearVault(userId: string): Promise<void> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(userId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback
  }
  localStorage.removeItem(`civic_zk_vault_${userId}`);
}
