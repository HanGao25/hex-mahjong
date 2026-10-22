#!/bin/zsh
set -eu
cd "${0:A:h}"

# Reuse this Mac's portable tooling when it is still available.
if [[ -x /tmp/node-v22.23.3-darwin-x64/bin/pnpm ]]; then
  export PATH="/tmp/node-v22.23.3-darwin-x64/bin:$PATH"
  export COREPACK_HOME="/tmp/hex-corepack"
fi
if ! command -v pnpm >/dev/null 2>&1; then
  print -u2 'pnpm was not found. Install Node.js 22 and pnpm 10.18.3, then retry.'
  exit 1
fi

pnpm release "$@"
