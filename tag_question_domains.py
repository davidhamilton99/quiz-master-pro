#!/usr/bin/env python3
"""
Phase 1.4 - Tag Questions with Domains
Populates the question_domains table by mapping quiz titles to domains.

Run AFTER link_quizzes_to_certs.py (requires certification_id on quizzes).
Run AFTER deduplicate_quizzes.py (avoid tagging duplicates).

Usage:
  python tag_question_domains.py --dry-run   # Preview counts
  python tag_question_domains.py             # Execute
"""

import sys
import re
import sqlite3
import argparse

DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

# --- Domain mapping rules ---
# Each entry: (title_pattern, cert_code, domain_codes)
# domain_codes is a list of domain 'code' values (e.g. '2.0') for that cert.
# For practice exams, use '__all__' to distribute across all domains by weight.

DOMAIN_RULES = [
    # CCNA
    (r'ccna\s+week\s+[1-3]($|\D)', 'cisco-ccna-200-301', ['1.0']),              # Network Fundamentals
    (r'ccna\s+week\s+4($|\D)', 'cisco-ccna-200-301', ['2.0']),                   # Network Access
    (r'ccna\s+week\s+5($|\D)', 'cisco-ccna-200-301', ['3.0']),                   # IP Connectivity
    (r'ccna\s+week\s+6($|\D)', 'cisco-ccna-200-301', ['3.0', '4.0']),            # IP Connectivity + IP Services
    (r'ccna\s+week\s+7($|\D)', 'cisco-ccna-200-301', ['4.0', '5.0']),            # IP Services + Security
    (r'ccna\s+week\s+8($|\D)', 'cisco-ccna-200-301', ['5.0']),                   # Security Fundamentals
    (r'ccna\s+week\s+9($|\D)', 'cisco-ccna-200-301', ['2.0']),                   # Network Access (wireless)
    (r'ccna\s+week\s+1[0-9]($|\D)', 'cisco-ccna-200-301', ['6.0']),              # Automation
    (r'chapter\s+\d+\s+vol\s+1', 'cisco-ccna-200-301', ['1.0', '2.0', '3.0']),  # Odom Vol 1
    (r'chapter\s+\d+\s+vol\s+2', 'cisco-ccna-200-301', ['4.0', '5.0', '6.0']),  # Odom Vol 2

    # Security+
    (r'security\s+week\s+1($|\D)', 'comptia-sec-sy0-701', ['1.0']),              # General Security Concepts
    (r'security\s+week\s+2($|\D)', 'comptia-sec-sy0-701', ['4.0']),              # Security Operations (auth)
    (r'security\s+week\s+3($|\D)', 'comptia-sec-sy0-701', ['2.0']),              # Threats & Vulns
    (r'security\s+week\s+4($|\D)', 'comptia-sec-sy0-701', ['3.0']),              # Security Architecture
    (r'security\s+week\s+5($|\D)', 'comptia-sec-sy0-701', ['4.0']),              # Security Operations
    (r'security\s+week\s+6($|\D)', 'comptia-sec-sy0-701', ['5.0']),              # Program Management
    (r'security\s+part\s+\d+', 'comptia-sec-sy0-701', ['__all__']),
    (r'\bcryptography\b', 'comptia-sec-sy0-701', ['1.0']),                        # General Security Concepts
    (r'\bfirewalls?\b', 'comptia-sec-sy0-701', ['3.0']),                          # Security Architecture

    # A+ Core 2
    (r'operating\s+systems?\s+part\s+\d+', 'comptia-a-core2-221-1102', ['1.0']), # Operating Systems
    (r'\bsoftware\s+troubleshooting\b', 'comptia-a-core2-221-1102', ['3.0']),    # Software Troubleshooting
    (r'\boperational\s+procedures?\b', 'comptia-a-core2-221-1102', ['4.0']),      # Operational Procedures

    # Practice Exams - all domains by weight
    (r'practice\s+exam', None, ['__all__']),
    (r'mock\s+exam', None, ['__all__']),
    (r'full\s+exam', None, ['__all__']),
    (r'final\s+exam', None, ['__all__']),
]

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def build_domain_index(c):
    """
    Returns:
      cert_code_to_id: {cert_code: cert_id}
      domains_by_cert: {cert_id: [{id, code, weight}, ...]}
      domain_by_cert_code: {(cert_id, domain_code): domain_id}
    """
    c.execute('SELECT id, code FROM certifications')
    cert_code_to_id = {r['code']: r['id'] for r in c.fetchall()}

    c.execute('SELECT id, certification_id, code, weight FROM domains WHERE parent_domain_id IS NULL ORDER BY sort_order')
    domains_by_cert = {}
    domain_by_cert_code = {}
    for r in c.fetchall():
        cid = r['certification_id']
        domains_by_cert.setdefault(cid, []).append(dict(r))
        domain_by_cert_code[(cid, r['code'])] = r['id']

    return cert_code_to_id, domains_by_cert, domain_by_cert_code

