#!/bin/zsh
set -e

sudo chown -R $(whoami):$(whoami) node_modules 2>/dev/null || true

# Silence direnv output.
# In direnv 2.36+, DIRENV_LOG_FORMAT env var is ignored unless direnv.toml exists.
# See: https://github.com/direnv/direnv/issues/1418
mkdir -p ~/.config/direnv
cat > ~/.config/direnv/direnv.toml <<'EOF'
[global]
log_format = ""
hide_env_diff = true
EOF

# Install deps if package.json exists.
if [ -f package.json ]; then
  if [ -f bun.lock ]; then
    bun install --frozen-lockfile --ignore-scripts
  else
    bun install --ignore-scripts
  fi
fi

# Chromium needs system libraries the base image does not ship. install-browser
# below fetches only the browser, so without these it downloads a binary that
# cannot start (it fails on libglib). playwright is pulled in transiently just
# to enumerate the packages — the project itself does not depend on it.
sudo env "PATH=$PATH" bunx playwright install-deps chromium

# The browser build is pinned by the Playwright MCP server, so let the MCP
# download the revision it will actually launch. The cache lives inside the
# container, so a rebuild re-downloads ~115 MB.
bunx @playwright/mcp install-browser chrome-for-testing || \
  echo "postCreate: browser download failed; run 'bunx @playwright/mcp install-browser chrome-for-testing' by hand"
