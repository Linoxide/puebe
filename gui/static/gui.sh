#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Puebe GUI :" "$DIR"

pushd "$DIR" >/dev/null

#npm install gulp

gulp build

# Copy Dev over to dist
cp -Rf dev/* dist/

popd >/dev/null
