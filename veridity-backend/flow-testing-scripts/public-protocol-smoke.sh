#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=flow-testing-scripts/_shared.sh
source "$SCRIPT_DIR/_shared.sh"

export DRIVER=${DRIVER:-internal}
export TEST_RUN_ID=${TEST_RUN_ID:-$(date +%s)}
export TENANT_ID=${TENANT_ID:-tenant:${DRIVER}-public-smoke-${TEST_RUN_ID}}
export TENANT_NAME=${TENANT_NAME:-${DRIVER^} Public Smoke Tenant}
export ISSUER_NAME=${ISSUER_NAME:-${DRIVER^} Public Smoke Issuer}
export VERIFIER_NAME=${VERIFIER_NAME:-${DRIVER^} Public Smoke Verifier}
export WALLET_NAME=${WALLET_NAME:-${DRIVER^} Public Smoke Wallet}
export GOVERNANCE_APPROVER_DID=${GOVERNANCE_APPROVER_DID:-did:key:z6MksmokeGovernor111}

case "$DRIVER" in
  internal)
    export ISSUER_DID=${ISSUER_DID:-did:key:z6MksmokeInternalIssuer111}
    export VERIFIER_DID=${VERIFIER_DID:-did:key:z6MksmokeInternalVerifier111}
    export WALLET_DID=${WALLET_DID:-did:key:z6MksmokeInternalWallet111}
    export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-key}
    export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-key}
    export WALLET_DID_METHOD=${WALLET_DID_METHOD:-key}
    export WALLET_TYPE=${WALLET_TYPE:-internal}
    ;;
  ethereum)
    export ISSUER_DID=${ISSUER_DID:-did:ethr:0x1111111111111111111111111111111111111111}
    export VERIFIER_DID=${VERIFIER_DID:-did:ethr:0x2222222222222222222222222222222222222222}
    export WALLET_DID=${WALLET_DID:-did:pkh:eip155:31337:0x3333333333333333333333333333333333333333}
    export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-ethr}
    export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-ethr}
    export WALLET_DID_METHOD=${WALLET_DID_METHOD:-pkh}
    export WALLET_TYPE=${WALLET_TYPE:-blockchain}
    ;;
  bitcoin)
    export ISSUER_DID=${ISSUER_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1BoatSLRHtKNngkdXEeobR76b53LETtpyT}
    export VERIFIER_DID=${VERIFIER_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1CounterpartyXXXXXXXXXXXXXXXUWLpVr}
    export WALLET_DID=${WALLET_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1BitcoinEaterAddressDontSendf59kuE}
    export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-pkh}
    export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-pkh}
    export WALLET_DID_METHOD=${WALLET_DID_METHOD:-pkh}
    export WALLET_TYPE=${WALLET_TYPE:-blockchain}
    ;;
  *)
    echo "Unsupported DRIVER for public smoke: $DRIVER" >&2
    exit 1
    ;;
esac

