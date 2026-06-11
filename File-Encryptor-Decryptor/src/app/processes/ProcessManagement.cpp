// ProcessManagement.cpp
//
// FIXES APPLIED:
//   - REMOVED: #include <windows.h> placed INSIDE a function body (invalid C++)
//   - REMOVED: using namespace std; inside a function body (invalid C++)
//   - REMOVED: Dead CreateProcess / notepad.exe / WaitForSingleObject code pasted mid-function
//   - REMOVED: Duplicate #include <unistd.h> (not available on Windows MSVC)
//   - FIXED:   submitToQueue is now a clean, single-responsibility method
//   - ADDED:   Exception handling in executeTasks to prevent one failure stopping all

#include "ProcessManagement.hpp"
#include "../encryptDecrypt/Cryption.hpp"
#include <iostream>
#include <stdexcept>

ProcessManagement::ProcessManagement() {}

// Pushes a task onto the internal FIFO queue
bool ProcessManagement::submitToQueue(std::unique_ptr<Task> task) {
    if (!task) {
        std::cerr << "[ERROR] Attempted to submit null task." << std::endl;
        return false;
    }
    taskQueue.push(std::move(task));
    return true;
}

// Drains the task queue and executes each encryption/decryption operation
void ProcessManagement::executeTasks() {
    int processed = 0;
    int failed = 0;

    while (!taskQueue.empty()) {
        std::unique_ptr<Task> taskToExecute = std::move(taskQueue.front());
        taskQueue.pop();

        std::cout << "[INFO] Processing: " << taskToExecute->toString() << std::endl;

        try {
            // executeCryption takes a serialized task string and re-opens the file internally
            int result = executeCryption(taskToExecute->toString());
            if (result == 0) {
                ++processed;
            } else {
                ++failed;
                std::cerr << "[WARN] Task returned non-zero: " << taskToExecute->filePath << std::endl;
            }
        } catch (const std::exception& ex) {
            ++failed;
            std::cerr << "[ERROR] Task failed for " << taskToExecute->filePath
                      << ": " << ex.what() << std::endl;
        }
    }

    std::cout << "[DONE] Tasks complete. Processed: " << processed
              << " | Failed: " << failed << std::endl;
}