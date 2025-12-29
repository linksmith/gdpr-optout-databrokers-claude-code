#!/usr/bin/env python3
"""
Export form analysis data from database for automation purposes.

Usage:
    python scripts/export_form_analysis.py --format json
    python scripts/export_form_analysis.py --format csv
    python scripts/export_form_analysis.py --broker spokeo --format json
"""

import sqlite3
import json
import csv
import argparse
import sys
from pathlib import Path
from datetime import datetime


def get_db_path():
    """Get the path to the submissions database."""
    return Path(__file__).parent.parent / "data" / "submissions.db"


def export_json(cursor, broker_id=None, pretty=True):
    """Export form analysis as JSON."""
    if broker_id:
        cursor.execute("SELECT * FROM form_analysis WHERE broker_id = ?", (broker_id,))
    else:
        cursor.execute("SELECT * FROM form_analysis")

    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    data = []
    for row in rows:
        record = dict(zip(columns, row))

        # Parse JSON fields
        for json_field in ['field_mappings', 'search_form_details', 'required_delays']:
            if record.get(json_field):
                try:
                    record[json_field] = json.loads(record[json_field])
                except json.JSONDecodeError:
                    pass  # Keep as string if invalid JSON

        # Convert boolean fields
        for bool_field in ['multi_step', 'requires_search_first', 'has_rate_limiting',
                          'uses_ajax', 'redirect_after_submit', 'known_working']:
            if record.get(bool_field) is not None:
                record[bool_field] = bool(record[bool_field])

        data.append(record)

    if pretty:
        return json.dumps(data, indent=2, default=str)
    else:
        return json.dumps(data, default=str)


def export_automation_config(cursor, broker_id=None):
    """Export minimal config needed for automation (JSON)."""
    if broker_id:
        cursor.execute("""
            SELECT broker_id, page_url, form_selector, field_mappings,
                   captcha_type, captcha_selector, submit_button_selector,
                   confirmation_selector, confirmation_text_pattern,
                   required_delays, requires_search_first, search_form_details
            FROM form_analysis
            WHERE broker_id = ? AND known_working = 1
        """, (broker_id,))
    else:
        cursor.execute("""
            SELECT broker_id, page_url, form_selector, field_mappings,
                   captcha_type, captcha_selector, submit_button_selector,
                   confirmation_selector, confirmation_text_pattern,
                   required_delays, requires_search_first, search_form_details
            FROM form_analysis
            WHERE known_working = 1
        """)

    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    configs = {}
    for row in rows:
        record = dict(zip(columns, row))
        broker = record.pop('broker_id')

        # Parse JSON fields
        for json_field in ['field_mappings', 'search_form_details', 'required_delays']:
            if record.get(json_field):
                try:
                    record[json_field] = json.loads(record[json_field])
                except json.JSONDecodeError:
                    record[json_field] = None

        # Convert boolean
        record['requires_search_first'] = bool(record.get('requires_search_first'))

        configs[broker] = record

    return json.dumps(configs, indent=2)


def export_csv(cursor, broker_id=None):
    """Export form analysis as CSV."""
    if broker_id:
        cursor.execute("SELECT * FROM form_analysis WHERE broker_id = ?", (broker_id,))
    else:
        cursor.execute("SELECT * FROM form_analysis")

    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    output = []
    writer = csv.DictWriter(sys.stdout, fieldnames=columns)

    # Write to string buffer for return
    from io import StringIO
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns)
    writer.writeheader()

    for row in rows:
        record = dict(zip(columns, row))
        writer.writerow(record)

    return buffer.getvalue()


