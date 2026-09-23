#!/bin/bash
set -e
dir="$(cd "$(dirname "$0")" && pwd)"
mkdir -p scripts
cp "$dir/../_shared/run-env-stub.sh" scripts/run-env
chmod +x scripts/run-env
