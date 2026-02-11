#!/bin/bash
# Prepares a clean copy of meeting-reminder-bot for pushing to a new GitHub repo.
# Usage: ./prepare-new-github-repo.sh [NEW_REPO_DIR] [GITHUB_REPO_URL]
# Example: ./prepare-new-github-repo.sh ../meeting-reminder-bot-repo https://github.com/mmsquare/meeting-reminder-bot.git
# If URL is omitted, only the copy and git init are done; add remote manually.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-${SCRIPT_DIR}/../meeting-reminder-bot-repo}"
GITHUB_URL="${2:-}"

echo "Source: ${SCRIPT_DIR}"
echo "Destination: ${DEST}"
rm -rf "${DEST}"
mkdir -p "${DEST}"

rsync -a --exclude='node_modules' --exclude='dist' --exclude='.env' --exclude='.env.local' \
  --exclude='*.db' --exclude='*.log' --exclude='.DS_Store' --exclude='.git' \
  "${SCRIPT_DIR}/" "${DEST}/"

cd "${DEST}"
git init
git branch -M main

if [ -n "${GITHUB_URL}" ]; then
  git remote add origin "${GITHUB_URL}"
  echo "Remote 'origin' set to ${GITHUB_URL}"
fi

echo ""
echo "Done. Next steps:"
echo "  1. On GitHub: New repository → name it (e.g. meeting-reminder-bot) → Create (no README/license)."
echo "  2. Copy the repo URL (e.g. https://github.com/YOUR_USER/meeting-reminder-bot.git)."
if [ -z "${GITHUB_URL}" ]; then
  echo "  3. Run: cd ${DEST} && git remote add origin <YOUR_REPO_URL>"
fi
echo "  4. Run: cd ${DEST} && git add . && git commit -m 'Initial commit: meeting reminder bot' && git push -u origin main"
echo ""
