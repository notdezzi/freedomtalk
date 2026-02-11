#!/bin/bash

# FreedomTalk - GitHub Setup Script
# This script helps set up the GitHub remote and configures auto-sync

set -e

echo "🚀 FreedomTalk - GitHub Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) not found${NC}"
    echo "Install it from: https://cli.github.com/"
    echo ""
    read -p "Do you want to install GitHub CLI? (y/n): " install_gh
    if [ "$install_gh" = "y" ]; then
        curl -fsSL https://cli.github.com/packages/linux/debian/github-cli-archive_keyring.deb -o /tmp/github-cli.deb
        sudo dpkg -i /tmp/github-cli.deb
        echo -e "${GREEN}✅ GitHub CLI installed${NC}"
    else
        echo "Please install GitHub CLI manually and run this script again"
        exit 1
    fi
fi

# Authenticate with GitHub
echo ""
echo -e "${YELLOW}📝 Step 1: Authenticate with GitHub${NC}"
gh auth login

# Create GitHub repository
echo ""
echo -e "${YELLOW}📁 Step 2: Create GitHub Repository${NC}"
read -p "Enter your GitHub username: " github_username
read -p "Enter repository name (default: freedomtalk): " repo_name
repo_name=${repo_name:-freedomtalk}

echo "Creating repository: $github_username/$repo_name"
gh repo create $repo_name --public --description "Open-source Discord alternative without ID verification" --source "https://gitlab.com/yourusername/discord-clone"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Repository created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create repository${NC}"
    exit 1
fi

# Add remote
echo ""
echo -e "${YELLOW}🔗 Step 3: Add Git Remote${NC}"
git remote add origin https://github.com/$github_username/$repo_name.git

# Set default branch to main
git branch -M main

# Rename master to main if exists
if git show-ref --verify --quiet refs/heads/master 2>/dev/null; then
    git branch -m main
    echo -e "${GREEN}✅ Renamed master to main${NC}"
fi

# Push initial commit
echo ""
echo -e "${YELLOW}📤 Step 4: Push Initial Commit${NC}"
git push -u origin main --set-upstream

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Repository initialized and pushed${NC}"
else
    echo -e "${RED}❌ Failed to push${NC}"
    exit 1
fi

# Configure auto-sync alias
echo ""
echo -e "${YELLOW}🔄 Step 5: Configure Auto-Sync${NC}"
echo "Adding convenience commands..."

# Create git alias for sync
git config alias.sync-all '!git add . && git commit -m "$(git log -1 --pretty=%B)" && git push origin main'
git config alias.task-complete '!f() { local msg="$1"; git add . && git commit -m "feat: $msg"; git push origin main; } && f'
git config alias.push-update '!git add . && git commit -m "chore: Update documentation" && git push origin main'

echo -e "${GREEN}✅ Aliases configured:${NC}"
echo "  - git sync-all    - Commit all changes and push"
echo "  - git task-complete <message>   - Commit and push with message"
echo "  - git push-update - Update docs and push"

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "You can now use:"
echo "  ${YELLOW}git task-complete \"feat: Backend authentication system\"${NC}"
echo "  ${YELLOW}git push-update${NC}"
echo ""
echo "See TASKS.md for complete task breakdown."
