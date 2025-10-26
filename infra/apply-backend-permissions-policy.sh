#!/usr/bin/env bash
set -euo pipefail

# Back-compat wrapper: delegates to apply-all-policies.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/apply-all-policies.sh" "${@}"
