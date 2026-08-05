#!/usr/bin/env python3
"""Generate Desktop gallery narration with the local Voicebox service."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DATA = ROOT / "desktop" / "public" / "data" / "official-artworks.json"
OUTPUT_ROOT = ROOT / "desktop" / "public" / "audio"
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"
DEFAULT_BASE_URL = "http://127.0.0.1:17493"
DEFAULT_PROFILE_ID = "706048fa-9f1d-40cc-8a8a-f0c0c589939f"
DEFAULT_PROFILE_NAME = "文博讲解 · 温润女声"
NARRATION_TEMPLATE_VERSION = "title-description-v1"
TERMINAL_FAILURES = {"failed", "error", "cancelled", "canceled"}
GENERATION_OPTIONS = {
    "language": "zh",
    "engine": "qwen_custom_voice",
    "model_size": "1.7B",
    "personality": False,
    "max_chunk_chars": 100,
    "crossfade_ms": 0,
    "normalize": True,
}
NUMBERED_TITLE = re.compile(r"^(?P<base>.+?)（(?P<number>[一二三四五六七八九十]+)）$")
PARENTHETICAL_TITLE = re.compile(r"^(?P<base>.+?)（(?P<detail>.+)）$")


def request_json(url: str, payload: dict | None = None, timeout: int = 30) -> dict:
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=120) as response:
        destination.write_bytes(response.read())


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {"profile": {}, "items": {}}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: dict) -> None:
    manifest["updatedAt"] = datetime.now(timezone.utc).isoformat()
    temporary = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(MANIFEST_PATH)


def convert_to_m4a(source: Path, destination: Path) -> None:
    afconvert = shutil.which("afconvert")
    if not afconvert:
        raise RuntimeError("未找到 afconvert；请在安装 Voicebox 的 macOS 机器上生成音频")
    temporary = destination.with_suffix(".m4a.tmp")
    temporary.unlink(missing_ok=True)
    subprocess.run(
        [
            afconvert,
            "-f",
            "m4af",
            "-d",
            "aac",
            "-b",
            "64000",
            "-q",
            "127",
            str(source),
            str(temporary),
        ],
        check=True,
    )
    temporary.replace(destination)


def wait_for_generation(base_url: str, generation_id: str, timeout: int) -> dict:
    deadline = time.monotonic() + timeout
    last_status = ""
    while time.monotonic() < deadline:
        generation = request_json(f"{base_url}/history/{generation_id}")
        status = generation.get("status", "unknown")
        if status != last_status:
            print(f"    Voicebox 状态：{status}", flush=True)
            last_status = status
        if status == "completed":
            return generation
        if status in TERMINAL_FAILURES:
            raise RuntimeError(generation.get("error") or f"Voicebox 生成失败：{status}")
        time.sleep(2)
    raise TimeoutError(f"Voicebox 生成超时：{generation_id}")


def description_hash(description: str) -> str:
    return hashlib.sha256(description.encode("utf-8")).hexdigest()


def spoken_title(title: str) -> str:
    normalized = title.strip()
    numbered = NUMBERED_TITLE.fullmatch(normalized)
    if numbered:
        return f"{numbered.group('base')}，第{numbered.group('number')}幅"
    parenthetical = PARENTHETICAL_TITLE.fullmatch(normalized)
    if parenthetical:
        return f"{parenthetical.group('base')}，{parenthetical.group('detail')}"
    return normalized


def narration_text(artwork: dict) -> str:
    title = spoken_title(artwork["title"])
    description = artwork["description"].strip()
    return f"您现在欣赏的是《{title}》。{description}"


def json_hash(value: dict) -> str:
    serialized = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def generation_settings_hash(profile_id: str) -> str:
    return json_hash({
        "profileId": profile_id,
        "templateVersion": NARRATION_TEMPLATE_VERSION,
        **GENERATION_OPTIONS,
    })


def generate_artwork(
    artwork: dict,
    manifest: dict,
    base_url: str,
    profile_id: str,
    force: bool,
    timeout: int,
) -> bool:
    slug = artwork["slug"]
    description = artwork["description"].strip()
    speech_title = spoken_title(artwork["title"])
    narration = narration_text(artwork)
    destination = OUTPUT_ROOT / f"{slug}.m4a"
    narration_hash = hashlib.sha256(narration.encode("utf-8")).hexdigest()
    settings_hash = generation_settings_hash(profile_id)
    existing = manifest["items"].get(slug, {})
    if (
        not force
        and destination.exists()
        and existing.get("narrationSha256") == narration_hash
        and existing.get("generationSettingsSha256") == settings_hash
        and existing.get("profileId") == profile_id
    ):
        print(f"[跳过] {slug} {artwork['title']}", flush=True)
        return False

    print(f"[生成] {slug} {artwork['title']}（旁白 {len(narration)} 字）", flush=True)
    response = request_json(
        f"{base_url}/generate",
        {
            "profile_id": profile_id,
            "text": narration,
            **GENERATION_OPTIONS,
        },
    )
    generation_id = response["id"]
    generation = wait_for_generation(base_url, generation_id, timeout)

    wave_path = OUTPUT_ROOT / f".{slug}.wav"
    try:
        download(f"{base_url}/audio/{generation_id}", wave_path)
        convert_to_m4a(wave_path, destination)
    finally:
        wave_path.unlink(missing_ok=True)

    manifest["items"][slug] = {
        "title": artwork["title"],
        "path": f"/audio/{slug}.m4a",
        "duration": generation.get("duration"),
        "bytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "spokenTitle": speech_title,
        "templateVersion": NARRATION_TEMPLATE_VERSION,
        "descriptionSha256": description_hash(description),
        "narrationSha256": narration_hash,
        "generationSettingsSha256": settings_hash,
        "profileId": profile_id,
        "generationId": generation_id,
    }
    save_manifest(manifest)
    print(
        f"    完成：{generation.get('duration', 0):.2f} 秒，"
        f"{destination.stat().st_size / 1024:.0f} KB",
        flush=True,
    )
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--profile-id", default=DEFAULT_PROFILE_ID)
    parser.add_argument("--source-data", type=Path, default=SOURCE_DATA, help="作品数据 JSON，默认读取 Desktop 正式数据")
    parser.add_argument("--only", action="append", help="仅生成指定 slug，可重复传入")
    parser.add_argument("--force", action="store_true", help="覆盖已生成且来源未变化的音频")
    parser.add_argument("--timeout", type=int, default=900, help="单件作品生成超时秒数")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    try:
        health = request_json(f"{base_url}/health", timeout=10)
    except (OSError, urllib.error.URLError) as error:
        raise SystemExit(f"无法连接 Voicebox：{error}") from error
    if health.get("status") != "healthy":
        raise SystemExit(f"Voicebox 服务异常：{health}")

    data = json.loads(args.source_data.read_text(encoding="utf-8"))
    artworks = data["artworks"]
    if args.only:
        selected = set(args.only)
        artworks = [artwork for artwork in artworks if artwork["slug"] in selected]
        missing = selected - {artwork["slug"] for artwork in artworks}
        if missing:
            raise SystemExit(f"未找到作品：{', '.join(sorted(missing))}")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    profile = {
        "id": args.profile_id,
        "name": DEFAULT_PROFILE_NAME,
        "engine": "qwen_custom_voice",
        "voice": "Serena",
        "language": "zh",
        "personality": False,
        "modelSize": GENERATION_OPTIONS["model_size"],
        "templateVersion": NARRATION_TEMPLATE_VERSION,
    }
    manifest_changed = manifest.get("profile") != profile or "items" not in manifest
    manifest["profile"] = profile
    manifest.setdefault("items", {})
    if manifest_changed or not MANIFEST_PATH.exists():
        save_manifest(manifest)

    generated = 0
    for index, artwork in enumerate(artworks, start=1):
        print(f"\n进度 {index}/{len(artworks)}", flush=True)
        generated += generate_artwork(
            artwork,
            manifest,
            base_url,
            args.profile_id,
            args.force,
            args.timeout,
        )

    total_bytes = sum(
        (OUTPUT_ROOT / f"{artwork['slug']}.m4a").stat().st_size
        for artwork in artworks
        if (OUTPUT_ROOT / f"{artwork['slug']}.m4a").exists()
    )
    print(
        f"\n音频处理完成：新生成 {generated} 件，当前 {len(manifest['items'])} 件，"
        f"本次选择文件共 {total_bytes / 1024 / 1024:.1f} MB",
        flush=True,
    )


if __name__ == "__main__":
    main()
