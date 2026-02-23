#!/usr/bin/env python3
"""
Phase 1.3 - Link Remaining Quizzes to Certifications
Assigns certification_id to quizzes that have no cert link yet,
based on title keyword matching.

Run AFTER deduplicate_quizzes.py.

Usage:
  python link_quizzes_to_certs.py --dry-run   # Preview
  python link_quizzes_to_certs.py             # Execute
"""

import sys
import re
import sqlite3
import argparse

DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

# Keyword rules: (pattern, cert_code)
# Ordered from most-specific to least-specific.
KEYWORD_RULES = [
    # CCNA - Wendell Odom textbook chapters
    (r'chapter\s+\d+\s+vol', 'cisco-ccna-200-301'),
    (r'ccna\s+week\s+\d+', 'cisco-ccna-200-301'),
    (r'\bccna\b', 'cisco-ccna-200-301'),
    (r'200-301', 'cisco-ccna-200-301'),

    # Security+ (before generic "security" to avoid false matches)
    (r'security\+', 'comptia-sec-sy0-701'),
    (r'sy0-701', 'comptia-sec-sy0-701'),
    (r'security\s+week\s+\d+', 'comptia-sec-sy0-701'),
    (r'security\s+part\s+\d+', 'comptia-sec-sy0-701'),
    (r'\bcryptography\b', 'comptia-sec-sy0-701'),
    (r'\bfirewalls?\b', 'comptia-sec-sy0-701'),

    # Network+
    (r'network\+', 'comptia-net-n10-009'),
    (r'n10-009', 'comptia-net-n10-009'),

    # A+ Core 2
    (r'operating\s+systems?\s+part\s+\d+', 'comptia-a-core2-221-1102'),
    (r'\boperational\s+procedures?\b', 'comptia-a-core2-221-1102'),
    (r'\bsoftware\s+troubleshooting\b', 'comptia-a-core2-221-1102'),
    (r'220-1102', 'comptia-a-core2-221-1102'),
    (r'a\+\s+core\s+2', 'comptia-a-core2-221-1102'),

    # A+ Core 1
    (r'220-1101', 'comptia-a-core1-221-1101'),
    (r'a\+\s+core\s+1', 'comptia-a-core1-221-1101'),
]

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def get_cert_id_map(c):
    c.execute('SELECT id, code FROM certifications')
    return {row['code']: row['id'] for row in c.fetchall()}

def match_cert(title, cert_id_map):
    title_lower = title.lower()
    for pattern, cert_code in KEYWORD_RULES:
        if re.search(pattern, title_lower):
            return cert_id_map.get(cert_code)
    return None

def run(dry_run=True):
    conn = get_db()
    c = conn.cursor()

    cert_id_map = get_cert_id_map(c)
    print(f"Loaded {len(cert_id_map)} certifications.\n")

    # Get unlinked quizzes
    c.execute('SELECT id, title FROM quizzes WHERE certification_id IS NULL ORDER BY title')
    unlinked = c.fetchall()
    print(f"Unlinked quizzes: {len(unlinked)}\n")

    updates = []
    no_match = []

    for row in unlinked:
        quiz_id = row['id']
        title = row['title']
        cert_id = match_cert(title, cert_id_map)
        if cert_id:
            updates.append((cert_id, quiz_id, title))
        else:
            no_match.append(title)

    print(f"{'[DRY RUN] ' if dry_run else ''}Quizzes to link: {len(updates)}")
    for cert_id, quiz_id, title in updates:
        cert_code = next(code for code, cid in cert_id_map.items() if cid == cert_id)
        print(f"  [{quiz_id}] '{title}' -> {cert_code}")

    print(f"\nNo match found for {len(no_match)} quizzes:")
    for title in no_match[:20]:
        print(f"  '{title}'")
    if len(no_match) > 20:
        print(f"  ... and {len(no_match) - 20} more")

    if dry_run:
        conn.close()
        print("\nDry run complete. Run without --dry-run to execute.")
        return

    for cert_id, quiz_id, _ in updates:
        c.execute('UPDATE quizzes SET certification_id = ? WHERE id = ?', (cert_id, quiz_id))

    conn.commit()
    conn.close()
    print(f"\nLinked {len(updates)} quizzes to certifications.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Link quizzes to certifications by title keywords.')
    parser.add_argument('--dry-run', action='store_true', help='Preview without modifying the database')
    args = parser.parse_args()
    run(dry_run=args.dry_run)
