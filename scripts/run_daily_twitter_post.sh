#!/bin/zsh
set -euo pipefail

export PATH="/Users/gulaltinkalp/.nvm/versions/node/v22.22.0/bin:/usr/bin:/bin:/usr/sbin:/sbin"
NPM_BIN="/Users/gulaltinkalp/.nvm/versions/node/v22.22.0/bin/npm"

cd /Users/gulaltinkalp/Prompts34/prompts34-social
"$NPM_BIN" run publish:scheduled:twitter
