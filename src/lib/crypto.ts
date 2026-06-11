/**
 * SecureCrypt — Crypto Engine
 *
 * Algorithm:    AES-256-GCM  (AEAD — Authenticated Encryption with Associated Data)
 * Key Derivation: PBKDF2 with SHA-256, 100,000 iterations
 * Salt:          128-bit cryptographically random per operation
 * IV/Nonce:      96-bit cryptographically random per operation
 * Auth Tag:      128-bit (GCM built-in tamper detection)
 *
 * File format:  [MAGIC 4B] [SALT 16B] [IV 12B] [CIPHERTEXT + 16B AUTH TAG]
 *
 * 100% browser-side via Web Crypto API — zero server calls.
 */

/** Magic bytes to identify SecureCrypt encrypted files */
const MAGIC = new Uint8Array([0x53, 0x43, 0x52, 0x59]) // "SCRY"

const SALT_LEN       = 16
const IV_LEN         = 12
const ITERATIONS     = 100_000
const KEY_BITS       = 256
const HEADER_LEN     = MAGIC.length + SALT_LEN + IV_LEN // 32 bytes

export interface CryptoResult {
  success: boolean
  data?: Uint8Array
  error?: string
  errorType?: 'wrong_password' | 'invalid_format' | 'corrupted' | 'unknown'
}

// ─── Key Derivation ───────────────────────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

/**
 * Encrypts arbitrary binary data using AES-256-GCM.
 *
 * @param plainData  - raw file bytes to encrypt
 * @param password   - user-provided password string
 * @returns          - encrypted blob with embedded salt, IV, and auth tag
 */
export async function encryptFile(plainData: Uint8Array, password: string): Promise<CryptoResult> {
  try {
    if (!password || password.length < 1) {
      return { success: false, error: 'Password cannot be empty.', errorType: 'unknown' }
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
    const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN))
    const key  = await deriveKey(password, salt)

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plainData as any
    )
    const cipherData = new Uint8Array(cipherBuffer)

    // Assemble: [MAGIC][SALT][IV][CIPHERTEXT+AUTH_TAG]
    const result = new Uint8Array(HEADER_LEN + cipherData.length)
    let offset = 0
    result.set(MAGIC,      offset); offset += MAGIC.length
    result.set(salt,       offset); offset += SALT_LEN
    result.set(iv,         offset); offset += IV_LEN
    result.set(cipherData, offset)

    return { success: true, data: result }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Encryption failed.',
      errorType: 'unknown',
    }
  }
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

/**
 * Decrypts a SecureCrypt encrypted blob.
 *
 * @param encData   - encrypted file bytes (must start with SCRY magic)
 * @param password  - original password used for encryption
 * @returns         - decrypted raw bytes or structured error
 */
export async function decryptFile(encData: Uint8Array, password: string): Promise<CryptoResult> {
  try {
    // Minimum size check
    if (encData.length < HEADER_LEN + 16) {
      return {
        success: false,
        error: 'File is too small to be a valid SecureCrypt file.',
        errorType: 'invalid_format',
      }
    }

    // Magic bytes validation
    for (let i = 0; i < MAGIC.length; i++) {
      if (encData[i] !== MAGIC[i]) {
        return {
          success: false,
          error: 'This file was not encrypted by SecureCrypt or the file is corrupted. Magic bytes mismatch.',
          errorType: 'invalid_format',
        }
      }
    }

    let offset = MAGIC.length
    const salt       = encData.slice(offset, offset + SALT_LEN); offset += SALT_LEN
    const iv         = encData.slice(offset, offset + IV_LEN);   offset += IV_LEN
    const cipherData = encData.slice(offset)

    const key = await deriveKey(password, salt)

    let plainBuffer: ArrayBuffer
    try {
      plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherData as any
      )
    } catch {
      // AES-GCM throws when auth tag fails — always means wrong key/password or corrupted data
      return {
        success: false,
        error: 'Decryption failed. The password is incorrect or the file is corrupted.',
        errorType: 'wrong_password',
      }
    }

    return { success: true, data: new Uint8Array(plainBuffer) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Decryption failed.',
      errorType: 'unknown',
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Generates a cryptographically secure random password */
export function generateSecurePassword(length = 20): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|'
  const arr = crypto.getRandomValues(new Uint8Array(length * 2))
  let result = ''
  for (let i = 0; i < arr.length && result.length < length; i++) {
    if (arr[i] < 248) result += charset[arr[i] % charset.length]
  }
  return result
}

/** Returns a score 0-3 representing password strength */
export function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 14) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(3, Math.floor((score / 5) * 4)) as 0 | 1 | 2 | 3
}

/** Triggers a browser download of binary data */
export function downloadBlob(data: Uint8Array, filename: string): void {
  const blob = new Blob([data as any], { type: 'application/octet-stream' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Formats bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
