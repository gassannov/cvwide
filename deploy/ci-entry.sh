#!/usr/bin/env bash
# Forced-command entry point for the cvwide-only CI SSH identity.
set -euo pipefail
[[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^cvwide-deploy\ ([0-9a-f]{40})$ ]] || exit 2
release=${BASH_REMATCH[1]}
archive="/tmp/cvwide-$release.tar.gz"
umask 077
cat > "$archive"
sudo /usr/local/libexec/cvwide-activate "$release"
