#!/usr/bin/env bash
set -euo pipefail

# Apply every JSON IAM policy in this directory to the supplied role (default GitHubActionRole).
# Usage:
#   ./apply-all-policies.sh [role-name]

ROLE_NAME="${1:-GitHubActionRole}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
shopt -s nullglob
POLICY_FILES=("${SCRIPT_DIR}"/*.json)
shopt -u nullglob

if (( ${#POLICY_FILES[@]} == 0 )); then
  echo "No policy JSON files found in ${SCRIPT_DIR}" >&2
  exit 1
fi

for policy_file in "${POLICY_FILES[@]}"; do
  base_name="$(basename "${policy_file}" .json)"
  policy_name="$(echo "${base_name}" | tr -c 'A-Za-z0-9+=,.@_-' '_')"
  echo "Applying ${policy_name} from ${policy_file} to role ${ROLE_NAME}"
  aws iam put-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "${policy_name}" \
    --policy-document "file://${policy_file}"

  aws iam get-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "${policy_name}" \
    --output json > /dev/null
done

echo "All policies applied to role ${ROLE_NAME}."
