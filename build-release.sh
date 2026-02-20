#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: ./build-release.sh <version>"
  exit 1
fi

VERSION="${VERSION#v}"
if [[ ! "$VERSION" =~ ^[0-9]+(\.[0-9]+){1,2}$ ]]; then
  echo "Version must be numeric (e.g., 0.5.2)"
  exit 1
fi

require_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool"
    exit 1
  fi
}

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  PYTHON_BIN="python"
fi

require_tool "$PYTHON_BIN"
require_tool zip
require_tool node

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TMP_CHROME="${DIST_DIR}/tmp-chrome"
TMP_FIREFOX="${DIST_DIR}/tmp-firefox"
BUILD_SCRIPT="${ROOT_DIR}/scripts/build-extension.mjs"

if [[ ! -f "${ROOT_DIR}/manifest.json" ]]; then
  echo "Missing manifest.json"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/manifest.firefox.json" ]]; then
  echo "Missing manifest.firefox.json"
  exit 1
fi

if [[ ! -f "${BUILD_SCRIPT}" ]]; then
  echo "Missing scripts/build-extension.mjs"
  exit 1
fi

update_manifest_version() {
  local manifest_path="$1"
  "$PYTHON_BIN" - "$manifest_path" "$VERSION" <<'PY'
import json
import sys

path = sys.argv[1]
version = sys.argv[2]

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

data["version"] = version

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=True)
    f.write("\n")
PY
}

update_manifest_version "${ROOT_DIR}/manifest.json"
update_manifest_version "${ROOT_DIR}/manifest.firefox.json"

mkdir -p "${DIST_DIR}"
rm -rf "${TMP_CHROME}" "${TMP_FIREFOX}"
mkdir -p "${TMP_CHROME}" "${TMP_FIREFOX}"

build_release_assets() {
  local target="$1"
  node "${BUILD_SCRIPT}" --outdir="${target}"
  cp -R "${ROOT_DIR}/icons" "${ROOT_DIR}/README.md" \
    "${ROOT_DIR}/LICENSE" "${ROOT_DIR}/CHANGELOG.md" "${ROOT_DIR}/PRIVACY.md" \
    "${ROOT_DIR}/THIRD_PARTY_NOTICES.md" \
    "$target"
}

build_release_assets "${TMP_CHROME}/"
cp "${ROOT_DIR}/manifest.json" "${TMP_CHROME}/manifest.json"

build_release_assets "${TMP_FIREFOX}/"
cp "${ROOT_DIR}/manifest.firefox.json" "${TMP_FIREFOX}/manifest.json"

rm -f "${DIST_DIR}/camkeeper-v${VERSION}-chrome.zip" "${DIST_DIR}/camkeeper-v${VERSION}-firefox.zip"

(
  cd "${TMP_CHROME}" \
    && zip -r "../camkeeper-v${VERSION}-chrome.zip" \
      manifest.json src icons README.md LICENSE CHANGELOG.md PRIVACY.md THIRD_PARTY_NOTICES.md
)
(
  cd "${TMP_FIREFOX}" \
    && zip -r "../camkeeper-v${VERSION}-firefox.zip" \
      manifest.json src icons README.md LICENSE CHANGELOG.md PRIVACY.md THIRD_PARTY_NOTICES.md
)

rm -rf "${TMP_CHROME}" "${TMP_FIREFOX}"

echo "Built:"
echo "  ${DIST_DIR}/camkeeper-v${VERSION}-chrome.zip"
echo "  ${DIST_DIR}/camkeeper-v${VERSION}-firefox.zip"
