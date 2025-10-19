#!/usr/bin/env bash
set -euo pipefail

# deploy-all-local.sh
# Deploy the CloudFormation stacks locally in sequence.
# Usage:
#   HOSTED_ZONE_ID=ZXXXXX PROJECT_NAME=angular-node-app ./deploy-all-local.sh
# or edit the variables below.

# Config (override by env)
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-Z05678082RBZES6D13RG3}"
PROJECT_NAME="${PROJECT_NAME:-angular-node-app}"
REGION_GLOBAL="us-east-1"
REGION_REGIONAL="eu-central-1"
CFN_CAPS="CAPABILITY_IAM"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}" || exit 1

echo "Using HostedZoneId=${HOSTED_ZONE_ID}, ProjectName=${PROJECT_NAME}"

echo "\n1) (Optional) Apply IAM policy to GitHubActionRole so Actions can perform ACM/Route53/CloudFormation"
if [[ -x "${SCRIPT_DIR}/apply-github-role-policy.sh" ]]; then
  echo "-> apply-github-role-policy.sh found. Run it as an IAM admin if you need to update the role (not required to deploy locally)."
else
  echo "-> apply-github-role-policy.sh not found in ${SCRIPT_DIR}. Skip or create it before running in CI."
fi

# Helper to run deploy and show final stack status
deploy_stack() {
  local region="$1"; shift
  local template_file="$1"; shift
  local stack_name="$1"; shift
  local params=("$@")

  echo "\n-> Deploying ${stack_name} (${region}) using template ${template_file}"
  aws cloudformation deploy \
    --region "${region}" \
    --template-file "${template_file}" \
    --stack-name "${stack_name}" \
    --parameter-overrides ${params[*]} \
    --capabilities ${CFN_CAPS} \
    --no-fail-on-empty-changeset

  echo "Showing last events for ${stack_name}:"
  aws cloudformation describe-stack-events --region "${region}" --stack-name "${stack_name}" --max-items 20 --output table || true
}

# 1) Certificates Global (us-east-1)
GLOBAL_STACK_NAME="${PROJECT_NAME}-certificates-global"
CERT_GLOBAL_TEMPLATE="certificates-global.yaml"

deploy_stack "${REGION_GLOBAL}" "${CERT_GLOBAL_TEMPLATE}" "${GLOBAL_STACK_NAME}" "HostedZoneId=${HOSTED_ZONE_ID}" "ProjectName=${PROJECT_NAME}"

echo "Attempting to read CertificateArn output for ${GLOBAL_STACK_NAME}..."
GLOBAL_CERT_ARN=$(aws cloudformation describe-stacks --region "${REGION_GLOBAL}" --stack-name "${GLOBAL_STACK_NAME}" --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue' --output text || true)
if [[ -z "${GLOBAL_CERT_ARN}" || "${GLOBAL_CERT_ARN}" == "None" ]]; then
  echo "Warning: CertificateArn not available yet for ${GLOBAL_STACK_NAME}. Check stack events and ACM validation (PENDING_VALIDATION)."
  aws cloudformation describe-stack-events --region "${REGION_GLOBAL}" --stack-name "${GLOBAL_STACK_NAME}" --max-items 200 --output table || true
  echo "If the certificate is PENDING_VALIDATION, ensure the DNS CNAME was created in Route53 or create it manually."
else
  echo "GLOBAL_CERT_ARN=${GLOBAL_CERT_ARN}"
fi

# 2) Certificates Regional (eu-central-1)
REGIONAL_STACK_NAME="${PROJECT_NAME}-certificates-regional"
CERT_REGIONAL_TEMPLATE="certificates-regional.yaml"

deploy_stack "${REGION_REGIONAL}" "${CERT_REGIONAL_TEMPLATE}" "${REGIONAL_STACK_NAME}" "HostedZoneId=${HOSTED_ZONE_ID}" "ProjectName=${PROJECT_NAME}"

REGIONAL_CERT_ARN=$(aws cloudformation describe-stacks --region "${REGION_REGIONAL}" --stack-name "${REGIONAL_STACK_NAME}" --query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue' --output text || true)
if [[ -z "${REGIONAL_CERT_ARN}" || "${REGIONAL_CERT_ARN}" == "None" ]]; then
  echo "Warning: Regional CertificateArn not available yet for ${REGIONAL_STACK_NAME}. Check stack events and ACM validation."
  aws cloudformation describe-stack-events --region "${REGION_REGIONAL}" --stack-name "${REGIONAL_STACK_NAME}" --max-items 200 --output table || true
else
  echo "REGIONAL_CERT_ARN=${REGIONAL_CERT_ARN}"
fi

# 3) Network
NETWORK_STACK_NAME="${PROJECT_NAME}-network"
NETWORK_TEMPLATE="network.yaml"

deploy_stack "${REGION_REGIONAL}" "${NETWORK_TEMPLATE}" "${NETWORK_STACK_NAME}" "ProjectName=${PROJECT_NAME}"

# 4) RDS
RDS_STACK_NAME="${PROJECT_NAME}-rds"
RDS_TEMPLATE="rds-postgress.yaml"

deploy_stack "${REGION_REGIONAL}" "${RDS_TEMPLATE}" "${RDS_STACK_NAME}" "ProjectName=${PROJECT_NAME}"

# 5) Backend (uses regional cert)
BACKEND_STACK_NAME="${PROJECT_NAME}-backend"
BACKEND_TEMPLATE="backend-fargate.yaml"

deploy_stack "${REGION_REGIONAL}" "${BACKEND_TEMPLATE}" "${BACKEND_STACK_NAME}" "ProjectName=${PROJECT_NAME}" "BackendCertificateArn=${REGIONAL_CERT_ARN}"

# 6) Frontend (uses global cert)
FRONTEND_STACK_NAME="${PROJECT_NAME}-frontend"
FRONTEND_TEMPLATE="frontend-s3-cloudfront.yaml"

deploy_stack "${REGION_REGIONAL}" "${FRONTEND_TEMPLATE}" "${FRONTEND_STACK_NAME}" "ProjectName=${PROJECT_NAME}" "FrontendCertificateArn=${GLOBAL_CERT_ARN}"

# 7) DNS
DNS_STACK_NAME="${PROJECT_NAME}-dns"
DNS_TEMPLATE="dns.yaml"

deploy_stack "${REGION_REGIONAL}" "${DNS_TEMPLATE}" "${DNS_STACK_NAME}" "HostedZoneId=${HOSTED_ZONE_ID}" "ProjectName=${PROJECT_NAME}"


echo "\nAll deploy commands submitted. If any stack failed or rolled back, inspect events with:"
echo "  aws cloudformation describe-stack-events --region <region> --stack-name <stack-name> --max-items 200 --output table"

echo "Notes:"
echo " - Certificates in us-east-1 (CloudFront) may require DNS validation; ensure Route53 records are created if CFN doesn't create them automatically."
echo " - If a stack is in ROLLBACK_FAILED, inspect delete events and ensure the role has acm:DeleteCertificate and that the cert is not in use (CloudFront)."

echo "Done."
