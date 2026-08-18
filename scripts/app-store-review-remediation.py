import hashlib
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

import jwt
import requests

BASE = "https://api.appstoreconnect.apple.com/v1"
BUNDLE = "com.kollective.goodtimes"
VERSION = os.environ.get("TARGET_VERSION", "1.1.0").strip()
LOCALE = "en-US"
SUPPORT_URL = "https://thegoodtimesworldwide.com/support.html"
MIN_BUILD_UPLOADED_AT = os.environ.get("MIN_BUILD_UPLOADED_AT", "2026-08-18T23:12:00Z")
REVIEW_USERNAME = os.environ["REVIEW_USERNAME"]
REVIEW_PASSWORD = os.environ["REVIEW_PASSWORD"]
ROOT = Path(os.environ.get("GT_UI_ARTIFACTS", "ui-artifacts")) / "app-store"
EVIDENCE_JSON = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "good-times-app-store-remediation.json"
EVIDENCE_MD = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "good-times-app-store-remediation.md"

SCREENSHOT_TARGETS = {
    "APP_IPHONE_67": ROOT / "iphone-6.9",
    "APP_IPAD_PRO_3GEN_129": ROOT / "ipad-13",
}

state = {
    "bundleId": BUNDLE,
    "version": VERSION,
    "locale": LOCALE,
    "supportUrl": SUPPORT_URL,
    "reviewAccount": REVIEW_USERNAME,
    "reviewPasswordStored": False,
    "screenshotSets": {},
    "freshBuild": None,
    "submission": None,
    "ok": False,
}


def parse_dt(value: str):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def auth_headers():
    now = int(time.time())
    token = jwt.encode(
        {"iss": os.environ["ASC_ISSUER_ID"], "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"},
        os.environ["ASC_PRIVATE_KEY"],
        algorithm="ES256",
        headers={"kid": os.environ["ASC_KEY_ID"], "typ": "JWT"},
    )
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def req(method, path, params=None, payload=None, allow=(200, 201, 204), retries=7):
    last = None
    for attempt in range(1, retries + 1):
        response = requests.request(
            method,
            BASE + path,
            headers=auth_headers(),
            params=params,
            json=payload,
            timeout=60,
        )
        if response.status_code in allow:
            if response.status_code == 204 or not response.content:
                return {}
            return response.json()
        last = response
        if response.status_code == 429 or response.status_code >= 500:
            delay = min(2 ** attempt, 30)
            print(f"App Store Connect transient {response.status_code} on {method} {path}; retrying in {delay}s")
            time.sleep(delay)
            continue
        raise RuntimeError(f"{method} {path} HTTP {response.status_code}: {response.text[:6000]}")
    raise RuntimeError(f"{method} {path} failed after retries: HTTP {last.status_code}: {last.text[:6000]}")


def resolve_app_and_version():
    apps = req("GET", "/apps", {"filter[bundleId]": BUNDLE, "limit": "10"})["data"]
    exact = [a for a in apps if a.get("attributes", {}).get("bundleId") == BUNDLE]
    if len(exact) != 1:
        raise RuntimeError(f"Expected exactly one GOOD TIMES app, found {len(exact)}")
    app_id = exact[0]["id"]
    versions = req("GET", f"/apps/{app_id}/appStoreVersions", {"limit": "200"})["data"]
    matches = [v for v in versions if v.get("attributes", {}).get("platform") == "IOS" and v.get("attributes", {}).get("versionString") == VERSION]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one iOS App Store version {VERSION}, found {len(matches)}")
    version = matches[0]
    vstate = version.get("attributes", {}).get("appVersionState") or version.get("attributes", {}).get("appStoreState")
    state["appId"] = app_id
    state["versionId"] = version["id"]
    state["versionStateBefore"] = vstate
    return app_id, version["id"]


def resolve_localization(version_id):
    rows = req("GET", f"/appStoreVersions/{version_id}/appStoreVersionLocalizations", {"filter[locale]": LOCALE, "limit": "50"})["data"]
    if len(rows) != 1:
        raise RuntimeError(f"Expected one {LOCALE} localization, found {len(rows)}")
    return rows[0]["id"]


