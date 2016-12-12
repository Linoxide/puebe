#!/usr/bin/env bash
set -e -o pipefail

. build-conf.sh

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

pushd "$SCRIPTDIR" >/dev/null

echo "----------------------------"
echo "Packaging standalone release"
./package-standalone-release.sh

echo "------------------------------"
echo "Compressing standalone release"
./compress-standalone-release.sh

popd >/dev/null
