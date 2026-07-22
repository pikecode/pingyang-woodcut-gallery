#!/usr/bin/env python3
"""Generate a museum-style poster from one normalized artwork record."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "data" / "gallery.sqlite"
SONGTI = Path("/System/Library/Fonts/Supplemental/Songti.ttc")
HEITI = Path("/System/Library/Fonts/STHeiti Medium.ttc")

CANVAS = (1440, 1920)
PAPER = (247, 246, 242)
INK = (24, 24, 21)
MUTED = (103, 101, 94)
RULE = (188, 185, 175)
VERMILION = (176, 38, 31)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.exists():
        raise FileNotFoundError(f"Required font not found: {path}")
    return ImageFont.truetype(str(path), size=size)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for character in text:
        candidate = current + character
        if current and draw.textlength(candidate, font=text_font) > width:
            lines.append(current)
            current = character
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def load_artwork(catalog_no: int) -> sqlite3.Row:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """SELECT
               a.catalog_no, a.slug, a.title, a.description,
               a.summary_theme_raw, a.summary_form_raw, a.period_label,
               c.name AS collection, i.storage_path
           FROM artworks a
           JOIN collections c ON c.id = a.collection_id
           JOIN artwork_images i ON i.artwork_id = a.id AND i.sort_order = 1
           WHERE a.catalog_no = ?""",
        (catalog_no,),
    ).fetchone()
    connection.close()
    if row is None:
        raise ValueError(f"Artwork {catalog_no} does not exist")
    return row


def generate(catalog_no: int, output: Path | None = None) -> Path:
    artwork = load_artwork(catalog_no)
    output = output or ROOT / "design" / "previews" / f"{artwork['slug']}-poster-v1.png"
    output.parent.mkdir(parents=True, exist_ok=True)

    canvas = Image.new("RGB", CANVAS, PAPER)
    draw = ImageDraw.Draw(canvas)
    margin = 108
    content_width = CANVAS[0] - margin * 2

    title_font = font(HEITI, 92)
    series_font = font(HEITI, 28)
    category_font = font(HEITI, 34)
    label_font = font(HEITI, 24)
    body_font = font(SONGTI, 35)
    metadata_font = font(SONGTI, 31)
    number_font = font(HEITI, 58)
    latin_font = font(HEITI, 20)

    draw.rectangle((margin, 92, margin + 12, 302), fill=VERMILION)
    draw.text((margin + 40, 95), "平阳木版年画", font=series_font, fill=MUTED)
    draw.text((margin + 40, 148), artwork["title"], font=title_font, fill=INK)
    category = f"{artwork['summary_theme_raw']}  ·  {artwork['summary_form_raw']}"
    draw.text((margin + 42, 267), category, font=category_font, fill=VERMILION)

    number_label = "馆藏编号"
    label_width = draw.textlength(number_label, font=label_font)
    draw.text((CANVAS[0] - margin - label_width, 98), number_label, font=label_font, fill=MUTED)
    number = f"{artwork['catalog_no']:03d}"
    number_width = draw.textlength(number, font=number_font)
    draw.text((CANVAS[0] - margin - number_width, 137), number, font=number_font, fill=INK)

    source = Image.open(ROOT / artwork["storage_path"]).convert("RGB")
    image_width = content_width
    image_height = round(source.height * image_width / source.width)
    source = source.resize((image_width, image_height), Image.Resampling.LANCZOS)
    image_y = 350
    canvas.paste(source, (margin, image_y))
    draw.rectangle(
        (margin - 1, image_y - 1, margin + image_width, image_y + image_height),
        outline=INK,
        width=2,
    )

    intro_y = image_y + image_height + 74
    draw.text((margin, intro_y), "画面简介", font=category_font, fill=VERMILION)
    label_end = margin + draw.textlength("画面简介", font=category_font)
    draw.line((label_end + 26, intro_y + 25, CANVAS[0] - margin, intro_y + 25), fill=RULE, width=2)

    body_y = intro_y + 65
    line_height = 57
    for line in wrap_text(draw, artwork["description"], body_font, content_width):
        draw.text((margin, body_y), line, font=body_font, fill=INK)
        body_y += line_height

    metadata_y = max(body_y + 52, 1588)
    draw.line((margin, metadata_y, CANVAS[0] - margin, metadata_y), fill=INK, width=3)
    draw.text((margin, metadata_y + 30), "分类", font=label_font, fill=MUTED)
    draw.text((margin, metadata_y + 68), category, font=metadata_font, fill=INK)
    draw.text((622, metadata_y + 30), "年代", font=label_font, fill=MUTED)
    draw.text((622, metadata_y + 68), artwork["period_label"], font=metadata_font, fill=INK)
    draw.text((806, metadata_y + 30), "馆藏", font=label_font, fill=MUTED)
    draw.text((806, metadata_y + 68), artwork["collection"], font=metadata_font, fill=INK)

    footer_y = 1835
    draw.text((margin, footer_y), "PINGYANG WOODCUT GALLERY", font=latin_font, fill=MUTED)
    draw.rectangle((CANVAS[0] - margin - 66, footer_y - 11, CANVAS[0] - margin, footer_y + 55), fill=VERMILION)
    seal_font = font(HEITI, 24)
    draw.text((CANVAS[0] - margin - 57, footer_y - 4), "平阳", font=seal_font, fill=PAPER)
    draw.text((CANVAS[0] - margin - 57, footer_y + 23), "年画", font=seal_font, fill=PAPER)

    canvas.save(output, format="PNG", optimize=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalog_no", type=int, nargs="?", default=1)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    print(generate(args.catalog_no, args.output))


if __name__ == "__main__":
    main()

