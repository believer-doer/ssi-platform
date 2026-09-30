#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=flow-testing-scripts/_shared.sh
source "$SCRIPT_DIR/_shared.sh"

export DRIVER=ethereum
export TEST_RUN_ID=${TEST_RUN_ID:-$(date +%s)}
export TENANT_ID=${TENANT_ID:-tenant:ethereum-demo-${TEST_RUN_ID}}
export TENANT_NAME=${TENANT_NAME:-Ethereum Demo Tenant}
export ISSUER_NAME=${ISSUER_NAME:-Ethereum Issuer}
export VERIFIER_NAME=${VERIFIER_NAME:-Ethereum Verifier}
export WALLET_NAME=${WALLET_NAME:-Ethereum Wallet}
export ISSUER_DID=${ISSUER_DID:-did:ethr:0x1111111111111111111111111111111111111111}
export VERIFIER_DID=${VERIFIER_DID:-did:ethr:0x2222222222222222222222222222222222222222}
export WALLET_DID=${WALLET_DID:-did:pkh:eip155:31337:0x3333333333333333333333333333333333333333}
export GOVERNANCE_APPROVER_DID=${GOVERNANCE_APPROVER_DID:-did:ethr:0x4444444444444444444444444444444444444444}
export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-ethr}
export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-ethr}
export WALLET_DID_METHOD=${WALLET_DID_METHOD:-pkh}
export WALLET_TYPE=${WALLET_TYPE:-blockchain}
export SCHEMA_ID=${SCHEMA_ID:-schema:ethereum-employee-card-${TEST_RUN_ID}}
export SCHEMA_NAME=${SCHEMA_NAME:-Ethereum Employee Card}
export SCHEMA_FORMAT=${SCHEMA_FORMAT:-json-schema}
export TEMPLATE_ID=${TEMPLATE_ID:-tpl:ethereum-employee-card-${TEST_RUN_ID}}
export TEMPLATE_TITLE=${TEMPLATE_TITLE:-Ethereum Employee Card Template}
export TEMPLATE_FORMAT=${TEMPLATE_FORMAT:-vc-jwt}
export TRUST_ID=${TRUST_ID:-trust:ethereum-issuer-${TEST_RUN_ID}}
export TRUST_REGISTRY_ID=${TRUST_REGISTRY_ID:-registry:ethereum-main}
export TRUST_ENTITY_ID=${TRUST_ENTITY_ID:-issuer:ethereum}
export TRUST_NAME=${TRUST_NAME:-Ethereum Issuer Trust Entry}
export TRUST_FRAMEWORK_ID=${TRUST_FRAMEWORK_ID:-tf:ethereum}
export ISSUER_GOVERNANCE_ID=${ISSUER_GOVERNANCE_ID:-gov:ethereum-issuer-approval-${TEST_RUN_ID}}
export VERIFIER_GOVERNANCE_ID=${VERIFIER_GOVERNANCE_ID:-gov:ethereum-verifier-approval-${TEST_RUN_ID}}
export TRUST_GOVERNANCE_ID=${TRUST_GOVERNANCE_ID:-gov:ethereum-trust-approval-${TEST_RUN_ID}}
export SCHEMA_GOVERNANCE_ID=${SCHEMA_GOVERNANCE_ID:-gov:ethereum-schema-approval-${TEST_RUN_ID}}
export TEMPLATE_GOVERNANCE_ID=${TEMPLATE_GOVERNANCE_ID:-gov:ethereum-template-approval-${TEST_RUN_ID}}
export STATUS_LIST_URI=${STATUS_LIST_URI:-http://localhost:4000/status/ethereum-main-${TEST_RUN_ID}}
export PRESENTATION_CHALLENGE=${PRESENTATION_CHALLENGE:-challenge-ethereum-001}
export PRESENTATION_DOMAIN=${PRESENTATION_DOMAIN:-ethereum.example.org}

FORMATS=("vc-jwt" "vc-ldp" "sd-jwt-vc" "bbs-vc")
PROTOCOLS=("oidc4vci" "oidc4vp" "siopv2" "dcql" "didcomm-v2")
SUPPORTED_FORMATS_JSON='["vc-jwt","vc-ldp","sd-jwt-vc","bbs-vc"]'
SUPPORTED_PROTOCOLS_JSON='["oidc4vci","oidc4vp","siopv2","dcql","didcomm-v2"]'
SUPPORTED_VERIFIER_PROTOCOLS_JSON='["oidc4vp","siopv2","dcql","didcomm-v2"]'

run_driver_flow