def update_support(localization_id):
    req(
        "PATCH",
        f"/appStoreVersionLocalizations/{localization_id}",
        payload={"data": {"type": "appStoreVersionLocalizations", "id": localization_id, "attributes": {"supportUrl": SUPPORT_URL}}},
    )
    check = req("GET", f"/appStoreVersionLocalizations/{localization_id}")["data"]["attributes"]
    if check.get("supportUrl") != SUPPORT_URL:
        raise RuntimeError("Support URL read-back verification failed")
    state["supportUrlVerified"] = True


def update_review_details(version_id):
    review = req("GET", f"/appStoreVersions/{version_id}/appStoreReviewDetail")["data"]
    review_id = review["id"]
    current = review.get("attributes", {})
    required_contact = ["contactFirstName", "contactLastName", "contactPhone", "contactEmail"]
    missing = [key for key in required_contact if not current.get(key)]
    if missing:
        raise RuntimeError(f"Existing App Review contact information is incomplete: {missing}; refusing to invent contact details")
    notes = (
        "GOOD TIMES now allows guest access to Events, nightlife, local discovery, Dates, and Explore without registration. "
        "An account is only required for account-based features such as saving, persistent plans, and personalization. "
        "Location permission is optional and a city can be selected manually. The dedicated support page is "
        f"{SUPPORT_URL}. A valid review account is provided in the App Review demo-account fields."
    )
    attrs = {
        "demoAccountRequired": True,
        "demoAccountName": REVIEW_USERNAME,
        "demoAccountPassword": REVIEW_PASSWORD,
        "notes": notes,
    }
    req("PATCH", f"/appStoreReviewDetails/{review_id}", payload={"data": {"type": "appStoreReviewDetails", "id": review_id, "attributes": attrs}})
    verified = req("GET", f"/appStoreReviewDetails/{review_id}")["data"]["attributes"]
    if verified.get("demoAccountName") != REVIEW_USERNAME or not verified.get("demoAccountRequired"):
        raise RuntimeError("App Review demo-account read-back verification failed")
    if not verified.get("demoAccountPassword"):
        raise RuntimeError("App Review password did not persist")
    state["reviewDetailId"] = review_id
    state["reviewPasswordStored"] = True
    state["reviewNotesUpdated"] = True


def create_screenshot_set(localization_id, display_type):
    existing = req(
        "GET",
        f"/appStoreVersionLocalizations/{localization_id}/appScreenshotSets",
        {"filter[screenshotDisplayType]": display_type, "limit": "50"},
    )["data"]
    for item in existing:
        req("DELETE", f"/appScreenshotSets/{item['id']}")
    created = req(
        "POST",
        "/appScreenshotSets",
        payload={
            "data": {
                "type": "appScreenshotSets",
                "attributes": {"screenshotDisplayType": display_type},
                "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": localization_id}}},
            }
        },
    )["data"]
    return created["id"]


def reserve_and_upload(set_id, file_path: Path):
    raw = file_path.read_bytes()
    reservation = req(
        "POST",
        "/appScreenshots",
        payload={
            "data": {
                "type": "appScreenshots",
                "attributes": {"fileSize": len(raw), "fileName": file_path.name},
                "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}},
            }
        },
    )["data"]
    screenshot_id = reservation["id"]
    operations = reservation.get("attributes", {}).get("uploadOperations") or []
    if not operations:
        raise RuntimeError(f"No upload operations returned for {file_path.name}")
    for op in operations:
        offset = int(op["offset"])
        length = int(op["length"])
        headers = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        piece = raw[offset : offset + length]
        upload = requests.request(op.get("method", "PUT"), op["url"], headers=headers, data=piece, timeout=120)
        if not upload.ok:
            raise RuntimeError(f"Screenshot upload failed for {file_path.name}: HTTP {upload.status_code}: {upload.text[:1000]}")
    checksum = hashlib.md5(raw).hexdigest()
    req(
        "PATCH",
        f"/appScreenshots/{screenshot_id}",
        payload={"data": {"type": "appScreenshots", "id": screenshot_id, "attributes": {"uploaded": True, "sourceFileChecksum": checksum}}},
    )
    return screenshot_id


