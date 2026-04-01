#!/bin/bash
# Build and Test Script
# Simple script that builds and tests the Anchor program

set -e  # Exit on error

# Setup PATH for anchor command (works in both WSL and PowerShell)
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export PATH="/root/.cargo/bin:$PATH"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Function to find anchor command
find_anchor() {
    # Try common locations
    if command -v anchor &> /dev/null; then
        echo "anchor"
        return 0
    fi
    
    # Try root cargo bin (WSL)
    if [ -f /root/.cargo/bin/anchor ]; then
        echo "/root/.cargo/bin/anchor"
        return 0
    fi
    
    # Try user cargo bin
    if [ -f ~/.cargo/bin/anchor ]; then
        echo ~/.cargo/bin/anchor
        return 0
    fi
    
    # Try local node_modules
    if [ -f node_modules/.bin/anchor ]; then
        echo node_modules/.bin/anchor
        return 0
    fi
    
    # Try npx
    if command -v npx &> /dev/null; then
        echo "npx anchor"
        return 0
    fi
    
    echo ""
    return 1
}

# Find anchor
ANCHOR_CMD=$(find_anchor)
if [ -z "$ANCHOR_CMD" ]; then
    echo "Error: Could not find anchor command"
    echo "Please ensure anchor is installed and in your PATH"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Kill any existing processes on port 8899 (Solana validator)
echo "Cleaning up any existing processes on port 8899..."
if command -v fuser &> /dev/null; then
    fuser -k 8899/tcp 2>/dev/null || true
elif command -v lsof &> /dev/null; then
    lsof -ti:8899 2>/dev/null | xargs kill -9 2>/dev/null || true
fi
pkill -9 solana-validator 2>/dev/null || true
sleep 1

echo "Building Anchor program..."
$ANCHOR_CMD build

echo ""
echo "Running tests..."
$ANCHOR_CMD test
