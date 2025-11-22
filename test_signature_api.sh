#!/bin/bash

# Test signature API
echo "Testing signature save API..."

# Login to get token
echo "1. Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin.test.test","password":"test123"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Login might have failed."
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."

# Test saving signature
echo ""
echo "2. Testing signature save..."
SIGNATURE_DATA='{"signature":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}'

SIGNATURE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/users/signature \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$SIGNATURE_DATA" \
  -w "\nHTTP_CODE:%{http_code}")

echo "Signature response:"
echo "$SIGNATURE_RESPONSE"
