// main.cpp
// SecureCrypt CLI Entry Point
//
// FIXES APPLIED:
//   - FIXED:  Action comparison bug — input now normalized to uppercase before compare
//             (original bug: prompt said "encrypt/decrypt" but code compared "ENCRYPT")
//   - FIXED:  Added return 0 at end of main (was missing — undefined behavior)
//   - ADDED:  Input trimming to handle trailing whitespace/newlines from terminal
//   - ADDED:  More descriptive error messages
//   - CLEANED: Removed 120+ lines of dead commented-out prototype code

#include <iostream>
#include <filesystem>
#include <algorithm>
#include <cctype>
#include <memory>

#include "./src/app/processes/ProcessManagement.hpp"
#include "./src/app/processes/Task.hpp"
#include "./src/app/fileHandling/IO.hpp"

namespace fs = std::filesystem;

// Normalize string to uppercase in-place
static void toUpperInPlace(std::string& str) {
    std::transform(str.begin(), str.end(), str.begin(),
        [](unsigned char c) { return static_cast<char>(std::toupper(c)); });
}

// Trim trailing whitespace and newline characters
static void trimRight(std::string& str) {
    while (!str.empty() && (str.back() == '\n' || str.back() == '\r' ||
                            str.back() == ' '  || str.back() == '\t')) {
        str.pop_back();
    }
}

int main(int /*argc*/, char* /*argv*/[]) {
    std::string directory;
    std::string action;

    std::cout << "=== SecureCrypt CLI ===" << std::endl;
    std::cout << "Enter the directory path: ";
    std::getline(std::cin, directory);
    trimRight(directory);

    std::cout << "Enter the action (encrypt/decrypt): ";
    std::getline(std::cin, action);
    trimRight(action);
    toUpperInPlace(action); // FIXED: normalize to uppercase before comparison

    // Validate action input
    if (action != "ENCRYPT" && action != "DECRYPT") {
        std::cerr << "[ERROR] Invalid action '" << action
                  << "'. Please enter 'encrypt' or 'decrypt'." << std::endl;
        return 1;
    }

    try {
        if (fs::exists(directory) && fs::is_directory(directory)) {
            ProcessManagement processManagement;
            int fileCount = 0;

            for (const auto& entry : fs::recursive_directory_iterator(directory)) {
                if (entry.is_regular_file()) {
                    std::string filePath = entry.path().string();
                    IO io(filePath);
                    std::fstream f_stream = io.getFileStream(); // FIXED: removed redundant std::move

                    if (f_stream.is_open()) {
                        Action taskAction = (action == "ENCRYPT") ? Action::ENCRYPT : Action::DECRYPT;
                        auto task = std::make_unique<Task>(std::move(f_stream), taskAction, filePath);
                        processManagement.submitToQueue(std::move(task));
                        ++fileCount;
                    } else {
                        std::cerr << "[WARN] Unable to open file: " << filePath << std::endl;
                    }
                }
            }

            if (fileCount == 0) {
                std::cout << "[INFO] No files found in directory: " << directory << std::endl;
            } else {
                std::cout << "[INFO] Queued " << fileCount << " file(s) for processing..." << std::endl;
                processManagement.executeTasks();
            }

        } else {
            std::cerr << "[ERROR] Invalid directory path: " << directory << std::endl;
            return 1;
        }

    } catch (const fs::filesystem_error& ex) {
        std::cerr << "[ERROR] Filesystem error: " << ex.what() << std::endl;
        return 1;
    } catch (const std::exception& ex) {
        std::cerr << "[ERROR] Unexpected error: " << ex.what() << std::endl;
        return 1;
    }

    return 0; // FIXED: was missing
}
