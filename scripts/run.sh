#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "puebe binary dir:" "$DIR"

pushd "$DIR" >/dev/null

go run cmd/puebe.go --gui-dir="${DIR}/src/gui/static/" $@

popd >/dev/null
