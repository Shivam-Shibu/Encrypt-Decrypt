// ReadEnv.hpp
// Reads the encryption key from the .env file
// Part of SecureCrypt — Refactored by SecureCrypt upgrade

#ifndef READENV_HPP
#define READENV_HPP

#include <string>

class ReadEnv {
public:
    // Returns the raw content of the .env file (the key string)
    // Throws std::runtime_error if .env is missing or unreadable
    std::string getenv();
};

#endif // READENV_HPP
