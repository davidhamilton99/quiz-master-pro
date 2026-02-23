#!/usr/bin/env python3
"""
Phase 1.2 - Make Cert-Linked Quizzes Public
Run this AFTER deduplicate_quizzes.py.

Makes all migrated, cert-linked quizzes public so they appear
to all authenticated users via GET /api/quizzes.
"""

import sqlite3

DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

def run():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Count before
    c.execute('SELECT COUNT(*) as cnt FROM quizzes WHERE certification_id IS NOT NULL AND is_migrated = 1 AND is_public = 0')
    before = c.fetchone()['cnt']
    print(f"Quizzes to make public: {before}")

    # Make public
    c.execute('''
        UPDATE quizzes
        SET is_public = 1
        WHERE certification_id IS NOT NULL AND is_migrated = 1
    ''')
    updated = c.rowcount
    conn.commit()

    c.execute('SELECT COUNT(*) as cnt FROM quizzes WHERE is_public = 1')
    total_public = c.fetchone()['cnt']

    conn.close()
    print(f"Updated {updated} quizzes to is_public = 1.")
    print(f"Total public quizzes now: {total_public}")

if __name__ == '__main__':
    run()
