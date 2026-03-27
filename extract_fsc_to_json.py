#!/usr/bin/env python3
"""
Extract FSC Class Assignment tables from the PDF
AV_FSCClassAssignment._151007.pdf and output as JSON.

Requires: pdfplumber (pip install pdfplumber)
"""

import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber is required. Install it with: pip install pdfplumber")
    sys.exit(1)

PDF_PATH = Path(__file__).resolve().parent.parent / "AV_FSCClassAssignment._151007.pdf"
OUTPUT_PATH = Path(__file__).resolve().parent / "fsc_class_assignments.json"


def clean_text(text: str | None) -> str:
    """Normalize whitespace and strip a string."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def extract_tables(pdf_path: str) -> list[dict]:
    """
    Open the PDF, iterate through every page, pull out rows that match
    the FSC / DESCRIPTION / RIC pattern and return them as dicts.

    The PDF contains two tables (Table 1 sorted by FSC, Table 2 sorted
    alphabetically by description).  We deduplicate by FSC code, keeping
    the first (most complete) RIC code encountered.
    """
    # Map FSC -> {description, ric_acty_code} — first occurrence wins,
    # which is Table 1 with the full RIC codes (e.g. S9I/KZ vs S9I).
    fsc_map: dict[str, dict] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue
            for table in tables:
                for row in table:
                    if row is None or len(row) < 3:
                        continue

                    fsc_raw = clean_text(row[0])
                    desc_raw = clean_text(row[1])
                    ric_raw = clean_text(row[2])

                    # Skip header rows
                    if not fsc_raw or fsc_raw.upper().startswith("FSC"):
                        continue

                    # FSC codes are 4-digit numbers
                    if not re.match(r"^\d{4}$", fsc_raw):
                        continue

                    # Keep first occurrence (Table 1 has the full RIC codes)
                    if fsc_raw not in fsc_map:
                        fsc_map[fsc_raw] = {
                            "fsc": fsc_raw,
                            "description": desc_raw,
                            "ric_acty_code": ric_raw,
                        }

    return list(fsc_map.values())


def build_ric_reference() -> list[dict]:
    """Return the RIC / Activity Code reference legend."""
    return [
        {
            "code": "S9C/AX",
            "description": "Defense Supply Center, Columbus (Construction, formerly Defense Construction Supply Center)",
        },
        {
            "code": "S9E/TX",
            "description": "Defense Supply Center, Columbus (Electronics, formerly Defense Electronics Supply Center)",
        },
        {
            "code": "S9G/CX",
            "description": "Defense Supply Center, Richmond (formerly Defense General Supply Center)",
        },
        {
            "code": "HM8",
            "description": "Defense Supply Center, Richmond (Mapping, Charting and Geodetic Products)",
        },
        {
            "code": "S9T/CY",
            "description": "Defense Supply Center, Philadelphia (Clothing and Textiles, formerly Defense Personnel Support Center)",
        },
        {
            "code": "S9S/S9P",
            "description": "Defense Supply Center, Philadelphia (Subsistence, formerly Defense Personnel Support Center)",
        },
        {
            "code": "S9M/KX",
            "description": "Defense Supply Center, Philadelphia (Medical, formerly Defense Personnel Support Center)",
        },
        {
            "code": "S9I/KZ",
            "description": "Defense Supply Center, Philadelphia (General and Industrial, formerly Defense Industrial Supply Center Philadelphia)",
        },
        {
            "code": "S9F/KY",
            "description": "Defense Energy Support Center (formerly Defense Fuel Supply Center)",
        },
        {
            "code": "FAA/75",
            "description": "GSA - Vehicle Acquisition and Leasing Service",
        },
        {"code": "2FY/75", "description": "GSA - Office and Supply and Paper Products"},
        {"code": "3FN/75", "description": "GSA - National Furniture Center"},
        {
            "code": "6FE/75",
            "description": "GSA - Tools and Appliances Acquisition Center",
        },
        {
            "code": "7FX/75",
            "description": "GSA - General Products Commodity Center",
        },
    ]


def main() -> None:
    if not PDF_PATH.exists():
        print(f"ERROR: PDF not found at {PDF_PATH}")
        sys.exit(1)

    print(f"Reading PDF: {PDF_PATH}")
    rows = extract_tables(str(PDF_PATH))

    # Separate Table 1 (by FSC numeric order) and Table 2 (alphabetic by description)
    # Since the PDF contains both tables with identical data but different sort orders,
    # we deduplicate and provide a single canonical list sorted by FSC.
    rows.sort(key=lambda r: r["fsc"])

    output = {
        "title": "Federal Supply Class (FSC) Assignments to DLA/GSA for Integrated Management",
        "source": "AV_FSCClassAssignment._151007.pdf",
        "note": "Each item in the Federal Supply System is assigned to a specific Source of Supply (SOS). "
        "FSCs marked with ** are supported by both GSA and DSCP G&I.",
        "ric_reference": build_ric_reference(),
        "fsc_assignments": rows,
        "total_entries": len(rows),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(rows)} FSC entries")
    print(f"JSON written to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
