#!/bin/bash

# Comprehensive End-to-End Authentication Testing Script
# Tests all authentication and user management endpoints

set -e  # Exit on error

API_URL="http://localhost:3001"
TEST_EMAIL="e2etest@example.com"
TEST_USERNAME="e2etest"
TEST_PASSWORD="SecureTest123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

# Cleanup function
cleanup_test_user() {
    echo -e "\n${YELLOW}Cleaning up test user...${NC}"
    psql postgresql://postgres:postgres@localhost:5432/freedomtalk -c \
        "DELETE FROM users WHERE email = '$TEST_EMAIL';" 2>/dev/null || true
}

# Test 1: User Registration
test_registration() {
    print_test "1. User Registration Flow"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"username\": \"$TEST_USERNAME\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .
    
    if [ "$HTTP_CODE" = "201" ]; then
        print_success "Registration returned 201 Created"
    else
        print_error "Expected 201, got $HTTP_CODE"
        return 1
    fi
    
    # Extract userId
    USER_ID=$(echo "$BODY" | jq -r '.data.userId')
    echo "User ID: $USER_ID"
    
    # Verify database records
    echo -e "\nVerifying database records..."
    DB_USER=$(psql postgresql://postgres:postgres@localhost:5432/freedomtalk -t -c \
        "SELECT id, email, username FROM users WHERE email = '$TEST_EMAIL';")
    echo "User record: $DB_USER"
    
    DB_PROFILE=$(psql postgresql://postgres:postgres@localhost:5432/freedomtalk -t -c \
        "SELECT id, user_id, display_name FROM user_profiles WHERE user_id = '$USER_ID';")
    echo "Profile record: $DB_PROFILE"
    
    if [ -n "$DB_USER" ] && [ -n "$DB_PROFILE" ]; then
        print_success "Both user and profile records created"
    else
        print_error "Database records not found"
        return 1
    fi
}

# Test 2: Login
test_login() {
    print_test "2. Authentication Flow (Login)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Login returned 200 OK"
    else
        print_error "Expected 200, got $HTTP_CODE"
        return 1
    fi
    
    # Extract tokens
    ACCESS_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken')
    REFRESH_TOKEN=$(echo "$BODY" | jq -r '.data.refreshToken')
    
    echo "Access Token: ${ACCESS_TOKEN:0:50}..."
    echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
    
    # Export for other tests
    export ACCESS_TOKEN
    export REFRESH_TOKEN
    
    if [ -n "$ACCESS_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
        print_success "Tokens received"
    else
        print_error "Tokens not found in response"
        return 1
    fi
}

# Test 3: Get Current User Profile
test_get_profile() {
    print_test "3. Authenticated User Profile Retrieval"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/users/@me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Profile retrieval returned 200 OK"
    else
        print_error "Expected 200, got $HTTP_CODE"
        return 1
    fi

    DISPLAY_NAME=$(echo "$BODY" | jq -r '.data.profile.displayName')
    if [ "$DISPLAY_NAME" = "$TEST_USERNAME" ]; then
        print_success "Profile displayName matches username"
    else
        print_error "Profile displayName mismatch"
    fi
}

# Test 4: Token Refresh
test_token_refresh() {
    print_test "4. Token Refresh Flow"

    echo "Old Refresh Token: ${REFRESH_TOKEN:0:50}..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{
            \"refresh_token\": \"$REFRESH_TOKEN\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Token refresh returned 200 OK"
    else
        print_error "Expected 200, got $HTTP_CODE"
        return 1
    fi

    NEW_ACCESS_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken')
    NEW_REFRESH_TOKEN=$(echo "$BODY" | jq -r '.data.refreshToken')

    echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
    echo "New Refresh Token: ${NEW_REFRESH_TOKEN:0:50}..."

    # Verify old refresh token is invalidated
    echo -e "\nTesting old refresh token (should fail)..."
    OLD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{
            \"refresh_token\": \"$REFRESH_TOKEN\"
        }")

    OLD_HTTP_CODE=$(echo "$OLD_RESPONSE" | tail -n1)

    if [ "$OLD_HTTP_CODE" = "401" ]; then
        print_success "Old refresh token invalidated (token rotation working)"
    else
        print_error "Old refresh token still valid (token rotation not working)"
    fi

    # Update tokens for next tests
    export ACCESS_TOKEN=$NEW_ACCESS_TOKEN
    export REFRESH_TOKEN=$NEW_REFRESH_TOKEN
}

# Test 5: Profile Update
test_profile_update() {
    print_test "5. Profile Update Flow"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/api/v1/users/@me" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "display_name": "E2E Test User",
            "bio": "This is an end-to-end test user",
            "pronouns": "they/them",
            "custom_status": "Testing the API"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Profile update returned 200 OK"
    else
        print_error "Expected 200, got $HTTP_CODE"
        return 1
    fi

    # Verify database update
    echo -e "\nVerifying database update..."
    DB_PROFILE=$(psql postgresql://postgres:postgres@localhost:5432/freedomtalk -t -c \
        "SELECT display_name, bio, pronouns FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = '$TEST_EMAIL');")
    echo "Updated profile: $DB_PROFILE"

    if echo "$DB_PROFILE" | grep -q "E2E Test User"; then
        print_success "Profile updates persisted in database"
    else
        print_error "Profile updates not found in database"
    fi
}

# Test 6: Logout
test_logout() {
    print_test "6. Logout Flow"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/logout" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY" | jq .

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Logout returned 200 OK"
    else
        print_error "Expected 200, got $HTTP_CODE"
        return 1
    fi

    # Verify token is invalidated
    echo -e "\nTesting invalidated token (should fail)..."
    TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/users/@me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    TEST_HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)

    if [ "$TEST_HTTP_CODE" = "401" ]; then
        print_success "Access token invalidated after logout"
    else
        print_error "Access token still valid after logout"
    fi
}

