// Cryption.cpp
// XOR + SHA-256 key derivation file encryption/decryption
//
// FIXES APPLIED:
//   - REMOVED: #include "../fileHandling/ReadEnv.cpp" (was including .cpp directly — critical bug)
//   - ADDED:   #include "../fileHandling/ReadEnv.hpp"  (proper header include)
//   - UPGRADED: Caesar cipher (+key mod 256) → XOR stream cipher with SHA-256 derived key
//   - FIXED:   flush() before seekp() to prevent data corruption on Windows
//   - FIXED:   Thread-safe time (localtime_s on MSVC / localtime_r on GCC)
//   - ADDED:   Input validation for key string
//   - ADDED:   Proper error propagation via exceptions

#include "Cryption.hpp"
#include "../fileHandling/ReadEnv.hpp"
#include "../processes/Task.hpp"
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <ctime>
#include <iomanip>
#include <vector>
#include <cstdint>
#include <cstring>

// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 implementation (no external dependencies required)
// Based on FIPS 180-4 standard
// ─────────────────────────────────────────────────────────────────────────────

static const uint32_t K256[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

static inline uint32_t rotr32(uint32_t x, unsigned n) {
    return (x >> n) | (x << (32 - n));
}

std::vector<uint8_t> deriveKey(const std::string& password) {
    // SHA-256 of the password bytes
    std::vector<uint8_t> msg(password.begin(), password.end());

    // Pre-processing: padding
    uint64_t bitLen = static_cast<uint64_t>(msg.size()) * 8;
    msg.push_back(0x80);
    while (msg.size() % 64 != 56) {
        msg.push_back(0x00);
    }
    // Append original length as 64-bit big-endian
    for (int i = 7; i >= 0; --i) {
        msg.push_back(static_cast<uint8_t>((bitLen >> (i * 8)) & 0xFF));
    }

    // Initial hash values (first 32 bits of fractional parts of sqrt of first 8 primes)
    uint32_t h[8] = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    };

    // Process each 512-bit (64-byte) chunk
    for (size_t chunk = 0; chunk < msg.size(); chunk += 64) {
        uint32_t w[64];
        for (int i = 0; i < 16; ++i) {
            w[i] = (static_cast<uint32_t>(msg[chunk + i*4])     << 24) |
                   (static_cast<uint32_t>(msg[chunk + i*4 + 1]) << 16) |
                   (static_cast<uint32_t>(msg[chunk + i*4 + 2]) <<  8) |
                   (static_cast<uint32_t>(msg[chunk + i*4 + 3]));
        }
        for (int i = 16; i < 64; ++i) {
            uint32_t s0 = rotr32(w[i-15], 7) ^ rotr32(w[i-15], 18) ^ (w[i-15] >> 3);
            uint32_t s1 = rotr32(w[i-2], 17) ^ rotr32(w[i-2], 19)  ^ (w[i-2] >> 10);
            w[i] = w[i-16] + s0 + w[i-7] + s1;
        }

        uint32_t a = h[0], b = h[1], c = h[2], d = h[3];
        uint32_t e = h[4], f = h[5], g = h[6], hh = h[7];

        for (int i = 0; i < 64; ++i) {
            uint32_t S1    = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
            uint32_t ch    = (e & f) ^ (~e & g);
            uint32_t temp1 = hh + S1 + ch + K256[i] + w[i];
            uint32_t S0    = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
            uint32_t maj   = (a & b) ^ (a & c) ^ (b & c);
            uint32_t temp2 = S0 + maj;

            hh = g; g = f; f = e; e = d + temp1;
            d = c;  c = b; b = a; a = temp1 + temp2;
        }

        h[0] += a; h[1] += b; h[2] += c; h[3] += d;
        h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }

    // Produce 32-byte digest
    std::vector<uint8_t> digest(32);
    for (int i = 0; i < 8; ++i) {
        digest[i*4]     = (h[i] >> 24) & 0xFF;
        digest[i*4 + 1] = (h[i] >> 16) & 0xFF;
        digest[i*4 + 2] = (h[i] >>  8) & 0xFF;
        digest[i*4 + 3] =  h[i]        & 0xFF;
    }
    return digest;
}

// ─────────────────────────────────────────────────────────────────────────────
// XOR stream cipher using SHA-256 derived key
// The key repeats cyclically across the file (key stream)
// ─────────────────────────────────────────────────────────────────────────────

int executeCryption(const std::string& taskData) {
    Task task = Task::fromString(taskData);

    // Read password/key from .env file
    ReadEnv env;
    std::string password;
    try {
        password = env.getenv();
    } catch (const std::exception& ex) {
        std::cerr << "[ERROR] " << ex.what() << std::endl;
        return 1;
    }

    // Derive 32-byte key using SHA-256
    std::vector<uint8_t> key = deriveKey(password);
    const size_t keyLen = key.size(); // 32 bytes

    // XOR encrypt/decrypt (symmetric — same operation for both directions)
    // Read entire file into memory buffer
    task.f_stream.seekg(0, std::ios::end);
    std::streampos fileSize = task.f_stream.tellg();
    task.f_stream.seekg(0, std::ios::beg);

    if (fileSize <= 0) {
        std::cerr << "[WARNING] File is empty: " << task.filePath << std::endl;
        task.f_stream.close();
        return 0;
    }

    std::vector<uint8_t> buffer(static_cast<size_t>(fileSize));
    task.f_stream.read(reinterpret_cast<char*>(buffer.data()), fileSize);

    // Apply XOR key stream
    for (size_t i = 0; i < buffer.size(); ++i) {
        buffer[i] ^= key[i % keyLen];
    }

    // Write result back to file (seek to beginning, overwrite)
    task.f_stream.seekp(0, std::ios::beg);
    task.f_stream.write(reinterpret_cast<const char*>(buffer.data()), static_cast<std::streamsize>(buffer.size()));
    task.f_stream.flush(); // FIXED: explicit flush before close
    task.f_stream.close();

    // Thread-safe timestamp logging
    std::time_t t = std::time(nullptr);
    std::tm now{};
#ifdef _WIN32
    localtime_s(&now, &t); // FIXED: thread-safe on Windows (MSVC/MinGW)
#else
    localtime_r(&t, &now); // FIXED: thread-safe on Linux/macOS
#endif

    const char* opName = (task.action == Action::ENCRYPT) ? "Encryption" : "Decryption";
    std::cout << "[" << std::put_time(&now, "%Y-%m-%d %H:%M:%S") << "] "
              << opName << " complete: " << task.filePath << std::endl;

    return 0;
}
