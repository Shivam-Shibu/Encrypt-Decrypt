// IO.hpp
#ifndef IO_HPP
#define IO_HPP

#include <fstream>
#include <string>

class IO {
public:
    IO(const std::string& file_path);
    // here we pass it by the refernece 

    // here we take the file path and the path does not changes so we generally keeps the const

    ~IO();
    std::fstream getFileStream();

private:
    std::fstream file_stream;
    // it works as the getter and setter method 
    
};

#endif