# Test 7: OAuth2 URLs
test_oauth2() {
    print_test "7. OAuth2 Flow (Authorization URLs)"

    # Test Google OAuth2
    echo -e "\nTesting Google OAuth2 authorization URL..."
    GOOGLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/auth/google/authorize")
    GOOGLE_HTTP_CODE=$(echo "$GOOGLE_RESPONSE" | tail -n1)
    GOOGLE_BODY=$(echo "$GOOGLE_RESPONSE" | sed '$d')

    echo "HTTP Status: $GOOGLE_HTTP_CODE"
    echo "Response: $GOOGLE_BODY" | jq .

    if [ "$GOOGLE_HTTP_CODE" = "200" ]; then
        print_success "Google OAuth2 URL generation returned 200 OK"
        GOOGLE_URL=$(echo "$GOOGLE_BODY" | jq -r '.data.authorizationUrl')
        if [[ "$GOOGLE_URL" == https://accounts.google.com* ]]; then
            print_success "Google OAuth2 URL properly formatted"
        else
            print_error "Google OAuth2 URL format incorrect"
        fi
    else
        print_error "Expected 200, got $GOOGLE_HTTP_CODE"
    fi

    # Test GitHub OAuth2
    echo -e "\nTesting GitHub OAuth2 authorization URL..."
    GITHUB_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/auth/github/authorize")
    GITHUB_HTTP_CODE=$(echo "$GITHUB_RESPONSE" | tail -n1)
    GITHUB_BODY=$(echo "$GITHUB_RESPONSE" | sed '$d')

    echo "HTTP Status: $GITHUB_HTTP_CODE"
    echo "Response: $GITHUB_BODY" | jq .

    if [ "$GITHUB_HTTP_CODE" = "200" ]; then
        print_success "GitHub OAuth2 URL generation returned 200 OK"
        GITHUB_URL=$(echo "$GITHUB_BODY" | jq -r '.data.authorizationUrl')
        if [[ "$GITHUB_URL" == https://github.com* ]]; then
            print_success "GitHub OAuth2 URL properly formatted"
        else
            print_error "GitHub OAuth2 URL format incorrect"
        fi
    else
        print_error "Expected 200, got $GITHUB_HTTP_CODE"
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Comprehensive End-to-End Authentication Testing          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    # Cleanup before starting
    cleanup_test_user

    # Run all tests
    test_registration || true
    test_login || true
    test_get_profile || true
    test_token_refresh || true
    test_profile_update || true
    test_logout || true
    test_oauth2 || true

    # Cleanup after tests
    cleanup_test_user

    # Print summary
    echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Test Summary                                              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run main
main

