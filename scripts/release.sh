#!/bin/sh

set -e

# Local Release Workflow
#
# References:
#
# - https://git-scm.com/docs/git-commit

if [[ -z $* ]]; then
  echo "[ERROR] missing release version."
  exit 1
fi

VERSION_MANIFEST=.yarn/versions/*.yml

if compgen -G $VERSION_MANIFEST >/dev/null; then
  echo "[READY] version manifest found."
else
  echo "[ERROR] missing version manifest."
  exit 1
fi

git add $VERSION_MANIFEST
git commit --allow-empty -S -s -m "release(chore): $@"