def export_markdown_table(cursor, broker_id=None):
    """Export form analysis as Markdown table."""
    if broker_id:
        cursor.execute("""
            SELECT broker_id, page_url, captcha_type, multi_step,
                   known_working, analyzed_at
            FROM form_analysis
            WHERE broker_id = ?
        """, (broker_id,))
    else:
        cursor.execute("""
            SELECT broker_id, page_url, captcha_type, multi_step,
                   known_working, analyzed_at
            FROM form_analysis
            ORDER BY broker_id
        """)

    rows = cursor.fetchall()

    # Build markdown table
    lines = [
        "| Broker ID | Page URL | CAPTCHA | Multi-Step | Working | Analyzed |",
        "|-----------|----------|---------|------------|---------|----------|"
    ]

    for row in rows:
        broker_id, page_url, captcha, multi_step, working, analyzed = row
        captcha = captcha or 'none'
        multi_step = '✓' if multi_step else '✗'
        working = '✓' if working else '?'
        analyzed_date = analyzed.split()[0] if analyzed else 'N/A'

        lines.append(
            f"| {broker_id} | {page_url} | {captcha} | {multi_step} | {working} | {analyzed_date} |"
        )

    return '\n'.join(lines)


def show_stats(cursor):
    """Show statistics about form analysis coverage."""
    # Total brokers
    cursor.execute("SELECT COUNT(*) FROM form_analysis")
    total = cursor.fetchone()[0]

    # Known working
    cursor.execute("SELECT COUNT(*) FROM form_analysis WHERE known_working = 1")
    working = cursor.fetchone()[0]

    # With CAPTCHA
    cursor.execute("""
        SELECT COUNT(*) FROM form_analysis
        WHERE captcha_type IS NOT NULL AND captcha_type != 'none'
    """)
    with_captcha = cursor.fetchone()[0]

    # Multi-step
    cursor.execute("SELECT COUNT(*) FROM form_analysis WHERE multi_step = 1")
    multi_step = cursor.fetchone()[0]

    # CAPTCHA breakdown
    cursor.execute("""
        SELECT captcha_type, COUNT(*)
        FROM form_analysis
        WHERE captcha_type IS NOT NULL AND captcha_type != 'none'
        GROUP BY captcha_type
    """)
    captcha_breakdown = cursor.fetchall()

    print(f"Form Analysis Statistics")
    print(f"=" * 50)
    print(f"Total brokers analyzed: {total}")
    print(f"Known working: {working} ({working/total*100 if total > 0 else 0:.1f}%)")
    print(f"With CAPTCHA: {with_captcha}")
    print(f"Multi-step forms: {multi_step}")
    print()

    if captcha_breakdown:
        print("CAPTCHA Types:")
        for captcha_type, count in captcha_breakdown:
            print(f"  - {captcha_type}: {count}")

    print()


def main():
    parser = argparse.ArgumentParser(
        description='Export form analysis data for automation'
    )
    parser.add_argument(
        '--format',
        choices=['json', 'csv', 'markdown', 'automation', 'stats'],
        default='json',
        help='Export format (default: json)'
    )
    parser.add_argument(
        '--broker',
        help='Export specific broker only'
    )
    parser.add_argument(
        '--output',
        help='Output file (default: stdout)'
    )
    parser.add_argument(
        '--pretty',
        action='store_true',
        help='Pretty print JSON output'
    )

    args = parser.parse_args()

    # Connect to database
    db_path = get_db_path()
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if form_analysis table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='form_analysis'
    """)
    if not cursor.fetchone():
        print("Error: form_analysis table does not exist", file=sys.stderr)
        print("Run the database migration first", file=sys.stderr)
        sys.exit(1)

    # Generate output
    if args.format == 'stats':
        show_stats(cursor)
        output = None
    elif args.format == 'json':
        output = export_json(cursor, args.broker, args.pretty)
    elif args.format == 'csv':
        output = export_csv(cursor, args.broker)
    elif args.format == 'markdown':
        output = export_markdown_table(cursor, args.broker)
    elif args.format == 'automation':
        output = export_automation_config(cursor, args.broker)

    # Write output
    if output:
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Exported to {args.output}", file=sys.stderr)
        else:
            print(output)

    conn.close()


if __name__ == '__main__':
    main()
