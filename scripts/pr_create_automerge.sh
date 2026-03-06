#!/usr/bin/env bash
set -euo pipefail

# Creates a PR and automatically applies the `automerge` label.
# Requires: gh authenticated.

TITLE=${TITLE:-""}
BODY=${BODY:-""}
BASE=${BASE:-"master"}
HEAD=${HEAD:-""}
DRAFT=${DRAFT:-"false"}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2;;
    --body) BODY="$2"; shift 2;;
    --base) BASE="$2"; shift 2;;
    --head) HEAD="$2"; shift 2;;
    --draft) DRAFT="true"; shift 1;;
    *) echo "Unknown arg: $1"; exit 2;;
  esac
done

if [[ -z "$HEAD" ]]; then
  HEAD=$(git branch --show-current)
fi

if [[ -z "$TITLE" || -z "$BODY" ]]; then
  echo "Usage: $0 --title <title> --body <body> [--base master] [--head branch] [--draft]" >&2
  exit 2
fi

args=(pr create --base "$BASE" --head "$HEAD" --title "$TITLE" --body "$BODY" --label automerge)
if [[ "$DRAFT" == "true" ]]; then
  args+=(--draft)
fi

gh "${args[@]}"
