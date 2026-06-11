// Cryption.hpp
// XOR + SHA-256 key derivation encryption/decryption interface
// FIXED: Removed unnecessary includes, proper header guard

#ifndef CRYPTION_HPP
#define CRYPTION_HPP

#include <string>
#include <vector>
#include <cstdint>

// Derives a 32-byte key from a password string using SHA-256 (manual impl)
std::vector<uint8_t> deriveKey(const std::string& password);

// Encrypts or decrypts file content using XOR with derived key (stream cipher)
// taskData format: "filePath,ENCRYPT" or "filePath,DECRYPT"
int executeCryption(const std::string& taskData);

#endif // CRYPTION_HPP