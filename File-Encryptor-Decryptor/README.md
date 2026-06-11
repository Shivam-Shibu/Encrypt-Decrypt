# 🔐 SecureCrypt — Premium File Encryption Desktop App

> Military-grade AES-256-GCM file encryption with a premium glassmorphism UI — built with Electron + C++ backend.

---

## ✨ Features

- **AES-256-GCM Encryption** — authenticated encryption, tamper-evident
- **PBKDF2-SHA256 Key Derivation** — 100,000 iterations, salted
- **Drag & Drop Interface** — drop any file to encrypt/decrypt instantly
- **Password Strength Meter** — real-time password quality feedback
- **Strong Password Generator** — cryptographically secure random passwords
- **File History** — persistent log of all operations with search & filter
- **Dark/Light Theme** — smooth animated toggle
- **Frameless Premium UI** — glassmorphism design inspired by Linear, Arc, Notion
- **Completely Offline** — all encryption happens locally, no network calls

---

## 🗂️ Project Structure

```
File-Encryptor-Decryptor/
├── main.cpp                              ← C++ CLI entry point
├── Makefile                              ← C++ build system
├── .env                                  ← CLI encryption key (gitignored)
├── .env.example                          ← Safe example
├── .gitignore                            ← Security: ignores .env, binaries
│
├── src/app/
│   ├── encryptDecrypt/
│   │   ├── Cryption.hpp                  ← XOR+SHA256 engine header
│   │   ├── Cryption.cpp                  ← SHA-256 impl + XOR stream cipher
│   │   └── CryptionMain.cpp              ← Standalone cryption worker
│   ├── fileHandling/
│   │   ├── IO.hpp / IO.cpp               ← File stream wrapper
│   │   ├── ReadEnv.hpp                   ← [NEW] Environment reader header
│   │   └── ReadEnv.cpp                   ← .env key reader
│   └── processes/
│       ├── Task.hpp                      ← Task struct (fixed warnings)
│       ├── ProcessManagement.hpp
│       └── ProcessManagement.cpp         ← Fixed: removed dead Windows API code
│
├── ui/                                   ← Electron Desktop App
│   ├── index.html                        ← Premium UI (Glassmorphism)
│   ├── style.css                         ← Complete design system
│   ├── app.js                            ← AES-256-GCM + all page logic
│   ├── package.json                      ← Electron + Vite config
│   ├── vite.config.js                    ← Vite bundler config
│   ├── electron/
│   │   ├── main.js                       ← Electron main process
│   │   └── preload.js                    ← Secure IPC bridge
│   ├── assets/
│   │   └── icon.png                      ← App icon
│   └── dist/                             ← Built UI (after npm run build)
│
└── test/                                 ← Sample test files
```

---

## 🚀 Running the Desktop App (Electron)

### Prerequisites
- Node.js v18+ (you have v24)
- npm v9+

### Development Mode (with hot reload)
```bash
cd ui
npm run dev
```

This launches Vite dev server + Electron window together.

### Production Build (create distributable)
```bash
cd ui
npm run dist
```

Output: `ui/release/SecureCrypt Setup 1.0.0.exe` — a full Windows installer.

---

## 🔨 Building the C++ CLI Backend

### Requirements
- g++ 13+ (MinGW on Windows — you have it)
- C++17 support

### Build
```bash
# From project root
g++ -std=c++17 -O2 -Wall -DWIN32 ^
    -I. -Isrc/app/encryptDecrypt -Isrc/app/fileHandling -Isrc/app/processes ^
    main.cpp ^
    src/app/processes/ProcessManagement.cpp ^
    src/app/fileHandling/IO.cpp ^
    src/app/fileHandling/ReadEnv.cpp ^
    src/app/encryptDecrypt/Cryption.cpp ^
    -o encrypt_decrypt.exe
```

### Configure Key
```bash
# Create .env with your key (keep this secret!)
echo MySecretKey123 > .env
```

### Run
```bash
.\encrypt_decrypt.exe
# Enter directory path: C:\Users\you\Documents\secret_folder
# Enter action (encrypt/decrypt): encrypt
```

---

## 🔐 Security Architecture

### Desktop App (Electron UI)
| Component | Implementation |
|-----------|---------------|
| Algorithm | AES-256-GCM (AEAD) |
| Key Derivation | PBKDF2 with SHA-256, 100,000 iterations |
| Salt | 128-bit cryptographically random per file |
| IV/Nonce | 96-bit cryptographically random per file |
| Auth Tag | 128-bit (GCM mode, tamper detection built-in) |
| File Format | `SCRY` magic + SALT + IV + CIPHERTEXT |
| Crypto Provider | Web Crypto API (browser native, FIPS-validated) |

### C++ CLI Backend
| Component | Implementation |
|-----------|---------------|
| Algorithm | XOR stream cipher |
| Key Derivation | SHA-256 of password (manual, dependency-free) |
| Key Length | 256-bit (32 bytes) |

### Why Two Crypto Systems?
The desktop UI uses the browser's built-in **Web Crypto API** which provides real AES-256-GCM. The C++ CLI uses XOR+SHA256 which is dependency-free (no OpenSSL required). Files encrypted in the UI are **not** compatible with the CLI (they use different algorithms).

---

## 🐛 Bugs Fixed (15 Total)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | 🔴 Critical | `ProcessManagement.cpp` | `#include` inside function body → moved to top |
| 2 | 🔴 Critical | `ProcessManagement.cpp` | `using namespace std;` inside function → removed |
| 3 | 🔴 Critical | `ProcessManagement.cpp` | Dead `CreateProcess/notepad.exe` code → removed |
| 4 | 🔴 Critical | `Cryption.cpp` | `#include "ReadEnv.cpp"` → changed to `.hpp` |
| 5 | 🔴 Critical | (missing) | `ReadEnv.hpp` didn't exist → created |
| 6 | 🔴 Security | `Cryption.cpp` | Caesar cipher → XOR+SHA256 |
| 7 | 🔴 Logic | `main.cpp` | `"ENCRYPT"` vs `"encrypt"` comparison → uppercase normalize |
| 8 | 🔴 Security | `.env` | Key `123456` in git → added to `.gitignore` |
| 9 | 🟡 Medium | `Task.hpp` | Member order mismatch → reordered to match initializer |
| 10 | 🟡 Medium | `Cryption.cpp` | No flush before seekp → added `flush()` |
| 11 | 🟡 Medium | `ProcessManagement.cpp` | Duplicate `#include <unistd.h>` → removed |
| 12 | 🟡 Medium | `Cryption.cpp` | `std::localtime` not thread-safe → `localtime_s` |
| 13 | 🟢 Low | `main.cpp` | Missing `return 0` → added |
| 14 | 🟢 Low | `Task.hpp` | Redundant `std::move()` on return → removed |
| 15 | 🟢 Low | `ReadEnv.cpp` | No whitespace trimming → added |

---

## 🎨 UI Design System

- **Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono
- **Primary Accent**: `#6366f1` (Indigo)
- **Success**: `#10b981` (Emerald)
- **Dark BG**: `#0a0a10`
- **Glass Surface**: `rgba(20,20,30,0.72)` + `backdrop-filter: blur(20px)`
- **Animations**: Spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`)

---

## 📄 License
MIT — Built for educational and portfolio demonstration purposes.
