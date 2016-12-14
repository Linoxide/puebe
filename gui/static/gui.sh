#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Puebe GUI :" "$DIR"

pushd "$DIR" >/dev/null

echo "Installing GUI Deps"
#npm install gulp

echo "Building GUI"
gulp build

# Copy Dev over to dist
echo "Updates GUI repo"
cp -Rf dev/* dist/

popd >/dev/null
