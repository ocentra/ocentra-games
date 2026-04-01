#!/bin/bash
# Script to run a single test file and generate a report
# Usage: ./test-single.sh tests/common/governance/pause-program.test.ts

if [ -z "$1" ]; then
  echo "Usage: ./test-single.sh <test-file-path>"
  echo "Example: ./test-single.sh tests/common/governance/pause-program.test.ts"
  exit 1
fi

TEST_FILE="$1"

if [ ! -f "$TEST_FILE" ]; then
  echo "Error: Test file not found: $TEST_FILE"
  exit 1
fi

# Get the test ID from the file (e.g., "pause-program" from "pause-program.test.ts")
# This matches the test ID in the test class constructor
TEST_ID=$(basename "$TEST_FILE" .test.ts)

echo "Running single test: $TEST_FILE"
echo "Test ID: $TEST_ID"

# Use anchor test which handles build, deploy, and environment setup
# Filter by test ID using TEST_ID environment variable (supported by test-factory.ts)
# The test ID matches the filename (e.g., "pause-program" in pause-program.test.ts)
TEST_ID="$TEST_ID" anchor test

