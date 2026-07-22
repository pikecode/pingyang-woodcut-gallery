#!/usr/bin/env python3
"""Build browser-friendly artwork images and a frontend data payload."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DATA = ROOT / "data" / "exports" / "artworks.json"
PUBLIC_ROOT = ROOT / "public"
OUTPUT_DATA = PUBLIC_ROOT / "data" / "artworks.json"
MAX_EDGE = 1800


def build_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        if getattr(image, "n_frames", 1) > 1:
            image.seek(0)
        image = image.convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=88, method=6)


def main() -> None:
    data = json.loads(SOURCE_DATA.read_text(encoding="utf-8"))
    for artwork in data["artworks"]:
        for image in artwork["images"]:
            role = image["role"]
            relative = Path("images") / artwork["slug"] / f"{role}.webp"
            build_image(ROOT / image["path"], PUBLIC_ROOT / relative)
            image["originalPath"] = image.pop("path")
            image["path"] = f"/{relative.as_posix()}"
            image["webFormat"] = "WEBP"

    OUTPUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_DATA.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    image_count = sum(len(artwork["images"]) for artwork in data["artworks"])
    print(f"Built {image_count} web images and {OUTPUT_DATA}")


if __name__ == "__main__":
    main()

