#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=flow-testing-scripts/_shared.sh
source "$SCRIPT_DIR/_shared.sh"

export DRIVER=bitcoin
export TEST_RUN_ID=${TEST_RUN_ID:-$(date +%s)}
export TENANT_ID=${TENANT_ID:-tenant:bitcoin-demo-${TEST_RUN_ID}}
export TENANT_NAME=${TENANT_NAME:-Bitcoin Demo Tenant}
export ISSUER_NAME=${ISSUER_NAME:-Bitcoin Issuer}
export VERIFIER_NAME=${VERIFIER_NAME:-Bitcoin Verifier}
export WALLET_NAME=${WALLET_NAME:-Bitcoin Wallet}
export ISSUER_DID=${ISSUER_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1BoatSLRHtKNngkdXEeobR76b53LETtpyT}
export VERIFIER_DID=${VERIFIER_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1CounterpartyXXXXXXXXXXXXXXXUWLpVr}
export WALLET_DID=${WALLET_DID:-did:pkh:bip122:000000000019d6689c085ae165831e93:1BitcoinEaterAddressDontSendf59kuE}
export GOVERNANCE_APPROVER_DID=${GOVERNANCE_APPROVER_DID:-did:key:z6MkbitcoinGovernor111}
export ISSUER_DID_METHOD=${ISSUER_DID_METHOD:-pkh}
export VERIFIER_DID_METHOD=${VERIFIER_DID_METHOD:-pkh}
export WALLET_DID_METHOD=${WALLET_DID_METHOD:-pkh}
export WALLET_TYPE=${WALLET_TYPE:-blockchain}
export SCHEMA_ID=${SCHEMA_ID:-schema:bitcoin-employee-card-${TEST_RUN_ID}}
export SCHEMA_NAME=${SCHEMA_NAME:-Bitcoin Employee Card}
export SCHEMA_FORMAT=${SCHEMA_FORMAT:-json-schema}
export TEMPLATE_ID=${TEMPLATE_ID:-tpl:bitcoin-employee-card-${TEST_RUN_ID}}
export TEMPLATE_TITLE=${TEMPLATE_TITLE:-Bitcoin Employee Card Template}
export TEMPLATE_FORMAT=${TEMPLATE_FORMAT:-vc-jwt}
export TRUST_ID=${TRUST_ID:-trust:bitcoin-issuer-${TEST_RUN_ID}}
export TRUST_REGISTRY_ID=${TRUST_REGISTRY_ID:-registry:bitcoin-main}
export TRUST_ENTITY_ID=${TRUST_ENTITY_ID:-issuer:bitcoin}
export TRUST_NAME=${TRUST_NAME:-Bitcoin Issuer Trust Entry}
export TRUST_FRAMEWORK_ID=${TRUST_FRAMEWORK_ID:-tf:bitcoin}
export ISSUER_GOVERNANCE_ID=${ISSUER_GOVERNANCE_ID:-gov:bitcoin-issuer-approval-${TEST_RUN_ID}}
export VERIFIER_GOVERNANCE_ID=${VERIFIER_GOVERNANCE_ID:-gov:bitcoin-verifier-approval-${TEST_RUN_ID}}
export TRUST_GOVERNANCE_ID=${TRUST_GOVERNANCE_ID:-gov:bitcoin-trust-approval-${TEST_RUN_ID}}
export SCHEMA_GOVERNANCE_ID=${SCHEMA_GOVERNANCE_ID:-gov:bitcoin-schema-approval-${TEST_RUN_ID}}
export TEMPLATE_GOVERNANCE_ID=${TEMPLATE_GOVERNANCE_ID:-gov:bitcoin-template-approval-${TEST_RUN_ID}}
export STATUS_LIST_URI=${STATUS_LIST_URI:-http://localhost:4000/status/bitcoin-main-${TEST_RUN_ID}}
export PRESENTATION_CHALLENGE=${PRESENTATION_CHALLENGE:-challenge-bitcoin-001}
export PRESENTATION_DOMAIN=${PRESENTATION_DOMAIN:-bitcoin.example.org}

FORMATS=("vc-jwt" "vc-ldp" "sd-jwt-vc" "bbs-vc")
PROTOCOLS=("oidc4vci" "oidc4vp" "siopv2" "dcql" "didcomm-v2")
SUPPORTED_FORMATS_JSON='["vc-jwt","vc-ldp","sd-jwt-vc","bbs-vc"]'
SUPPORTED_PROTOCOLS_JSON='["oidc4vci","oidc4vp","siopv2","dcql","didcomm-v2"]'
SUPPORTED_VERIFIER_PROTOCOLS_JSON='["oidc4vp","siopv2","dcql","didcomm-v2"]'

run_driver_flow