def wait_for_screenshots(ids):
    pending = set(ids)
    deadline = time.time() + 420
    last = {}
    while pending and time.time() < deadline:
        for screenshot_id in list(pending):
            item = req("GET", f"/appScreenshots/{screenshot_id}")["data"]
            delivery = item.get("attributes", {}).get("assetDeliveryState") or {}
            delivery_state = delivery.get("state")
            last[screenshot_id] = delivery
            if delivery_state == "COMPLETE":
                pending.remove(screenshot_id)
            elif delivery_state == "FAILED":
                raise RuntimeError(f"Screenshot {screenshot_id} processing failed: {delivery}")
        if pending:
            time.sleep(10)
    if pending:
        raise RuntimeError(f"Timed out waiting for screenshot processing: {pending}; states={last}")


def replace_screenshots(localization_id):
    for display_type, directory in SCREENSHOT_TARGETS.items():
        files = sorted(directory.glob("*.png"))
        if len(files) < 3:
            raise RuntimeError(f"Expected at least 3 generated screenshots for {display_type}, found {len(files)} in {directory}")
        set_id = create_screenshot_set(localization_id, display_type)
        ids = [reserve_and_upload(set_id, file_path) for file_path in files]
        wait_for_screenshots(ids)
        listed = req("GET", f"/appScreenshotSets/{set_id}/appScreenshots", {"limit": "200"})["data"]
        if len(listed) != len(ids):
            raise RuntimeError(f"Screenshot count verification failed for {display_type}: expected {len(ids)}, got {len(listed)}")
        state["screenshotSets"][display_type] = {"setId": set_id, "count": len(ids), "screenshotIds": ids}


def wait_for_fresh_build(app_id):
    cutoff = parse_dt(MIN_BUILD_UPLOADED_AT)
    deadline = time.time() + 1500
    seen = []
    while time.time() < deadline:
        builds = req("GET", f"/apps/{app_id}/builds", {"limit": "200"})["data"]
        candidates = []
        for build in builds:
            attrs = build.get("attributes", {})
            uploaded = attrs.get("uploadedDate")
            number = str(attrs.get("version") or "")
            if uploaded:
                seen.append({"version": number, "uploadedDate": uploaded, "processingState": attrs.get("processingState"), "buildAudienceType": attrs.get("buildAudienceType")})
            try:
                newer_number = int(number) > 250
            except ValueError:
                newer_number = number != "250"
            if not uploaded or not newer_number or parse_dt(uploaded) < cutoff:
                continue
            if attrs.get("processingState") == "VALID" and attrs.get("buildAudienceType") == "APP_STORE_ELIGIBLE":
                candidates.append(build)
        if candidates:
            candidates.sort(key=lambda b: b.get("attributes", {}).get("uploadedDate", ""), reverse=True)
            return candidates[0]
        latest = sorted(seen, key=lambda row: row.get("uploadedDate", ""), reverse=True)[:5]
        print(f"Waiting for fresh App Store-eligible iOS build after {MIN_BUILD_UPLOADED_AT}; latest={latest}")
        time.sleep(30)
    raise RuntimeError(f"No fresh App Store-eligible build appeared after {MIN_BUILD_UPLOADED_AT}; latest seen={sorted(seen, key=lambda row: row.get('uploadedDate',''), reverse=True)[:10]}")


def attach_build(version_id, build):
    build_id = build["id"]
    attrs = build.get("attributes", {})
    req(
        "PATCH",
        f"/appStoreVersions/{version_id}/relationships/build",
        payload={"data": {"type": "builds", "id": build_id}},
    )
    linkage = req("GET", f"/appStoreVersions/{version_id}/relationships/build")["data"]
    if not linkage or linkage.get("id") != build_id:
        raise RuntimeError("Fresh build relationship read-back verification failed")
    state["freshBuild"] = {
        "id": build_id,
        "number": attrs.get("version"),
        "uploadedDate": attrs.get("uploadedDate"),
        "processingState": attrs.get("processingState"),
        "buildAudienceType": attrs.get("buildAudienceType"),
        "attached": True,
    }


