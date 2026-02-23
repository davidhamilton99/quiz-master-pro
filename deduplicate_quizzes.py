#!/usr/bin/env python3
"""
Phase 1.1 - Deduplicate Quizzes
Removes duplicate quiz sets (same title + certification_id) that were created
when the import script ran multiple times.

Usage:
  python deduplicate_quizzes.py --dry-run   # Preview what would be deleted
  python deduplicate_quizzes.py             # Execute deletion (backs up DB first)
"""

import sys
import os
import shutil
import sqlite3
import json
import argparse
from datetime import datetime

DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def get_question_count(c, quiz):
    """Get actual question count for a quiz (handles both migrated and JSON-blob quizzes)."""
    if quiz['is_migrated']:
        c.execute('SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ? AND is_active = 1', (quiz['id'],))
        return c.fetchone()['cnt']
    else:
        try:
            questions = json.loads(quiz['questions'] or '[]')
            return len(questions)
        except (json.JSONDecodeError, TypeError):
            return 0

def srs_cards_table_exists(c):
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='srs_cards'")
    return c.fetchone() is not None

def run(dry_run=True):
    conn = get_db()
    c = conn.cursor()

    print(f"{'[DRY RUN] ' if dry_run else ''}Starting deduplication...\n")

    # Fetch all quizzes
    c.execute('''
        SELECT id, user_id, title, certification_id, is_migrated, questions, created_at
        FROM quizzes
        ORDER BY created_at ASC
    ''')
    all_quizzes = [dict(r) for r in c.fetchall()]

    # Get question counts for all quizzes
    for q in all_quizzes:
        q['question_count'] = get_question_count(c, q)

    # Group by (title, certification_id)
    groups = {}
    for q in all_quizzes:
        key = (q['title'].strip(), q['certification_id'])
        groups.setdefault(key, []).append(q)

    to_delete = []
    canonical_map = {}  # duplicate_id -> canonical_id

    for key, group in groups.items():
        if len(group) <= 1:
            continue

        # Pick canonical: highest question count, tie-break by earliest created_at (already sorted)
        canonical = max(group, key=lambda q: (q['question_count'], -group.index(q)))
        duplicates = [q for q in group if q['id'] != canonical['id']]

        print(f"Group: '{key[0]}' (cert_id={key[1]})")
        print(f"  Keeping:  id={canonical['id']} ({canonical['question_count']} questions, created {canonical['created_at']})")
        for dup in duplicates:
            print(f"  Deleting: id={dup['id']} ({dup['question_count']} questions, created {dup['created_at']})")
            to_delete.append(dup['id'])
            canonical_map[dup['id']] = canonical['id']
        print()

    total_to_delete = len(to_delete)
    print(f"{'[DRY RUN] ' if dry_run else ''}Would delete {total_to_delete} duplicate quizzes.\n")

    if dry_run:
        conn.close()
        print("Dry run complete. Run without --dry-run to execute.")
        return

    if total_to_delete == 0:
        print("Nothing to delete.")
        conn.close()
        return

    # Backup the database first
    backup_path = DATABASE + '.bak'
    print(f"Backing up database to {backup_path}...")
    shutil.copy2(DATABASE, backup_path)
    print("Backup complete.\n")

    has_srs = srs_cards_table_exists(c)

    deleted = 0
    for dup_id in to_delete:
        canonical_id = canonical_map[dup_id]

        # Migrate quiz_progress: if user has progress on dup but not on canonical, move it
        c.execute('SELECT user_id FROM quiz_progress WHERE quiz_id = ?', (dup_id,))
        dup_progress_users = {r['user_id'] for r in c.fetchall()}

        c.execute('SELECT user_id FROM quiz_progress WHERE quiz_id = ?', (canonical_id,))
        canonical_progress_users = {r['user_id'] for r in c.fetchall()}

        for user_id in dup_progress_users:
            if user_id not in canonical_progress_users:
                # Move progress to canonical
                c.execute(
                    'UPDATE quiz_progress SET quiz_id = ? WHERE quiz_id = ? AND user_id = ?',
                    (canonical_id, dup_id, user_id)
                )
            else:
                # Both have progress - delete the duplicate's progress
                c.execute(
                    'DELETE FROM quiz_progress WHERE quiz_id = ? AND user_id = ?',
                    (dup_id, user_id)
                )

        # Migrate srs_cards if the table exists
        if has_srs:
            c.execute('SELECT user_id FROM srs_cards WHERE quiz_id = ?', (dup_id,))
            dup_srs_users = {r['user_id'] for r in c.fetchall()}

            c.execute('SELECT user_id FROM srs_cards WHERE quiz_id = ?', (canonical_id,))
            canonical_srs_users = {r['user_id'] for r in c.fetchall()}

            for user_id in dup_srs_users:
                if user_id not in canonical_srs_users:
                    c.execute(
                        'UPDATE srs_cards SET quiz_id = ? WHERE quiz_id = ? AND user_id = ?',
                        (canonical_id, dup_id, user_id)
                    )
                else:
                    c.execute(
                        'DELETE FROM srs_cards WHERE quiz_id = ? AND user_id = ?',
                        (dup_id, user_id)
                    )

        # Delete quiz (CASCADE will remove questions, attempts, remaining progress)
        c.execute('DELETE FROM quizzes WHERE id = ?', (dup_id,))
        deleted += 1

        if deleted % 50 == 0:
            conn.commit()
            print(f"  Progress: {deleted}/{total_to_delete} deleted...")

    conn.commit()
    conn.close()

    print(f"\nDone. Deleted {deleted} duplicate quizzes.")
    print(f"Database backup saved at: {backup_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Deduplicate Quiz Master Pro quizzes.')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without modifying the database')
    args = parser.parse_args()
    run(dry_run=args.dry_run)
