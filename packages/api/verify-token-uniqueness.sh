#!/bin/bash

# Script to verify that refresh tokens are unique by decoding and comparing their jti values

API_URL="http://localhost:3001"

echo "=== Token Uniqueness Verification ==="
echo ""

# Register test user
echo "1. Registering test user..."
curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"jtitest@example.com","username":"jtitest","password":"SecureTest123!"}' > /dev/null

# Login
echo "2. Logging in..."
LOGIN=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jtitest@example.com","password":"SecureTest123!"}')

TOKEN1=$(echo "$LOGIN" | jq -r '.data.refreshToken')

# Decode first token
echo ""
echo "3. First refresh token (from login):"
PAYLOAD1=$(echo "$TOKEN1" | cut -d'.' -f2)
# Add padding if needed for base64
PAYLOAD1_PADDED=$(echo "$PAYLOAD1" | awk '{while (length($0) % 4 != 0) $0 = $0 "="; print}')
echo "$PAYLOAD1_PADDED" | base64 -d 2>/dev/null | jq '.'

# Wait to ensure different timestamp
sleep 1

# Refresh to get new token
echo ""
echo "4. Calling refresh endpoint..."
REFRESH=$(curl -s -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$TOKEN1\"}")

TOKEN2=$(echo "$REFRESH" | jq -r '.data.refreshToken')

# Decode second token
echo ""
echo "5. Second refresh token (from refresh):"
PAYLOAD2=$(echo "$TOKEN2" | cut -d'.' -f2)
PAYLOAD2_PADDED=$(echo "$PAYLOAD2" | awk '{while (length($0) % 4 != 0) $0 = $0 "="; print}')
echo "$PAYLOAD2_PADDED" | base64 -d 2>/dev/null | jq '.'

# Extract and compare jti values
echo ""
echo "6. Comparison:"
JTI1=$(echo "$PAYLOAD1_PADDED" | base64 -d 2>/dev/null | jq -r '.jti')
JTI2=$(echo "$PAYLOAD2_PADDED" | base64 -d 2>/dev/null | jq -r '.jti')

echo "   First token jti:  $JTI1"
echo "   Second token jti: $JTI2"

if [ "$JTI1" = "$JTI2" ]; then
  echo ""
  echo "   ❌ FAIL: JTI values are identical!"
  echo "   This means tokens are not unique."
else
  echo ""
  echo "   ✅ PASS: JTI values are different!"
  echo "   Token rotation is working correctly."
fi

# Cleanup
echo ""
echo "7. Cleaning up..."
psql postgresql://postgres:postgres@localhost:5432/freedomtalk -c \
  "DELETE FROM users WHERE email = 'jtitest@example.com';" 2>/dev/null > /dev/null

echo ""
echo "=== Verification Complete ==="

