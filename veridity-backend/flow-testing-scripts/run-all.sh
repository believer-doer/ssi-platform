#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

for script in   "$SCRIPT_DIR/internal-off-chain-flows.sh"   "$SCRIPT_DIR/ethereum-hybrid-flows.sh"   "$SCRIPT_DIR/bitcoin-hybrid-flows.sh"
do
  echo
  echo "############################################"
  echo "Running $(basename "$script")"
  echo "############################################"
  "$script"
done

for driver in internal ethereum bitcoin
do
  echo
  echo "############################################"
  echo "Running public-protocol-smoke.sh for $driver"
  echo "############################################"
  DRIVER="$driver" "$SCRIPT_DIR/public-protocol-smoke.sh"
done
