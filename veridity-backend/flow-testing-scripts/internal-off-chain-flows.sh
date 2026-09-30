#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=flow-testing-scripts/_shared.sh
source "$SCRIPT_DIR/_shared.sh"

export DRIVER=internal
export TEST_RUN_ID=${TEST_RUN_ID:-$(date +%s)}
export TENANT_ID=${TENANT_ID:-tenant:internal-demo-${TEST_RUN_ID}}
export TENANT_NAME=${TENANT_NAME:-Internal Demo Tenant}
export ISSUER_NAME=${ISSUER_NAME:-Internal Issuer}
export VERIFIER_NAME=${VERIFIER_NAME:-Internal Verifier}
export WALLET_NAME=${WALLET_NAME:-Internal Wallet}
export ISSUER_DID=${ISSUER_DID:-did:key:z6MkinternalIssuer111}
export VERIFIER_DID=${VERIFIER_DID:-did:key:z6MkinternalVerifier111}
export WALLET_DID=${WALLET_DID:-did:key:z6MkinternalWallet111}
export GOVERNANCE_APPROVER_DID=${GOVERNANCE_APPROVER_DID:-did:key:z6MkinternalGovernor111}
export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-key}
export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-key}
export WALLET_DID_METHOD=${WALLET_DID_METHOD:-key}
export WALLET_TYPE=${WALLET_TYPE:-internal}
export SCHEMA_ID=${SCHEMA_ID:-schema:internal-employee-card-${TEST_RUN_ID}}
export SCHEMA_NAME=${SCHEMA_NAME:-Internal Employee Card}
export SCHEMA_FORMAT=${SCHEMA_FORMAT:-json-schema}
export TEMPLATE_ID=${TEMPLATE_ID:-tpl:internal-employee-card-${TEST_RUN_ID}}
export TEMPLATE_TITLE=${TEMPLATE_TITLE:-Internal Employee Card Template}
export TEMPLATE_FORMAT=${TEMPLATE_FORMAT:-vc-jwt}
export TRUST_ID=${TRUST_ID:-trust:internal-issuer-${TEST_RUN_ID}}
export TRUST_REGISTRY_ID=${TRUST_REGISTRY_ID:-registry:internal-main}
export TRUST_ENTITY_ID=${TRUST_ENTITY_ID:-issuer:internal}
export TRUST_NAME=${TRUST_NAME:-Internal Issuer Trust Entry}
export TRUST_FRAMEWORK_ID=${TRUST_FRAMEWORK_ID:-tf:internal}
export ISSUER_GOVERNANCE_ID=${ISSUER_GOVERNANCE_ID:-gov:internal-issuer-approval-${TEST_RUN_ID}}
export VERIFIER_GOVERNANCE_ID=${VERIFIER_GOVERNANCE_ID:-gov:internal-verifier-approval-${TEST_RUN_ID}}
export TRUST_GOVERNANCE_ID=${TRUST_GOVERNANCE_ID:-gov:internal-trust-approval-${TEST_RUN_ID}}
export SCHEMA_GOVERNANCE_ID=${SCHEMA_GOVERNANCE_ID:-gov:internal-schema-approval-${TEST_RUN_ID}}
export TEMPLATE_GOVERNANCE_ID=${TEMPLATE_GOVERNANCE_ID:-gov:internal-template-approval-${TEST_RUN_ID}}
export STATUS_LIST_URI=${STATUS_LIST_URI:-http://localhost:4000/status/internal-main-${TEST_RUN_ID}}
export PRESENTATION_CHALLENGE=${PRESENTATION_CHALLENGE:-challenge-internal-001}
export PRESENTATION_DOMAIN=${PRESENTATION_DOMAIN:-internal.example.org}

FORMATS=("vc-jwt" "vc-ldp" "sd-jwt-vc" "bbs-vc")
PROTOCOLS=("oidc4vci" "oidc4vp" "siopv2" "dcql" "didcomm-v2")
SUPPORTED_FORMATS_JSON='["vc-jwt","vc-ldp","sd-jwt-vc","bbs-vc"]'
SUPPORTED_PROTOCOLS_JSON='["oidc4vci","oidc4vp","siopv2","dcql","didcomm-v2"]'
SUPPORTED_VERIFIER_PROTOCOLS_JSON='["oidc4vp","siopv2","dcql","didcomm-v2"]'

run_driver_flow
