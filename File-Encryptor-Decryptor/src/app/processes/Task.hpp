// Task.hpp
// Represents a single encryption/decryption work unit
//
// FIXED:
//   - Reordered struct members to match constructor initializer order (eliminates -Wreorder warning)
//   - Removed redundant std::move() on getFileStream() return value (eliminates -Wpessimizing-move)
//   - Added proper exception spec and comments

#ifndef TASK_HPP
#define TASK_HPP

#include "../fileHandling/IO.hpp"
#include <fstream>
#include <string>
#include <sstream>
#include <stdexcept>

enum class Action {
    ENCRYPT,
    DECRYPT
};

struct Task {
    // FIXED: Member order matches constructor initializer list order to avoid -Wreorder warning
    std::fstream f_stream;   // must be first — initialized first in ctor
    Action action;
    std::string filePath;

    // Constructor: takes ownership of an open file stream
    Task(std::fstream&& stream, Action act, std::string path)
        : f_stream(std::move(stream)), action(act), filePath(std::move(path)) {}

    // Deleted copy — fstream is not copyable
    Task(const Task&) = delete;
    Task& operator=(const Task&) = delete;

    // Move allowed
    Task(Task&&) = default;
    Task& operator=(Task&&) = default;

    // Serializes this task to a "filePath,ACTION" string for subprocess passing
    std::string toString() const {
        std::ostringstream oss;
        oss << filePath << ',' << (action == Action::ENCRYPT ? "ENCRYPT" : "DECRYPT");
        return oss.str();
    }

    // Deserializes a task from a "filePath,ACTION" string and reopens the file
    // FIXED: Removed redundant std::move() on getFileStream() which prevented copy elision
    static Task fromString(const std::string& taskData) {
        std::istringstream iss(taskData);
        std::string filePath;
        std::string actionStr;

        if (std::getline(iss, filePath, ',') && std::getline(iss, actionStr)) {
            Action action = (actionStr == "ENCRYPT") ? Action::ENCRYPT : Action::DECRYPT;
            IO io(filePath);
            std::fstream f_stream = io.getFileStream(); // FIXED: removed std::move()
            if (f_stream.is_open()) {
                return Task(std::move(f_stream), action, filePath);
            } else {
                throw std::runtime_error("Failed to open file: " + filePath);
            }
        } else {
            throw std::runtime_error("Invalid task data format: " + taskData);
        }
    }
};

#endif // TASK_HPP