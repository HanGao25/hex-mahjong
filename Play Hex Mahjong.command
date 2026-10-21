#!/bin/zsh
# macOS convenience launcher; pnpm scripts remain cross-platform.
cd -- "${0:A:h}"
export PATH="$PWD/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js 22 is required. Install Node 22, then double-click this file again.'
  read '?Press Return to close.'
  exit 1
fi
node scripts/local-play.mjs
if [[ $? -ne 0 ]]; then
  read '?Could not start. Press Return to close.'
fi