export SCHEMA_ID=${SCHEMA_ID:-schema:${DRIVER}-public-smoke-${TEST_RUN_ID}}
export SCHEMA_NAME=${SCHEMA_NAME:-${DRIVER^} Public Smoke Schema}
export SCHEMA_FORMAT=${SCHEMA_FORMAT:-json-schema}
export TEMPLATE_ID=${TEMPLATE_ID:-tpl:${DRIVER}-public-smoke-${TEST_RUN_ID}}
export TEMPLATE_TITLE=${TEMPLATE_TITLE:-${DRIVER^} Public Smoke Template}
export TEMPLATE_FORMAT=${TEMPLATE_FORMAT:-vc-jwt}
export TRUST_ID=${TRUST_ID:-trust:${DRIVER}-public-smoke-${TEST_RUN_ID}}
export TRUST_REGISTRY_ID=${TRUST_REGISTRY_ID:-registry:${DRIVER}-public-smoke}
export TRUST_ENTITY_ID=${TRUST_ENTITY_ID:-issuer:${DRIVER}-public-smoke}
export TRUST_NAME=${TRUST_NAME:-${DRIVER^} Public Smoke Trust}
export TRUST_FRAMEWORK_ID=${TRUST_FRAMEWORK_ID:-tf:${DRIVER}-public-smoke}
export ISSUER_GOVERNANCE_ID=${ISSUER_GOVERNANCE_ID:-gov:${DRIVER}-public-smoke-issuer-${TEST_RUN_ID}}
export VERIFIER_GOVERNANCE_ID=${VERIFIER_GOVERNANCE_ID:-gov:${DRIVER}-public-smoke-verifier-${TEST_RUN_ID}}
export TRUST_GOVERNANCE_ID=${TRUST_GOVERNANCE_ID:-gov:${DRIVER}-public-smoke-trust-${TEST_RUN_ID}}
export SCHEMA_GOVERNANCE_ID=${SCHEMA_GOVERNANCE_ID:-gov:${DRIVER}-public-smoke-schema-${TEST_RUN_ID}}
export TEMPLATE_GOVERNANCE_ID=${TEMPLATE_GOVERNANCE_ID:-gov:${DRIVER}-public-smoke-template-${TEST_RUN_ID}}
export STATUS_LIST_URI=${STATUS_LIST_URI:-http://localhost:4000/status/${DRIVER}-public-smoke-${TEST_RUN_ID}}
export PRESENTATION_CHALLENGE=${PRESENTATION_CHALLENGE:-challenge-${DRIVER}-public-smoke}
export PRESENTATION_DOMAIN=${PRESENTATION_DOMAIN:-${DRIVER}.public-smoke.example.org}

SUPPORTED_FORMATS_JSON='["vc-jwt","sd-jwt-vc"]'
SUPPORTED_PROTOCOLS_JSON='["oidc4vci","oidc4vp","siopv2"]'
SUPPORTED_VERIFIER_PROTOCOLS_JSON='["oidc4vp","siopv2"]'
FORMATS=("vc-jwt" "sd-jwt-vc")
PROTOCOLS=("oidc4vci" "oidc4vp")

ensure_dependencies
load_local_env
ensure_output_dir
refresh_tenant_header
trap stop_bitcoin_auto_miner EXIT
ensure_bitcoin_wallet_funded
start_bitcoin_auto_miner

log_step "Seeding public-smoke resources"
print_json_summary "tenant" "$(tenant_create)"
print_json_summary "issuer" "$(issuer_create)"
print_json_summary "verifier" "$(verifier_create)"
print_json_summary "wallet" "$(wallet_create)"
print_json_summary "trust" "$(trust_create)"
print_json_summary "schema" "$(schema_create)"
print_json_summary "template" "$(template_create)"
print_json_summary "issuer governance proposal" "$(governance_create_for "$ISSUER_GOVERNANCE_ID" "$ISSUER_DID" "admin" "issuer" "$ISSUER_DID")"
print_json_summary "issuer governance approval" "$(governance_approve_for "$ISSUER_GOVERNANCE_ID")"
print_json_summary "verifier governance proposal" "$(governance_create_for "$VERIFIER_GOVERNANCE_ID" "$VERIFIER_DID" "admin" "verifier" "$VERIFIER_DID")"
print_json_summary "verifier governance approval" "$(governance_approve_for "$VERIFIER_GOVERNANCE_ID")"
print_json_summary "trust governance proposal" "$(governance_create_for "$TRUST_GOVERNANCE_ID" "$ISSUER_DID" "admin" "trust-registry" "$TRUST_ID")"
print_json_summary "trust governance approval" "$(governance_approve_for "$TRUST_GOVERNANCE_ID")"
print_json_summary "schema governance proposal" "$(governance_create_for "$SCHEMA_GOVERNANCE_ID" "$ISSUER_DID" "admin" "schema" "$SCHEMA_ID")"
print_json_summary "schema governance approval" "$(governance_approve_for "$SCHEMA_GOVERNANCE_ID")"
print_json_summary "template governance proposal" "$(governance_create_for "$TEMPLATE_GOVERNANCE_ID" "$ISSUER_DID" "admin" "template" "$TEMPLATE_ID")"
print_json_summary "template governance approval" "$(governance_approve_for "$TEMPLATE_GOVERNANCE_ID")"
print_json_summary "activated issuer" "$(issuer_activate)"
print_json_summary "activated verifier" "$(verifier_activate)"
print_json_summary "activated trust" "$(trust_activate)"
print_json_summary "activated schema" "$(schema_activate)"
print_json_summary "activated template" "$(template_activate)"
wait_for_confirmed_bitcoin_trust_anchor

run_public_protocol_smoke

echo

echo "Public protocol smoke completed for driver '$DRIVER'."