def get_domain_ids_for_quiz(title, cert_id, cert_code_to_id, domains_by_cert, domain_by_cert_code):
    """
    Returns a list of domain_ids to tag questions in this quiz with.
    """
    title_lower = title.lower()

    for pattern, rule_cert_code, domain_codes in DOMAIN_RULES:
        if not re.search(pattern, title_lower):
            continue

        # Determine which cert this rule applies to
        if rule_cert_code is not None:
            rule_cert_id = cert_code_to_id.get(rule_cert_code)
            if rule_cert_id != cert_id:
                continue  # Rule is for a different cert
        else:
            # Pattern without cert constraint (e.g. "practice exam") - use quiz's own cert
            rule_cert_id = cert_id

        if rule_cert_id is None:
            continue

        if domain_codes == ['__all__']:
            # Return all top-level domains for this cert
            return [d['id'] for d in domains_by_cert.get(rule_cert_id, [])]

        result = []
        for code in domain_codes:
            did = domain_by_cert_code.get((rule_cert_id, code))
            if did:
                result.append(did)
        return result

    return []

def run(dry_run=True):
    conn = get_db()
    c = conn.cursor()

    cert_code_to_id, domains_by_cert, domain_by_cert_code = build_domain_index(c)

    # Get all cert-linked, migrated quizzes
    c.execute('''
        SELECT q.id as quiz_id, q.title, q.certification_id
        FROM quizzes q
        WHERE q.certification_id IS NOT NULL AND q.is_migrated = 1
        ORDER BY q.certification_id, q.title
    ''')
    quizzes = [dict(r) for r in c.fetchall()]

    total_tags = 0
    total_questions = 0
    skipped = 0

    for quiz in quizzes:
        quiz_id = quiz['quiz_id']
        title = quiz['title']
        cert_id = quiz['certification_id']

        domain_ids = get_domain_ids_for_quiz(
            title, cert_id, cert_code_to_id, domains_by_cert, domain_by_cert_code
        )

        if not domain_ids:
            skipped += 1
            continue

        # Get all question IDs for this quiz
        c.execute('SELECT id FROM questions WHERE quiz_id = ? AND is_active = 1', (quiz_id,))
        question_ids = [r['id'] for r in c.fetchall()]
        total_questions += len(question_ids)

        if dry_run:
            domain_codes = [d['code'] for d in domains_by_cert.get(cert_id, []) if d['id'] in domain_ids]
            print(f"  [{quiz_id}] '{title}' -> {len(question_ids)} questions x {len(domain_ids)} domains {domain_codes}")
            total_tags += len(question_ids) * len(domain_ids)
            continue

        for q_id in question_ids:
            for d_id in domain_ids:
                try:
                    c.execute(
                        'INSERT OR IGNORE INTO question_domains (question_id, domain_id) VALUES (?, ?)',
                        (q_id, d_id)
                    )
                    total_tags += 1
                except Exception as e:
                    print(f"    Warning: {e}")

    if dry_run:
        print(f"\n[DRY RUN] Would insert ~{total_tags} rows into question_domains.")
        print(f"Questions covered: ~{total_questions}")
        print(f"Quizzes with no domain match: {skipped}")
        conn.close()
        print("\nDry run complete. Run without --dry-run to execute.")
        return

    conn.commit()

    c.execute('SELECT COUNT(*) as cnt FROM question_domains')
    final_count = c.fetchone()['cnt']

    conn.close()
    print(f"\nInserted {total_tags} domain tags.")
    print(f"question_domains table now has {final_count} rows.")
    print(f"Quizzes with no domain match: {skipped}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tag questions with exam domains.')
    parser.add_argument('--dry-run', action='store_true', help='Preview without modifying the database')
    args = parser.parse_args()
    run(dry_run=args.dry_run)
