// ReadEnv.cpp
// Reads encryption key from .env file
// FIXED: Added proper #include, error handling, and class method separation

#include "ReadEnv.hpp"
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>

std::string ReadEnv::getenv() {
    // Look for .env in current working directory
    std::ifstream envFile(".env");
    if (!envFile.is_open()) {
        throw std::runtime_error(
            "Missing .env file — please create a .env file with your encryption key.\n"
            "Example: echo 42 > .env"
        );
    }

    std::stringstream buffer;
    buffer << envFile.rdbuf();
    envFile.close();

    std::string content = buffer.str();

    // Strip trailing whitespace / newlines
    while (!content.empty() && (content.back() == '\n' || content.back() == '\r' || content.back() == ' ')) {
        content.pop_back();
    }

    if (content.empty()) {
        throw std::runtime_error(".env file is empty — please provide a numeric encryption key.");
    }

    return content;
}