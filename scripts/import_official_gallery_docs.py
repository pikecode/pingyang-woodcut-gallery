#!/usr/bin/env python3
"""Build a staging dataset from the 2026 official Pingyang woodcut documents.

This importer intentionally writes to data/staging only. It does not replace the
currently running Desktop data, because the official corpus contains multiple
source documents, same-title works, and a broader category vocabulary than the
old 55-item test dataset.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import shutil
import subprocess
import struct
import tempfile
import warnings
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = Path("/Users/ompeak/Desktop/aaa/20260803修订版木版年画")
DEFAULT_IMAGE_SOURCE_DIR = None
DEFAULT_OUTPUT = ROOT / "data" / "staging" / "official-artworks.json"
DEFAULT_REPORT = ROOT / "data" / "staging" / "official-import-report.json"
DEFAULT_IMAGE_ROOT = ROOT / "assets" / "official-originals"

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

IMAGE_SIGNATURES = (
    b"\xff\xd8\xff",
    b"\x89PNG\r\n\x1a\n",
    b"II*\x00",
    b"MM\x00*",
)

SOURCE_ORDER = [
    ("main102", "平阳木版年画（102幅）.doc"),
    ("reg20", "平阳木版年画作品登记表20.docx"),
    ("reg42", "平阳木版年画作品登记表42张.docx"),
    ("reg54", "平阳木版年画作品登记表54张.docx"),
    ("regaa54", "平阳木版年画作品登记表aa54.docx"),
]


@dataclass
class SourceFile:
    code: str
    path: Path


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_dimension(value: str) -> dict[str, Any] | None:
    raw = clean_text(value).replace("＊", "*").replace("×", "x").replace("X", "x")
    match = re.fullmatch(r"([0-9.]+)\s*[x*]\s*([0-9.]+)", raw)
    if not match:
        return None
    return {
        "width": float(match.group(1)),
        "height": float(match.group(2)),
        "unit": "cm",
        "unitVerified": False,
        "sourceText": value,
    }


def period_code(value: str) -> str:
    raw = value.strip()
    if "民国" in raw:
        return "republic"
    if "现代" in raw:
        return "modern"
    if "清" in raw:
        return "qing"
    if not raw:
        return "unknown"
    return "other"


def make_category_code(name: str, category_index: dict[str, int]) -> str:
    if not name:
        return "uncategorized"
    if name not in category_index:
        category_index[name] = len(category_index) + 1
    return f"official-cat-{category_index[name]:03d}"


def image_metadata(payload: bytes) -> dict[str, Any]:
    try:
        from io import BytesIO

        with Image.open(BytesIO(payload)) as image:
            return {
                "format": image.format,
                "mimeType": Image.MIME.get(image.format or "", "application/octet-stream"),
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "frameCount": getattr(image, "n_frames", 1),
            }
    except Exception as exc:  # pragma: no cover - defensive metadata fallback
        return {"format": None, "mimeType": "application/octet-stream", "error": str(exc)}


def textutil_doc_text(path: Path) -> str:
    result = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def extract_word_text_from_ole(document: Any) -> str:
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
                        "frameCount": getattr(image, "n_frames", 1),
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


def extract_ole_images(document: Any, records: list[dict[str, Any]], image_root: Path | None) -> list[list[dict[str, Any]]]:
    image_groups: list[list[dict[str, Any]]] = [[] for _ in records]
    if not document.exists("Data"):
        for record in records:
            record["issues"].append("main_doc_data_stream_missing")
        return image_groups

    stream = document.openstream("Data")
    stream_size = stream.size
    record_cursor = 0
    image_in_record = 0
    offset = 0
    block_index = 0
    expected = sum(record["_imageAnchorCount"] for record in records)

    while offset < stream_size:
        while record_cursor < len(records) and image_in_record >= records[record_cursor]["_imageAnchorCount"]:
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
        role = "primary" if record["_imageAnchorCount"] == 1 else f"part-{order}"
        output_path = None
        if image_root is not None:
            output = image_root / record["sourceCode"] / f"{record['sourceCatalogNo']:03d}-{order:02d}-{role}{extension}"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(payload)
            output_path = output.relative_to(ROOT).as_posix()

        image_groups[record_cursor].append(
            {
                "role": role,
                "sourceStreamOffset": offset,
                "sourceBlockIndex": block_index + 1,
                "sourceBlockBytes": block_size,
                "path": output_path,
                "bytes": len(payload),
                "sha256": sha256_bytes(payload),
                "format": main["format"],
                "mimeType": mime_type,
                "width": main["width"],
                "height": main["height"],
                "mode": main["mode"],
                "frameCount": main["frameCount"],
            }
        )
        offset += block_size
        block_index += 1
        image_in_record += 1

    if block_index != expected:
        raise ValueError(f"Found {block_index} image blocks for {expected} text anchors")
    return image_groups


def parse_main_doc_pages(source: SourceFile, text: str) -> list[dict[str, Any]]:
    pages = [page.strip("\r") for page in text.split("\x0c") if page.strip()]
    records: list[dict[str, Any]] = []
    for record_index, page in enumerate(pages, 1):
        lines = [line for line in page.split("\r") if line.strip()]
        heading = re.match(r"^(\d{1,3})(.+)$", lines[0]) if lines else None
        if not heading:
            raise ValueError(f"Cannot parse main document block {record_index}: {lines[:3]!r}")

        catalog_no = int(heading.group(1))
        title = heading.group(2).strip()
        summary_parts = lines[1].split(maxsplit=1) if len(lines) > 1 else []
        summary_theme = summary_parts[0] if summary_parts else ""
        summary_form = summary_parts[1] if len(summary_parts) > 1 else ""
        summary_meta = lines[2] if len(lines) > 2 else ""
        summary_period, _, summary_collection = summary_meta.partition(" ")
        description = "".join(lines[3:]).split("\x01", 1)[0].strip()

        def table_field(*names: str) -> str:
            for name in names:
                match = re.search(re.escape(name) + r"\x07([^\x07]*)", page)
                if match:
                    return " ".join(match.group(1).split())
            return ""

        image_count = page.count("\x01")
        records.append(
            {
                "sourceCode": source.code,
                "sourceFile": source.path.name,
                "sourceKind": "word97-main-catalog",
                "sourceRecordIndex": record_index,
                "sourceCatalogNo": catalog_no,
                "title": title,
                "periodRaw": table_field("年代") or summary_period,
                "sourceCategory": table_field("类别") or summary_form,
                "summaryThemeRaw": summary_theme,
                "summaryFormRaw": summary_form,
                "dimensionsRaw": table_field("规格（cm）", "规格"),
                "collection": table_field("馆藏") or summary_collection.removesuffix("藏"),
                "description": description,
                "notes": "",
                "images": [],
                "issues": [],
                "_imageAnchorCount": image_count,
            }
        )
    return records


def parse_main_doc_fallback(source: SourceFile) -> list[dict[str, Any]]:
    text = textutil_doc_text(source.path)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    headings: list[tuple[int, str, int]] = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{1,3})([^\d×*].+)$", line)
        if not match:
            continue
        catalog_no = int(match.group(1))
        title = match.group(2).strip()
        if 1 <= catalog_no <= 150 and len(title) <= 30:
            headings.append((catalog_no, title, index))

    records: list[dict[str, Any]] = []
    for record_index, (catalog_no, title, start) in enumerate(headings, 1):
        end = headings[record_index][2] if record_index < len(headings) else len(lines)
        block = lines[start + 1 : end]

        def after(label: str) -> str:
            try:
                position = block.index(label)
            except ValueError:
                return ""
            return block[position + 1] if position + 1 < len(block) else ""

        category_position = block.index("类别") if "类别" in block else len(block)
        description = "".join(block[2:category_position]) if len(block) > 2 else ""
        summary_parts = block[0].split(maxsplit=1) if block else []
        summary_theme = summary_parts[0] if summary_parts else ""
        summary_form = summary_parts[1] if len(summary_parts) > 1 else ""
        summary_meta = block[1] if len(block) > 1 else ""
        summary_period, _, summary_collection = summary_meta.partition(" ")

        records.append(
            {
                "sourceCode": source.code,
                "sourceFile": source.path.name,
                "sourceKind": "word97-main-catalog",
                "sourceRecordIndex": record_index,
                "sourceCatalogNo": catalog_no,
                "title": title,
                "periodRaw": after("年代") or summary_period,
                "sourceCategory": after("类别") or summary_form,
                "summaryThemeRaw": summary_theme,
                "summaryFormRaw": summary_form,
                "dimensionsRaw": after("规格（cm）") or after("规格"),
                "collection": after("馆藏") or summary_collection.removesuffix("藏"),
                "description": description,
                "notes": "",
                "images": [],
                "issues": ["main_doc_images_not_extracted"],
                "_imageAnchorCount": 0,
            }
        )
    return records


def parse_main_doc(
    source: SourceFile,
    image_root: Path | None,
    image_source_path: Path | None = None,
) -> list[dict[str, Any]]:
    try:
        import olefile  # type: ignore[import-not-found]
    except ImportError:
        if image_root is not None:
            raise RuntimeError(
                "Extracting images from 平阳木版年画（102幅）.doc requires olefile. "
                "Run: python3 -m pip install -r requirements.txt"
            )
        return parse_main_doc_fallback(source)

    document = olefile.OleFileIO(source.path)
    records = parse_main_doc_pages(source, extract_word_text_from_ole(document))
    actual_image_source = image_source_path or source.path
    try:
        image_document = olefile.OleFileIO(actual_image_source)
        image_source = SourceFile(source.code, actual_image_source)
        image_records = parse_main_doc_pages(image_source, extract_word_text_from_ole(image_document))
        image_groups = extract_ole_images(image_document, image_records, image_root)
        image_by_catalog = {
            image_record["sourceCatalogNo"]: (image_record, images)
            for image_record, images in zip(image_records, image_groups)
        }
        for record in records:
            image_record, images = image_by_catalog.get(record["sourceCatalogNo"], ({}, []))
            record["images"] = images
            record["imageSource"] = {
                "document": actual_image_source.name,
                "documentCode": source.code,
                "recordIndex": image_record.get("sourceRecordIndex"),
                "catalogNo": image_record.get("sourceCatalogNo"),
                "title": image_record.get("title"),
                "label": (
                    f"{actual_image_source.name} 第 {image_record.get('sourceCatalogNo')} 条"
                    if image_record.get("sourceCatalogNo")
                    else f"{actual_image_source.name}"
                ),
            }
            if image_record and image_record.get("title") != record["title"]:
                record["issues"].append("image_source_title_differs")
            if not images:
                record["issues"].append("missing_image")
    except Exception as exc:
        for record in records:
            record["images"] = []
            record["imageSource"] = {
                "document": actual_image_source.name,
                "documentCode": source.code,
                "recordIndex": None,
                "catalogNo": record["sourceCatalogNo"],
                "title": None,
                "label": actual_image_source.name,
            }
            record["issues"].append("main_doc_images_not_extracted")
            record["issues"].append(f"main_doc_image_error:{exc}")

    for record in records:
        record.pop("_imageAnchorCount", None)
    return records


def docx_relationships(zip_handle: zipfile.ZipFile) -> dict[str, str]:
    rel_path = "word/_rels/document.xml.rels"
    if rel_path not in zip_handle.namelist():
        return {}
    root = ET.fromstring(zip_handle.read(rel_path))
    relationships: dict[str, str] = {}
    for rel in root.findall("rel:Relationship", NS):
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target", "")
        if not rel_id or not target:
            continue
        if target.startswith("media/"):
            relationships[rel_id] = f"word/{target}"
    return relationships


def cell_text(element: ET.Element) -> str:
    return "".join((text.text or "") for text in element.findall(".//w:t", NS)).strip()


def table_images(table: ET.Element, rels: dict[str, str]) -> list[str]:
    paths: list[str] = []
    for blip in table.findall(".//a:blip", NS):
        rel_id = blip.attrib.get(f"{{{NS['r']}}}embed")
        target = rels.get(rel_id or "")
        if target and target not in paths:
            paths.append(target)
    return paths


def docx_record_tables(path: Path) -> list[dict[str, Any]]:
    tables: list[dict[str, Any]] = []
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
        rels = docx_relationships(zf)
        for table in root.findall(".//w:tbl", NS):
            rows: list[list[str]] = []
            for tr in table.findall("./w:tr", NS):
                cells = [cell_text(tc) for tc in tr.findall("./w:tc", NS)]
                if cells:
                    rows.append(cells)
            if len(rows) < 2 or not rows[0] or "作品名称" not in rows[0][0]:
                continue

            values = rows[1]
            title = values[0].strip() if len(values) > 0 else ""
            tables.append(
                {
                    "rows": rows,
                    "title": title,
                    "periodRaw": values[1].strip() if len(values) > 1 else "",
                    "sourceCategory": values[2].strip() if len(values) > 2 else "",
                    "dimensionsRaw": values[3].strip() if len(values) > 3 else "",
                    "imageArchivePaths": table_images(table, rels),
                }
            )
    return tables


def align_image_tables(text_tables: list[dict[str, Any]], image_tables: list[dict[str, Any]]) -> dict[int, int]:
    text_titles = [table["title"] for table in text_tables]
    image_titles = [table["title"] for table in image_tables]
    matcher = SequenceMatcher(None, text_titles, image_titles, autojunk=False)
    mapping: dict[int, int] = {}
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag in {"equal", "replace"}:
            for offset in range(min(i2 - i1, j2 - j1)):
                mapping[i1 + offset] = j1 + offset
    return mapping


def parse_docx(
    source: SourceFile,
    image_root: Path | None,
    image_source_path: Path | None = None,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    text_tables = docx_record_tables(source.path)
    actual_image_source = image_source_path or source.path
    image_tables = docx_record_tables(actual_image_source)
    image_mapping = align_image_tables(text_tables, image_tables)

    with zipfile.ZipFile(actual_image_source) as image_zf:
        for text_index, table_data in enumerate(text_tables):
            rows = table_data["rows"]
            record_index = text_index + 1
            title = table_data["title"]
            description = ""
            notes = ""
            for row in rows:
                joined = "".join(row).strip()
                if joined.startswith("作品说明："):
                    description = joined.removeprefix("作品说明：").strip()
                elif joined.startswith("备注："):
                    notes = joined.removeprefix("备注：").strip()

            images: list[dict[str, Any]] = []
            issues: list[str] = []
            image_table_index = image_mapping.get(text_index)
            image_table = image_tables[image_table_index] if image_table_index is not None else None
            if image_table is None:
                issues.append("image_source_record_not_found")
            else:
                if image_table["title"] != title:
                    issues.append("image_source_title_differs")
                for image_index, archive_path in enumerate(image_table["imageArchivePaths"], 1):
                    payload = image_zf.read(archive_path)
                    extension = Path(archive_path).suffix.lower() or ".bin"
                    role = "primary" if image_index == 1 else f"part-{image_index}"
                    extracted_path = None
                    if image_root is not None:
                        output = image_root / source.code / f"{record_index:03d}-{image_index:02d}-{role}{extension}"
                        output.parent.mkdir(parents=True, exist_ok=True)
                        output.write_bytes(payload)
                        extracted_path = output.relative_to(ROOT).as_posix()
                    images.append(
                        {
                            "role": role,
                            "sourceArchivePath": archive_path,
                            "sourceDocument": actual_image_source.name,
                            "sourceRecordIndex": image_table_index + 1,
                            "sourceTitle": image_table["title"],
                            "path": extracted_path,
                            "bytes": len(payload),
                            "sha256": sha256_bytes(payload),
                            **image_metadata(payload),
                        }
                    )

            records.append(
                {
                    "sourceCode": source.code,
                    "sourceFile": source.path.name,
                    "sourceKind": "docx-registration-table",
                    "sourceRecordIndex": record_index,
                    "sourceCatalogNo": None,
                    "title": title,
                    "periodRaw": table_data["periodRaw"],
                    "sourceCategory": table_data["sourceCategory"],
                    "summaryThemeRaw": "",
                    "summaryFormRaw": "",
                    "dimensionsRaw": table_data["dimensionsRaw"],
                    "collection": "",
                    "description": description,
                    "notes": notes,
                    "images": images,
                    "imageSource": {
                        "document": actual_image_source.name,
                        "documentCode": source.code,
                        "recordIndex": image_table_index + 1 if image_table_index is not None else None,
                        "catalogNo": None,
                        "title": image_table["title"] if image_table else None,
                        "label": (
                            f"{actual_image_source.name} 第 {image_table_index + 1} 条"
                            if image_table_index is not None
                            else actual_image_source.name
                        ),
                    },
                    "issues": issues,
                }
            )
    return records


def normalize_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    category_index: dict[str, int] = {}
    normalized: list[dict[str, Any]] = []
    title_counter = Counter(record["title"] for record in records)
    title_group_index = {
        title: group_index
        for group_index, title in enumerate(
            sorted(title for title, count in title_counter.items() if title and count > 1),
            1,
        )
    }

    for global_index, record in enumerate(records, 1):
        category = record["sourceCategory"] or record["summaryThemeRaw"] or "未分类"
        source_code = record["sourceCode"]
        source_record_index = record["sourceRecordIndex"]
        source_no_for_slug = record["sourceCatalogNo"] or source_record_index
        slug = f"official-{source_code}-{source_no_for_slug:03d}"
        same_title_group = (
            f"same-title-{title_group_index[record['title']]:03d}"
            if record["title"] in title_group_index
            else None
        )
        dimensions = parse_dimension(record["dimensionsRaw"])
        issues = list(record["issues"])
        if not record["title"]:
            issues.append("missing_title")
        if not record["description"]:
            issues.append("missing_description")
        if not dimensions:
            issues.append("unparsed_dimensions")
        if not record["images"]:
            issues.append("missing_image")

        normalized.append(
            {
                "officialNo": global_index,
                "catalogNo": global_index,
                "slug": slug,
                "title": record["title"],
                "category": category,
                "content": record["description"],
                "sameTitleGroup": same_title_group,
                "sameTitleCount": title_counter[record["title"]],
                "aliases": [],
                "theme": {
                    "code": make_category_code(category, category_index),
                    "name": category,
                },
                "sourceCategory": record["sourceCategory"],
                "form": {"code": make_category_code(record["sourceCategory"], category_index), "name": record["sourceCategory"]}
                if record["sourceCategory"]
                else None,
                "material": None,
                "technique": None,
                "subtype": None,
                "period": {
                    "code": period_code(record["periodRaw"]),
                    "label": record["periodRaw"] or "未标注",
                },
                "dimensions": dimensions
                or {
                    "width": None,
                    "height": None,
                    "unit": "cm",
                    "unitVerified": False,
                    "sourceText": record["dimensionsRaw"],
                },
                "collection": record["collection"],
                "description": record["description"],
                "notes": record["notes"],
                "editorialStatus": "needs_review" if issues else "staged",
                "images": record["images"],
                "source": {
                    "code": record["sourceCode"],
                    "file": record["sourceFile"],
                    "kind": record["sourceKind"],
                    "recordIndex": record["sourceRecordIndex"],
                    "catalogNo": record["sourceCatalogNo"],
                },
                "sourceRef": {
                    "document": record["sourceFile"],
                    "documentCode": record["sourceCode"],
                    "recordIndex": record["sourceRecordIndex"],
                    "catalogNo": record["sourceCatalogNo"],
                    "label": (
                        f"{record['sourceFile']} 第 {record['sourceCatalogNo']} 条"
                        if record["sourceCatalogNo"]
                        else f"{record['sourceFile']} 第 {record['sourceRecordIndex']} 条"
                    ),
                },
                "imageSourceRef": record.get("imageSource")
                or {
                    "document": record["sourceFile"],
                    "documentCode": record["sourceCode"],
                    "recordIndex": record["sourceRecordIndex"],
                    "catalogNo": record["sourceCatalogNo"],
                    "title": record["title"],
                    "label": (
                        f"{record['sourceFile']} 第 {record['sourceCatalogNo']} 条"
                        if record["sourceCatalogNo"]
                        else f"{record['sourceFile']} 第 {record['sourceRecordIndex']} 条"
                    ),
                },
                "sourceFields": {
                    "periodRaw": record["periodRaw"],
                    "sourceCategory": record["sourceCategory"],
                    "summaryThemeRaw": record["summaryThemeRaw"],
                    "summaryFormRaw": record["summaryFormRaw"],
                    "dimensionsRaw": record["dimensionsRaw"],
                    "collection": record["collection"],
                },
                "issues": sorted(set(issues)),
            }
        )

    same_title_groups = {
        title: [
            {
                "slug": item["slug"],
                "source": item["source"]["code"],
                "recordIndex": item["source"]["recordIndex"],
                "catalogNo": item["source"]["catalogNo"],
                "category": item["sourceCategory"],
            }
            for item in normalized
            if item["title"] == title
        ]
        for title, count in title_counter.items()
        if count > 1 and title
    }
    report = {
        "recordCount": len(normalized),
        "sourceCounts": dict(Counter(item["source"]["code"] for item in normalized)),
        "categoryCounts": dict(Counter(item["theme"]["name"] for item in normalized)),
        "imageCount": sum(len(item["images"]) for item in normalized),
        "recordsWithoutImages": [item["slug"] for item in normalized if not item["images"]],
        "issueCounts": dict(Counter(issue for item in normalized for issue in item["issues"])),
        "sameTitleGroupCount": len(same_title_groups),
        "sameTitleRecordCount": sum(len(items) for items in same_title_groups.values()),
        "sameTitleGroups": same_title_groups,
    }
    return normalized, report


def resolve_sources(source_dir: Path) -> list[SourceFile]:
    sources: list[SourceFile] = []
    for code, filename in SOURCE_ORDER:
        path = source_dir / filename
        if not path.exists():
            raise FileNotFoundError(path)
        sources.append(SourceFile(code, path))
    return sources


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument(
        "--image-source-dir",
        type=Path,
        default=DEFAULT_IMAGE_SOURCE_DIR,
        help="Optional directory with same-structured documents that contain higher-resolution images.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--image-root", type=Path, default=DEFAULT_IMAGE_ROOT)
    parser.add_argument(
        "--extract-images",
        action="store_true",
        help="Extract original images from docx files into assets/official-originals.",
    )
    args = parser.parse_args()

    source_dir = args.source_dir.expanduser().resolve()
    image_source_dir = (
        args.image_source_dir.expanduser().resolve()
        if args.image_source_dir is not None
        else source_dir
    )
    image_root = args.image_root.resolve() if args.extract_images else None
    if image_root is not None:
        if image_root.exists():
            shutil.rmtree(image_root)
        image_root.mkdir(parents=True, exist_ok=True)

    source_files = resolve_sources(source_dir)
    image_source_files = {source.code: source.path for source in resolve_sources(image_source_dir)}
    records: list[dict[str, Any]] = []
    source_meta = []
    image_source_meta = []
    for source in source_files:
        image_source_path = image_source_files[source.code]
        source_meta.append(
            {
                "code": source.code,
                "file": source.path.name,
                "path": str(source.path),
                "bytes": source.path.stat().st_size,
                "sha256": sha256_file(source.path),
            }
        )
        image_source_meta.append(
            {
                "code": source.code,
                "file": image_source_path.name,
                "path": str(image_source_path),
                "bytes": image_source_path.stat().st_size,
                "sha256": sha256_file(image_source_path),
            }
        )
        if source.path.suffix.lower() == ".doc":
            records.extend(parse_main_doc(source, image_root, image_source_path))
        elif source.path.suffix.lower() == ".docx":
            records.extend(parse_docx(source, image_root, image_source_path))
        else:
            raise ValueError(f"Unsupported source type: {source.path}")

    artworks, report = normalize_records(records)
    imported_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "schemaVersion": 1,
        "dataset": "20260803-official-woodcut-documents",
        "importedAt": imported_at,
        "sourceDirectory": str(source_dir),
        "imageSourceDirectory": str(image_source_dir),
        "sourceDocuments": source_meta,
        "imageSourceDocuments": image_source_meta,
        "artworkCount": len(artworks),
        "artworks": artworks,
    }
    report = {
        "importedAt": imported_at,
        "sourceDirectory": str(source_dir),
        "imageSourceDirectory": str(image_source_dir),
        **report,
    }

    json_dump(args.output, payload)
    json_dump(args.report, report)
    print(f"Wrote {len(artworks)} records to {args.output}")
    print(f"Wrote report to {args.report}")
    if args.extract_images:
        print(f"Extracted original images under {args.image_root}")


if __name__ == "__main__":
    main()