def attempt_resubmission(app_id, version_id):
    submissions = req("GET", f"/apps/{app_id}/reviewSubmissions", {"limit": "200"})["data"]
    unresolved = [s for s in submissions if s.get("attributes", {}).get("state") == "UNRESOLVED_ISSUES"]
    if len(unresolved) != 1:
        state["submission"] = {"attempted": False, "reason": f"Expected one UNRESOLVED_ISSUES review submission, found {len(unresolved)}"}
        return
    submission = unresolved[0]
    submission_id = submission["id"]
    items = req("GET", f"/reviewSubmissions/{submission_id}/items", {"limit": "200"})["data"]
    version_items = [i for i in items if i.get("relationships", {}).get("appStoreVersion", {}).get("data", {}).get("id") == version_id]
    if not version_items and len(items) != 1:
        state["submission"] = {"attempted": False, "reason": f"Could not resolve the GOOD TIMES version review item among {len(items)} items"}
        return
    payload = {"data": {"type": "reviewSubmissions", "id": submission_id, "attributes": {"submitted": True}}}
    transient = "Version is not ready to be submitted yet, please try again later."
    last_error = None
    for attempt in range(1, 13):
        response = requests.patch(BASE + f"/reviewSubmissions/{submission_id}", headers=auth_headers(), json=payload, timeout=60)
        if response.ok:
            final = req("GET", f"/reviewSubmissions/{submission_id}")["data"]
            final_state = final.get("attributes", {}).get("state")
            state["submission"] = {"attempted": True, "submitted": True, "id": submission_id, "state": final_state}
            return
        last_error = response.text[:6000]
        if response.status_code == 409 and transient in response.text:
            time.sleep(20)
            continue
        state["submission"] = {"attempted": True, "submitted": False, "id": submission_id, "httpStatus": response.status_code, "error": last_error}
        return
    state["submission"] = {"attempted": True, "submitted": False, "id": submission_id, "error": last_error or "Submission never became ready"}


def write_evidence(error=None):
    if error:
        state["error"] = str(error)
    EVIDENCE_JSON.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    lines = [
        "## GOOD TIMES App Store remediation",
        "",
        f"- **Result:** {'SUCCESS' if state.get('ok') else 'INCOMPLETE'}",
        f"- **App Store version:** {state.get('version')}",
        f"- **Support URL verified:** {bool(state.get('supportUrlVerified'))}",
        f"- **Review account stored in App Store Connect:** {bool(state.get('reviewPasswordStored'))}",
        f"- **iPhone 6.7/6.9 screenshot count:** {state.get('screenshotSets', {}).get('APP_IPHONE_67', {}).get('count', 0)}",
        f"- **13-inch iPad screenshot count:** {state.get('screenshotSets', {}).get('APP_IPAD_PRO_3GEN_129', {}).get('count', 0)}",
    ]
    build = state.get("freshBuild") or {}
    if build:
        lines.append(f"- **Fresh attached build:** {build.get('number')} ({build.get('processingState')}, uploaded {build.get('uploadedDate')})")
    submission = state.get("submission")
    if submission:
        lines.append(f"- **Review submission:** `{json.dumps(submission, ensure_ascii=False)}`")
    if error:
        lines += ["", "### Blocker", "", f"`{str(error)[:5000]}`"]
    lines += ["", "Demo-account password is intentionally omitted from this public execution record."]
    EVIDENCE_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    app_id, version_id = resolve_app_and_version()
    localization_id = resolve_localization(version_id)
    state["localizationId"] = localization_id
    update_support(localization_id)
    update_review_details(version_id)
    replace_screenshots(localization_id)
    fresh_build = wait_for_fresh_build(app_id)
    attach_build(version_id, fresh_build)
    attempt_resubmission(app_id, version_id)
    state["ok"] = bool(state.get("supportUrlVerified") and state.get("reviewPasswordStored") and len(state.get("screenshotSets", {})) == 2 and state.get("freshBuild", {}).get("attached"))
    write_evidence()
    if not state["ok"]:
        raise RuntimeError("App Store remediation verification did not reach a complete state")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        traceback.print_exc()
        write_evidence(exc)
        sys.exit(1)
