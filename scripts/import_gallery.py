#!/usr/bin/env python3
"""Extract the Pingyang catalog, original images, SQLite DB, and JSON exports."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sqlite3
import struct
import tempfile
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import olefile
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "平阳木版年画.doc"
DEFAULT_IMAGES = ROOT / "assets" / "originals"
DEFAULT_DATABASE = ROOT / "data" / "gallery.sqlite"
DEFAULT_RAW_JSON = ROOT / "data" / "raw" / "artworks.json"
DEFAULT_EXPORT_JSON = ROOT / "data" / "exports" / "artworks.json"
DEFAULT_IMAGE_MANIFEST = ROOT / "data" / "exports" / "image-manifest.json"
SCHEMA_PATH = ROOT / "data" / "schema.sql"

THEMES = {
    "戏曲类": ("opera", "戏曲"),
    "神祇类": ("deity", "神祇"),
    "吉祥类": ("auspicious", "吉祥"),
    "故事类": ("story", "故事"),
}
FORMS = {
    "灯画": ("lantern-picture", "灯画"),
    "门神": ("door-god", "门神"),
    "门画": ("door-picture", "门画"),
}
MATERIALS = {"拂尘纸": ("fuchen-paper", "拂尘纸")}
TECHNIQUES = {"版印手绘": ("woodblock-hand-painted", "版印手绘")}

TEXT_ISSUES = {
    2: [("description", "name_consistency", "正文先写“冯彦”，后写“冯义”，人物名需核对。")],
    15: [("description", "broken_sentence", "“许仙头右手”语句残缺；“讲诉”疑为“讲述”。")],
    26: [("description", "broken_sentence", "“唐寅立于双臂向右平端”语句残缺。")],
    32: [("description", "broken_sentence", "“身旁为化作老妖精”缺少中心词。")],
    89: [("description", "suspected_typo", "“乌沙帽”疑为“乌纱帽”。")],
    98: [("description", "citation_check", "“应勋的《风俗演义》”疑为“应劭《风俗通义》”，需核史料。")],
    100: [("description", "broken_sentence", "“执锏持枪乌骓马上”语序残缺。")],
    102: [("description", "suspected_typo", "“乌沙”疑为“乌纱”。")],
}

IMAGE_SIGNATURES = (
    b"\xff\xd8\xff",
    b"\x89PNG\r\n\x1a\n",
    b"II*\x00",
    b"MM\x00*",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(payload)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def extract_word_text(document: olefile.OleFileIO) -> str:
    word = document.openstream("WordDocument").read()
    flags = struct.unpack_from("<H", word, 10)[0]
    table_name = "1Table" if flags & 0x0200 else "0Table"
    table = document.openstream(table_name).read()

    position = 32
    csw = struct.unpack_from("<H", word, position)[0]
    position += 2 + csw * 2
    cslw = struct.unpack_from("<H", word, position)[0]
    position += 2 + cslw * 4
    pair_count = struct.unpack_from("<H", word, position)[0]
    position += 2
    if pair_count <= 33:
        raise ValueError("Word FIB does not contain an fcClx entry")

    fc_clx, lcb_clx = struct.unpack_from("<II", word, position + 33 * 8)
    clx = table[fc_clx : fc_clx + lcb_clx]
    cursor = 0
    piece_table = None
    while cursor < len(clx):
        tag = clx[cursor]
        cursor += 1
        if tag == 0x01:
            length = struct.unpack_from("<H", clx, cursor)[0]
            cursor += 2 + length
        elif tag == 0x02:
            length = struct.unpack_from("<I", clx, cursor)[0]
            cursor += 4
            piece_table = clx[cursor : cursor + length]
            break
        else:
            raise ValueError(f"Unsupported CLX record tag: {tag:#x}")
    if piece_table is None:
        raise ValueError("No piece table found in Word document")

    piece_count = (len(piece_table) - 4) // 12
    cp_bytes = (piece_count + 1) * 4
    codepoints = struct.unpack_from(f"<{piece_count + 1}I", piece_table, 0)
    parts: list[str] = []
    for index in range(piece_count):
        char_count = codepoints[index + 1] - codepoints[index]
        pcd_offset = cp_bytes + index * 8
        encoded_fc = struct.unpack_from("<I", piece_table, pcd_offset + 2)[0]
        compressed = bool(encoded_fc & 0x40000000)
        file_offset = encoded_fc & 0x3FFFFFFF
        if compressed:
            file_offset //= 2
            raw = word[file_offset : file_offset + char_count]
            parts.append(raw.decode("gb18030", errors="replace"))
        else:
            raw = word[file_offset : file_offset + char_count * 2]
            parts.append(raw.decode("utf-16le", errors="replace"))
    return "".join(parts)


def extract_aliases(description: str) -> list[str]:
    aliases: list[str] = []
    match = re.match(r"又名([^。]+?)[。，为]", description)
    if match:
        aliases.extend(re.findall(r"《([^》]+)》", match.group(1)))
    match = re.match(r"又称([^，。]+)", description)
    if match:
        aliases.append(match.group(1).strip("《》"))
    return list(dict.fromkeys(alias for alias in aliases if alias))


def parse_records(text: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for record_index, page in enumerate(text.split("\x0c"), 1):
        page = page.strip("\r")
        if not page:
            continue
        lines = page.split("\r")
        heading = re.match(r"(\d+)(.+)", lines[0])
        if not heading or len(lines) < 4:
            raise ValueError(f"Cannot parse record {record_index}: {lines[:4]!r}")

        summary_parts = lines[1].split(maxsplit=1)
        summary_theme = summary_parts[0]
        summary_form = summary_parts[1] if len(summary_parts) == 2 else ""
        summary_metadata = lines[2]
        summary_period, _, summary_collection = summary_metadata.partition(" ")
        summary_collection = summary_collection.removesuffix("藏").strip()
        description = "".join(lines[3:]).split("\x01", 1)[0].strip()

        def table_field(name: str) -> str:
            match = re.search(re.escape(name) + r"\x07([^\x07]*)", page)
            if not match:
                raise ValueError(f"Missing {name} in catalog number {heading.group(1)}")
            return " ".join(match.group(1).split())

        dimension_raw = table_field("规格")
        dimension = re.fullmatch(r"([0-9.]+)×([0-9.]+)", dimension_raw)
        if not dimension:
            raise ValueError(f"Unsupported dimension: {dimension_raw}")

        records.append(
            {
                "record_index": record_index,
                "source_page": record_index,
                "catalog_no": int(heading.group(1)),
                "slug": f"py-{int(heading.group(1)):03d}",
                "title": heading.group(2).strip(),
                "summary_theme_raw": summary_theme,
                "summary_form_raw": summary_form,
                "summary_period_raw": summary_period,
                "summary_collection_raw": summary_collection,
                "description": description,
                "table_category_raw": table_field("类别"),
                "period_raw": table_field("年代"),
                "dimension_raw": dimension_raw,
                "width_value": float(dimension.group(1)),
                "height_value": float(dimension.group(2)),
                "table_collection_raw": table_field("馆藏"),
                "image_count": page.count("\x01"),
                "aliases": extract_aliases(description),
            }
        )
    return records


def normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(record)
    normalized["theme"] = THEMES[record["summary_theme_raw"]]

    form_raw = record["summary_form_raw"]
    category_raw = record["table_category_raw"]
    normalized["form"] = FORMS.get(form_raw) or FORMS.get(category_raw)
    normalized["material"] = MATERIALS.get(form_raw) or MATERIALS.get(category_raw)
    normalized["technique"] = ("版印手绘" in record["period_raw"] and TECHNIQUES["版印手绘"]) or None
    normalized["subtype_label"] = category_raw if category_raw == "天官门神" else None

    period_raw = record["period_raw"]
    if "早期" in period_raw:
        normalized["period_code"] = "early-qing"
        normalized["period_label"] = "清早期"
    elif period_raw == "现代":
        normalized["period_code"] = "modern"
        normalized["period_label"] = "现代"
    else:
        normalized["period_code"] = "qing"
        normalized["period_label"] = "清代"
    return normalized


def valid_image_candidates(block: bytes) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[int] = set()
    for signature in IMAGE_SIGNATURES:
        cursor = 0
        while True:
            offset = block.find(signature, cursor)
            if offset < 0:
                break
            cursor = offset + 1
            if offset in seen:
                continue
            seen.add(offset)
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", UserWarning)
                    image = Image.open(io.BytesIO(block[offset:]))
                    candidate = {
                        "offset": offset,
                        "format": image.format,
                        "width": image.width,
                        "height": image.height,
                        "mode": image.mode,
                        "frame_count": getattr(image, "n_frames", 1),
                    }
                    image.verify()
                candidates.append(candidate)
            except Exception:
                continue
    return candidates


def image_payload(block: bytes, candidate: dict[str, Any]) -> tuple[bytes, str, str]:
    start = candidate["offset"]
    image_format = candidate["format"]
    if image_format in {"JPEG", "MPO"}:
        end = block.rfind(b"\xff\xd9", start)
        if end < 0:
            raise ValueError("JPEG image does not contain an EOI marker")
        payload = block[start : end + 2]
        extension = ".mpo" if image_format == "MPO" else ".jpg"
        mime_type = "image/jpeg"
    elif image_format == "PNG":
        iend = block.find(b"IEND", start)
        if iend < 0:
            raise ValueError("PNG image does not contain an IEND chunk")
        payload = block[start : iend + 8]
        extension = ".png"
        mime_type = "image/png"
    elif image_format == "TIFF":
        payload = block[start:]
        extension = ".tif"
        mime_type = "image/tiff"
    else:
        raise ValueError(f"Unsupported image format: {image_format}")
    return payload, extension, mime_type


def extract_images(
    document: olefile.OleFileIO, records: list[dict[str, Any]], images_root: Path
) -> list[dict[str, Any]]:
    stream = document.openstream("Data")
    stream_size = stream.size
    image_rows: list[dict[str, Any]] = []
    record_cursor = 0
    image_in_record = 0
    offset = 0
    block_index = 0

    while offset < stream_size:
        while record_cursor < len(records) and image_in_record >= records[record_cursor]["image_count"]:
            record_cursor += 1
            image_in_record = 0
        if record_cursor >= len(records):
            raise ValueError("Data stream contains more image blocks than text anchors")

        stream.seek(offset)
        header = stream.read(4)
        if len(header) != 4:
            raise ValueError(f"Truncated image block header at {offset}")
        block_size = struct.unpack("<I", header)[0]
        if block_size < 32 or offset + block_size > stream_size:
            raise ValueError(f"Invalid image block size {block_size} at {offset}")
        stream.seek(offset)
        block = stream.read(block_size)

        candidates = valid_image_candidates(block)
        if not candidates:
            raise ValueError(f"No valid image found in data block {block_index + 1}")
        main = max(candidates, key=lambda item: item["width"] * item["height"])
        payload, extension, mime_type = image_payload(block, main)

        record = records[record_cursor]
        order = image_in_record + 1
        role = "primary" if record["image_count"] == 1 else f"part-{order}"
        output_path = images_root / record["slug"] / f"{order:02d}-{role}{extension}"
        try:
            relative_path = output_path.relative_to(ROOT)
        except ValueError:
            relative_path = output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(payload)

        image_rows.append(
            {
                "catalog_no": record["catalog_no"],
                "role": role,
                "sort_order": order,
                "storage_path": relative_path.as_posix(),
                "source_block_index": block_index + 1,
                "source_stream_offset": offset,
                "source_block_bytes": block_size,
                "source_payload_offset": main["offset"],
                "byte_size": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "format": main["format"],
                "mime_type": mime_type,
                "pixel_width": main["width"],
                "pixel_height": main["height"],
                "color_mode": main["mode"],
                "frame_count": main["frame_count"],
                "alt_text": record["title"],
            }
        )
        offset += block_size
        block_index += 1
        image_in_record += 1

    expected = sum(record["image_count"] for record in records)
    if block_index != expected:
        raise ValueError(f"Found {block_index} image blocks for {expected} text anchors")
    return image_rows


def seed_lookups(connection: sqlite3.Connection) -> dict[str, dict[str, int]]:
    lookup_ids: dict[str, dict[str, int]] = {}
    for table, values in (
        ("themes", THEMES.values()),
        ("forms", FORMS.values()),
        ("materials", MATERIALS.values()),
        ("techniques", TECHNIQUES.values()),
    ):
        for code, name in values:
            connection.execute(f"INSERT INTO {table}(code, name) VALUES (?, ?)", (code, name))
        lookup_ids[table] = {
            row["code"]: row["id"] for row in connection.execute(f"SELECT id, code FROM {table}")
        }
    return lookup_ids


def insert_issue(
    connection: sqlite3.Connection,
    artwork_id: int | None,
    field_name: str,
    issue_code: str,
    severity: str,
    message: str,
) -> None:
    connection.execute(
        """INSERT INTO data_issues(artwork_id, field_name, issue_code, severity, message)
           VALUES (?, ?, ?, ?, ?)""",
        (artwork_id, field_name, issue_code, severity, message),
    )


def build_database(
    database_path: Path,
    source_path: Path,
    records: list[dict[str, Any]],
    images: list[dict[str, Any]],
    imported_at: str,
) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=database_path.parent, suffix=".sqlite", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        connection = sqlite3.connect(temporary)
        connection.row_factory = sqlite3.Row
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        lookup_ids = seed_lookups(connection)
        source_relative = source_path.relative_to(ROOT).as_posix()
        connection.execute(
            """INSERT INTO source_documents(
                   relative_path, sha256, byte_size, format, application, page_count, imported_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                source_relative,
                sha256_file(source_path),
                source_path.stat().st_size,
                "Word 97 OLE Compound Document",
                "WPS Office",
                len(records),
                imported_at,
            ),
        )
        source_id = connection.execute("SELECT id FROM source_documents").fetchone()["id"]
        connection.execute(
            """INSERT INTO collections(name, city, province)
               VALUES ('临汾市平阳木版年画博物馆', '临汾市', '山西省')"""
        )
        collection_id = connection.execute("SELECT id FROM collections").fetchone()["id"]

        artwork_ids: dict[int, int] = {}
        for record in records:
            source_fields = {
                key: record[key]
                for key in (
                    "summary_theme_raw",
                    "summary_form_raw",
                    "summary_period_raw",
                    "summary_collection_raw",
                    "table_category_raw",
                    "period_raw",
                    "dimension_raw",
                    "table_collection_raw",
                )
            }
            cursor = connection.execute(
                """INSERT INTO artworks(
                       catalog_no, slug, title, theme_id, form_id, material_id, technique_id,
                       subtype_label, period_code, period_label, period_raw, summary_period_raw,
                       width_value, height_value, dimension_raw, collection_id, description,
                       summary_theme_raw, summary_form_raw, table_category_raw,
                       summary_collection_raw, table_collection_raw, source_document_id,
                       source_record_index, source_page, image_count, source_fields_json,
                       created_at, updated_at
                   ) VALUES (
                       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                       ?, ?, ?, ?, ?
                   )""",
                (
                    record["catalog_no"],
                    record["slug"],
                    record["title"],
                    lookup_ids["themes"][record["theme"][0]],
                    lookup_ids["forms"].get(record["form"][0]) if record["form"] else None,
                    lookup_ids["materials"].get(record["material"][0]) if record["material"] else None,
                    lookup_ids["techniques"].get(record["technique"][0]) if record["technique"] else None,
                    record["subtype_label"],
                    record["period_code"],
                    record["period_label"],
                    record["period_raw"],
                    record["summary_period_raw"],
                    record["width_value"],
                    record["height_value"],
                    record["dimension_raw"],
                    collection_id,
                    record["description"],
                    record["summary_theme_raw"],
                    record["summary_form_raw"],
                    record["table_category_raw"],
                    record["summary_collection_raw"],
                    record["table_collection_raw"],
                    source_id,
                    record["record_index"],
                    record["source_page"],
                    record["image_count"],
                    json.dumps(source_fields, ensure_ascii=False),
                    imported_at,
                    imported_at,
                ),
            )
            artwork_id = cursor.lastrowid
            artwork_ids[record["catalog_no"]] = artwork_id
            for alias in record["aliases"]:
                connection.execute(
                    "INSERT INTO artwork_aliases(artwork_id, alias) VALUES (?, ?)",
                    (artwork_id, alias),
                )

            if record["summary_form_raw"] != record["table_category_raw"]:
                insert_issue(
                    connection,
                    artwork_id,
                    "classification",
                    "source_labels_differ",
                    "warning",
                    f"摘要形制为“{record['summary_form_raw']}”，表格类别为“{record['table_category_raw']}”。",
                )
            if "版印手绘" in record["period_raw"]:
                insert_issue(
                    connection,
                    artwork_id,
                    "period_raw",
                    "field_overloaded",
                    "warning",
                    "原年代字段同时包含年代与技法“版印手绘”，已拆分但保留原值。",
                )
            if record["summary_period_raw"] == "清" and record["period_code"] == "modern":
                insert_issue(
                    connection,
                    artwork_id,
                    "period",
                    "source_conflict",
                    "error",
                    "摘要年代为“清”，表格年代为“现代”。规范值暂采用表格值，需人工确认。",
                )
            for field_name, issue_code, message in TEXT_ISSUES.get(record["catalog_no"], []):
                insert_issue(connection, artwork_id, field_name, issue_code, "warning", message)

        for image in images:
            connection.execute(
                """INSERT INTO artwork_images(
                       artwork_id, role, sort_order, storage_path, source_block_index,
                       source_stream_offset, source_block_bytes, source_payload_offset,
                       byte_size, sha256, format, mime_type, pixel_width, pixel_height,
                       color_mode, frame_count, alt_text
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    artwork_ids[image["catalog_no"]],
                    image["role"],
                    image["sort_order"],
                    image["storage_path"],
                    image["source_block_index"],
                    image["source_stream_offset"],
                    image["source_block_bytes"],
                    image["source_payload_offset"],
                    image["byte_size"],
                    image["sha256"],
                    image["format"],
                    image["mime_type"],
                    image["pixel_width"],
                    image["pixel_height"],
                    image["color_mode"],
                    image["frame_count"],
                    image["alt_text"],
                ),
            )

        insert_issue(
            connection,
            None,
            "catalog_no",
            "number_range_gap",
            "warning",
            "源文档编号从 39 跳至 87；40–86 未包含在当前文档中。",
        )
        insert_issue(
            connection,
            None,
            "dimension_unit",
            "unit_not_stated",
            "warning",
            "源文档规格未注明单位；数据库暂按厘米存储且 unit_verified=0。",
        )
        connection.commit()
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")
        connection.close()
        os.replace(temporary, database_path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def frontend_export(records: list[dict[str, Any]], images: list[dict[str, Any]]) -> dict[str, Any]:
    images_by_catalog: dict[int, list[dict[str, Any]]] = {}
    for image in images:
        images_by_catalog.setdefault(image["catalog_no"], []).append(image)
    artworks = []
    for record in records:
        artworks.append(
            {
                "catalogNo": record["catalog_no"],
                "slug": record["slug"],
                "title": record["title"],
                "aliases": record["aliases"],
                "theme": {"code": record["theme"][0], "name": record["theme"][1]},
                "form": ({"code": record["form"][0], "name": record["form"][1]} if record["form"] else None),
                "material": (
                    {"code": record["material"][0], "name": record["material"][1]}
                    if record["material"]
                    else None
                ),
                "technique": (
                    {"code": record["technique"][0], "name": record["technique"][1]}
                    if record["technique"]
                    else None
                ),
                "subtype": record["subtype_label"],
                "period": {"code": record["period_code"], "label": record["period_label"]},
                "dimensions": {
                    "width": record["width_value"],
                    "height": record["height_value"],
                    "unit": "cm",
                    "unitVerified": False,
                    "sourceText": record["dimension_raw"],
                },
                "collection": "临汾市平阳木版年画博物馆",
                "description": record["description"],
                "editorialStatus": "needs_review",
                "images": [
                    {
                        "role": image["role"],
                        "storageProvider": "local",
                        "path": image["storage_path"],
                        "publicUrl": None,
                        "format": image["format"],
                        "mimeType": image["mime_type"],
                        "width": image["pixel_width"],
                        "height": image["pixel_height"],
                        "bytes": image["byte_size"],
                        "sha256": image["sha256"],
                    }
                    for image in images_by_catalog[record["catalog_no"]]
                ],
            }
        )
    return {"schemaVersion": 1, "artworkCount": len(artworks), "artworks": artworks}


def image_manifest(records: list[dict[str, Any]], images: list[dict[str, Any]]) -> dict[str, Any]:
    titles = {record["catalog_no"]: (record["slug"], record["title"]) for record in records}
    return {
        "schemaVersion": 1,
        "storageProvider": "local",
        "imageCount": len(images),
        "totalBytes": sum(image["byte_size"] for image in images),
        "images": [
            {
                "catalogNo": image["catalog_no"],
                "slug": titles[image["catalog_no"]][0],
                "title": titles[image["catalog_no"]][1],
                "role": image["role"],
                "path": image["storage_path"],
                "publicUrl": None,
                "format": image["format"],
                "mimeType": image["mime_type"],
                "width": image["pixel_width"],
                "height": image["pixel_height"],
                "bytes": image["byte_size"],
                "sha256": image["sha256"],
            }
            for image in images
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--images", type=Path, default=DEFAULT_IMAGES)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--raw-json", type=Path, default=DEFAULT_RAW_JSON)
    parser.add_argument("--export-json", type=Path, default=DEFAULT_EXPORT_JSON)
    parser.add_argument("--image-manifest", type=Path, default=DEFAULT_IMAGE_MANIFEST)
    args = parser.parse_args()

    source = args.source.resolve()
    imported_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    document = olefile.OleFileIO(source)
    try:
        records = [normalize_record(record) for record in parse_records(extract_word_text(document))]
        images = extract_images(document, records, args.images.resolve())
    finally:
        document.close()

    raw_records = [
        {
            key: value
            for key, value in record.items()
            if key not in {"theme", "form", "material", "technique", "period_code", "period_label", "subtype_label"}
        }
        for record in records
    ]
    atomic_json(
        args.raw_json.resolve(),
        {
            "source": {
                "path": source.relative_to(ROOT).as_posix(),
                "sha256": sha256_file(source),
                "byteSize": source.stat().st_size,
            },
            "recordCount": len(raw_records),
            "records": raw_records,
        },
    )
    build_database(args.database.resolve(), source, records, images, imported_at)
    atomic_json(args.export_json.resolve(), frontend_export(records, images))
    atomic_json(args.image_manifest.resolve(), image_manifest(records, images))

    print(f"Imported {len(records)} artworks and {len(images)} original images")
    print(f"Database: {args.database.resolve()}")
    print(f"Frontend JSON: {args.export_json.resolve()}")
    print(f"Image manifest: {args.image_manifest.resolve()}")
    print(f"Original images: {args.images.resolve()}")


if __name__ == "__main__":
    main()
