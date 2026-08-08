#!/usr/bin/env bash
set -euo pipefail

REPO="${GOOD_TIMES_REPO:-dolodorsey/good-times-app}"
SECURE_DIR="${GOOD_TIMES_RELEASE_HOME:-$HOME/.good-times-release}"
KEYSTORE="$SECURE_DIR/good-times-upload.jks"
RECOVERY="$SECURE_DIR/android-signing-recovery.env"
PLAY_JSON="${1:-${GOOGLE_PLAY_SERVICE_ACCOUNT_FILE:-}}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-good-times-upload}"

fail(){ echo "ERROR: $*" >&2; exit 1; }
command -v gh >/dev/null || fail "GitHub CLI (gh) is required."
command -v keytool >/dev/null || fail "Java keytool is required."
command -v openssl >/dev/null || fail "openssl is required."
gh auth status >/dev/null 2>&1 || fail "Authenticate GitHub CLI first with: gh auth login"

mkdir -p "$SECURE_DIR"
chmod 700 "$SECURE_DIR"

if [[ -z "$PLAY_JSON" ]]; then
  fail "Pass the Google Play service-account JSON file as argument 1 or set GOOGLE_PLAY_SERVICE_ACCOUNT_FILE."
fi
[[ -f "$PLAY_JSON" ]] || fail "Google Play service-account file not found: $PLAY_JSON"
python3 - "$PLAY_JSON" <<'PY'
import json,sys
p=sys.argv[1]
with open(p) as f: data=json.load(f)
required={'type','client_email','private_key','project_id'}
missing=sorted(required-set(data))
if data.get('type')!='service_account' or missing:
    raise SystemExit(f"Not a usable Google service-account JSON; missing={missing}")
print(f"Validated Google service account for project {data['project_id']}")
PY

if [[ -f "$KEYSTORE" && -f "$RECOVERY" ]]; then
  # Reuse the permanent signing identity instead of ever generating a second key.
  # shellcheck disable=SC1090
  source "$RECOVERY"
  [[ -n "${ANDROID_KEYSTORE_PASSWORD:-}" && -n "${ANDROID_KEY_PASSWORD:-}" && -n "${ANDROID_KEY_ALIAS:-}" ]] || fail "Recovery file is incomplete."
  keytool -list -keystore "$KEYSTORE" -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$ANDROID_KEY_ALIAS" >/dev/null
  echo "Reusing existing permanent GOOD TIMES Android upload key."
elif [[ -e "$KEYSTORE" || -e "$RECOVERY" ]]; then
  fail "Only one of the permanent keystore/recovery files exists. Restore the matching file; do not generate a replacement key."
else
  ANDROID_KEYSTORE_PASSWORD="$(openssl rand -hex 24)"
  ANDROID_KEY_PASSWORD="$(openssl rand -hex 24)"
  ANDROID_KEY_ALIAS="$KEY_ALIAS"

  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storetype JKS \
    -storepass "$ANDROID_KEYSTORE_PASSWORD" \
    -keypass "$ANDROID_KEY_PASSWORD" \
    -alias "$ANDROID_KEY_ALIAS" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "CN=GOOD TIMES Worldwide, OU=Mobile Release, O=GOOD TIMES Worldwide, C=US"

  umask 077
  cat > "$RECOVERY" <<EOF
ANDROID_KEYSTORE_PASSWORD='$ANDROID_KEYSTORE_PASSWORD'
ANDROID_KEY_PASSWORD='$ANDROID_KEY_PASSWORD'
ANDROID_KEY_ALIAS='$ANDROID_KEY_ALIAS'
EOF
  chmod 600 "$KEYSTORE" "$RECOVERY"
  echo "Created the permanent GOOD TIMES Android upload key in $SECURE_DIR."
  echo "Back up BOTH files in $SECURE_DIR to your secure credential vault. Never commit them."
fi

KEYSTORE_B64="$(base64 < "$KEYSTORE" | tr -d '\n')"
PLAY_JSON_VALUE="$(cat "$PLAY_JSON")"

# GitHub CLI encrypts repository secret values locally before upload.
printf '%s' "$KEYSTORE_B64" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$ANDROID_KEYSTORE_PASSWORD" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO"
printf '%s' "$ANDROID_KEY_ALIAS" | gh secret set ANDROID_KEY_ALIAS --repo "$REPO"
printf '%s' "$ANDROID_KEY_PASSWORD" | gh secret set ANDROID_KEY_PASSWORD --repo "$REPO"
printf '%s' "$PLAY_JSON_VALUE" | gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --repo "$REPO"

unset KEYSTORE_B64 PLAY_JSON_VALUE ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD

echo "Installed all five GOOD TIMES Android release secrets in $REPO."
echo "Permanent signing material remains only in: $SECURE_DIR"
echo "Next release command: gh workflow run android-build.yml --repo $REPO"
