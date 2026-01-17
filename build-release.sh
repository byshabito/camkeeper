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

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TMP_CHROME="${DIST_DIR}/tmp-chrome"
TMP_FIREFOX="${DIST_DIR}/tmp-firefox"

if [[ ! -f "${ROOT_DIR}/manifest.json" ]]; then
  echo "Missing manifest.json"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/manifest.firefox.json" ]]; then
  echo "Missing manifest.firefox.json"
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

RELEASE_TIMESTAMP="$(date -Iseconds)"

update_options_metadata() {
  local options_path="$1"
  "$PYTHON_BIN" - "$options_path" "$RELEASE_TIMESTAMP" <<'PY'
import re
import sys

path = sys.argv[1]
timestamp = sys.argv[2]

with open(path, "r", encoding="utf-8") as f:
    contents = f.read()

contents = re.sub(
    r'const RELEASE_TIMESTAMP = ".*?";',
    f'const RELEASE_TIMESTAMP = "{timestamp}";',
    contents,
)

with open(path, "w", encoding="utf-8") as f:
    f.write(contents)
PY
}

update_options_metadata "${ROOT_DIR}/src/ui/components/settingsPanel.js"

mkdir -p "${DIST_DIR}"
rm -rf "${TMP_CHROME}" "${TMP_FIREFOX}"
mkdir -p "${TMP_CHROME}" "${TMP_FIREFOX}"

copy_release_assets() {
  local target="$1"
  cp -R "${ROOT_DIR}/src" "${ROOT_DIR}/icons" "${ROOT_DIR}/README.md" \
    "${ROOT_DIR}/LICENSE" "${ROOT_DIR}/CHANGELOG.md" "${ROOT_DIR}/PRIVACY.md" \
    "$target"
}

copy_release_assets "${TMP_CHROME}/"
cp "${ROOT_DIR}/manifest.json" "${TMP_CHROME}/manifest.json"

copy_release_assets "${TMP_FIREFOX}/"
cp "${ROOT_DIR}/manifest.firefox.json" "${TMP_FIREFOX}/manifest.json"

(
  cd "${TMP_CHROME}" \
    && zip -r "../camkeeper-v${VERSION}-chrome.zip" \
      manifest.json src icons README.md LICENSE CHANGELOG.md PRIVACY.md
)
(
  cd "${TMP_FIREFOX}" \
    && zip -r "../camkeeper-v${VERSION}-firefox.zip" \
      manifest.json src icons README.md LICENSE CHANGELOG.md PRIVACY.md
)

rm -rf "${TMP_CHROME}" "${TMP_FIREFOX}"

echo "Built:"
echo "  ${DIST_DIR}/camkeeper-v${VERSION}-chrome.zip"
echo "  ${DIST_DIR}/camkeeper-v${VERSION}-firefox.zip"
