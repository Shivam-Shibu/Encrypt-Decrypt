# 🔐 SecureCrypt — Premium File Encryption Suite

SecureCrypt is a state-of-the-art dual-engine file encryption suite. It combines a zero-trust, browser-only **React web dashboard** with a high-performance **C++ CLI utility** to offer secure, decentralized data protection. 

The frontend uses native browser-based cryptography, ensuring that **no files or passwords ever leave your machine**.

---

## ✨ Features

### 💻 Web Application (React + Vite + TS)
- **Zero-Trust AES-256-GCM Encryption** — Authenticated, tamper-evident encryption using the native browser Web Crypto API.
- **PBKDF2-SHA256 Key Derivation** — Generates secure keys from user passwords using 100,000 iterations and random salt values.
- **Premium Glassmorphism Design** — Matte black dashboard with vibrant emerald green accents inspired by modern SaaS applications (Linear, Vercel, Stripe).
- **Interactive CyberBackdrop** — High-performance `<canvas>` background rendering floating matrix streams, particle networks, and cursor magnetic gravity.
- **Security Insights Console** — Live FIPS 140-2, HIPAA, and GDPR compliance checkmarks, and real-time cryptography parameter displays.
- **Persistent Local History** — Tracks user actions securely in the browser's `localStorage` with options to filter, search, clear, or export logs as JSON.

### ⚙️ Backend CLI Utility (C++)
- **XOR Stream Cipher** — Dependency-free custom stream cipher.
- **SHA-256 Key Derivation** — Secure key derivation from secret passphrases without heavy external library dependencies.
- **Multi-Process Cryption Engine** — Splitted master-worker process design for file isolation and robust operations.
- **Cross-Platform Compatibility** — Clean C++17 code compiled using a standard GNU `Makefile`.

---

## 🗂️ Project Architecture

```
encrypt-decrypt/                       ← Workspace Root
├── dist/                             ← Production web build (Vite output)
├── public/                           ← Static assets & favicons
├── src/                              ← Web Application Code (React + TypeScript)
│   ├── assets/                       ← Vector graphics and images
│   ├── components/
│   │   ├── pages/                    ← Dashboard Views (Encrypt, Decrypt, History, Settings)
│   │   └── ui/                       ← Reusable UI elements (Button, Card, CyberBackdrop, etc.)
│   ├── hooks/                        ← Custom hooks (useHistory log manager)
│   ├── lib/
│   │   ├── crypto.ts                 ← Web Crypto API encryption implementation
│   │   └── utils.ts                  ← Tailwind utility functions
│   ├── App.tsx                       ← Dashboard shell, router, and context provider
│   └── main.tsx                      ← Application mounting point
├── File-Encryptor-Decryptor/          ← C++ CLI application
│   ├── src/app/
│   │   ├── encryptDecrypt/           ← C++ XOR/SHA-256 implementation
│   │   ├── fileHandling/             ← File streams and .env parser
│   │   └── processes/                ← Master-worker process managers
│   ├── main.cpp                      ← CLI main entry point
│   ├── Makefile                      ← Compiler instruction rules
│   └── test/                         ← Sample directory for test assets
├── package.json                      ← React application dependencies & scripts
├── tsconfig.json                     ← TypeScript configuration
├── vercel.json                       ← Production routing & HTTP security headers
└── vite.config.ts                    ← Vite build & Tailwind compiler configurations
```

---

## 🚀 Running the Web App Locally

### Prerequisites
- **Node.js** v18 or later (e.g., v24)
- **npm** v9 or later

### Installation & Run
1. Clone the repository and navigate to the project directory:
   ```bash
   cd "encrypt decrypt"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the hot-reloading development server:
   ```bash
   npm run dev
   ```
   *The local server will run on [http://localhost:5173/](http://localhost:5173/)*.

4. Compile the production bundle:
   ```bash
   npm run build
   ```

---

## 🔨 Building the C++ CLI utility

### Prerequisites
- **g++** compiler with support for C++17 (e.g., MinGW-w64 on Windows)
- **GNU Make**

### Compilation
1. Navigate to the C++ project folder:
   ```bash
   cd File-Encryptor-Decryptor
   ```
2. Build the main executable targets:
   ```bash
   make all
   ```
   This generates `encrypt_decrypt.exe` and `cryption.exe` in the directory.

3. Set up the local environment key:
   Create a `.env` file containing your encryption key (never commit this to version control):
   ```bash
   echo YourSecretKeyGoesHere > .env
   ```

4. Run the CLI tool:
   ```powershell
   ./encrypt_decrypt.exe
   ```

---

## 🔐 Cryptographic Specification

### Frontend Web UI (AES-256-GCM)
| Variable | Value / Protocol | Purpose |
|---|---|---|
| **Cipher Algorithm** | `AES-GCM` | Authenticated Symmetric Encryption |
| **Key Size** | 256 bits | Industry-standard security level |
| **KDF** | `PBKDF2` (100,000 iterations) | Derives strong keys from passwords |
| **Hash Function** | `SHA-256` | KDF hashing mechanism |
| **Salt** | 128-bit random bytes | Unique salt generated per file |
| **IV/Nonce** | 96-bit random bytes | Unique initialization vector per file |
| **Auth Tag** | 128-bit integrity tag | Automatic tamper and corruption detection |
| **API Provider** | Browser Native Web Crypto API | FIPS-compliant, browser sandboxed memory |

### C++ CLI Tool (XOR-SHA256)
| Variable | Value / Protocol | Purpose |
|---|---|---|
| **Cipher Algorithm** | XOR Stream Cipher | Lightweight stream cipher |
| **Key Size** | 256 bits | High entropy state |
| **KDF** | SHA-256 Hash | Single hash key derivation |
| **External Dependencies** | None | Runs natively on standard libraries |

> [!NOTE]
> **Compatibility Check:** Because the Frontend uses industry-grade authenticated AES-256-GCM and the C++ CLI uses a custom stream XOR-SHA256 cipher, files encrypted on the Web Dashboard are not compatible with the C++ CLI tool, and vice-versa.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
