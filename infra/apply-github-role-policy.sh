#!/usr/bin/env bash
set -euo pipefail

# Script to apply inline IAM policy to the GitHubActionRole
# Usage: ./apply-github-role-policy.sh [role-name]

ROLE_NAME="${1:-GitHubActionRole}"
POLICY_NAME="CFN-ACM-Route53-Policy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Policy file is located next to this script
POLICY_FILE="${SCRIPT_DIR}/acm-cfn-route53-policy.json"

if [[ ! -f "${POLICY_FILE}" ]]; then
  echo "Policy file not found: ${POLICY_FILE}" >&2
  echo "Expected the policy file to be next to this script. Path: ${POLICY_FILE}" >&2
  exit 1
fi

echo "Applying inline policy ${POLICY_NAME} to role ${ROLE_NAME} using policy file: ${POLICY_FILE}"
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "${POLICY_NAME}" \
  --policy-document file://${POLICY_FILE}

echo "Done. Verifying..."
aws iam get-role-policy --role-name "${ROLE_NAME}" --policy-name "${POLICY_NAME}" --output json

echo "Policy applied. Re-run your GitHub Action workflow to test."
