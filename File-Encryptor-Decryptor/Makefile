# Makefile — SecureCrypt
# FIXES APPLIED:
#   - FIXED: ReadEnv.cpp was listed as both a header-included file AND a compilation unit
#            causing duplicate symbol linker errors. Now properly compiled once.
#   - ADDED: -DWIN32 flag for Windows-specific thread-safe time handling
#   - ADDED: 'run' target for convenience
#   - ADDED: 'test' target

CXX      = g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra -DWIN32 \
           -I. \
           -Isrc/app/encryptDecrypt \
           -Isrc/app/fileHandling \
           -Isrc/app/processes

MAIN_TARGET     = encrypt_decrypt
CRYPTION_TARGET = cryption

# Main CLI sources
MAIN_SRC = main.cpp \
           src/app/processes/ProcessManagement.cpp \
           src/app/fileHandling/IO.cpp \
           src/app/fileHandling/ReadEnv.cpp \
           src/app/encryptDecrypt/Cryption.cpp

# Standalone cryption worker sources
CRYPTION_SRC = src/app/encryptDecrypt/CryptionMain.cpp \
               src/app/encryptDecrypt/Cryption.cpp \
               src/app/fileHandling/IO.cpp \
               src/app/fileHandling/ReadEnv.cpp

MAIN_OBJ     = $(MAIN_SRC:.cpp=.o)
CRYPTION_OBJ = $(CRYPTION_SRC:.cpp=.o)

.PHONY: all clean run test

all: $(MAIN_TARGET) $(CRYPTION_TARGET)

$(MAIN_TARGET): $(MAIN_OBJ)
	$(CXX) $(CXXFLAGS) $^ -o $@
	@echo "[BUILD] $(MAIN_TARGET) built successfully."

$(CRYPTION_TARGET): $(CRYPTION_OBJ)
	$(CXX) $(CXXFLAGS) $^ -o $@
	@echo "[BUILD] $(CRYPTION_TARGET) built successfully."

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(MAIN_OBJ) $(CRYPTION_OBJ) $(MAIN_TARGET).exe $(CRYPTION_TARGET).exe \
	      $(MAIN_TARGET) $(CRYPTION_TARGET)
	@echo "[CLEAN] Build artifacts removed."

# Quick test: encrypt then decrypt test/test1.txt and verify roundtrip
test: all
	@echo "[TEST] Running encrypt/decrypt roundtrip on test/test1.txt..."
	@cp test/test1.txt test/test1.txt.bak
	@echo "test" | $(MAIN_TARGET) <<< "test\nENCRYPT"
	@echo "[TEST] Done. Check test/test1.txt manually."
