#!/usr/bin/env python3
"""
Restore missing booking_slots rows from MySQL ROW binlog DELETE events.
Only inserts rows where:
  - parent booking still exists and reserves a slot
  - slot business key is missing on that booking
  - instructor/date/time unique slot is not taken by another booking

Usage:
  python3 restore-booking-slots-from-binlog.py --dry-run
  python3 restore-booking-slots-from-binlog.py --apply
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import subprocess
import sys

RESERVING_STATUSES = (
    "confirmed",
    "pending",
    "pending_prebook",
    "pending_payment",
    "completed",
)

DELETE_RE = re.compile(
    r"### DELETE FROM `viva`.`booking_slots`\n"
    r"### WHERE\n"
    r"(?:###   @1=(\d+)\n"
    r"###   @2=(\d+)\n"
    r"###   @3=(\d+)\n"
    r"###   @4='([^']+)'\n"
    r"###   @5='([^']+)'\n)",
)

INSERT_KEY_RE = re.compile(
    r"### INSERT INTO `viva`.`booking_slots`\n"
    r"### SET\n"
    r"(?:###   @1=\d+\n)?"
    r"###   @2=(\d+)\n"
    r"###   @3=(\d+)\n"
    r"###   @4='([^']+)'\n"
    r"###   @5='([^']+)'\n",
)


def norm_date(raw: str) -> str:
    return raw.replace(":", "-")[:10]


def run_mysql(sql: str, mysql_password: str) -> str:
    env = os.environ.copy()
    env["MYSQL_PWD"] = mysql_password
    proc = subprocess.run(
        ["mysql", "-uroot", "-N", "-B", "viva", "-e", sql],
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


def decode_binlog(binlog_dir: str) -> str:
    files = sorted(glob.glob(os.path.join(binlog_dir, "binlog.0*")))
    if not files:
        raise SystemExit(f"No binlog files in {binlog_dir}")
    cmd = [
        "mysqlbinlog",
        "--database=viva",
        "--verbose",
        "--base64-output=DECODE-ROWS",
        *files,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise SystemExit(proc.stderr or proc.stdout)
    return proc.stdout


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--binlog-dir", default="/var/lib/mysql")
    parser.add_argument("--mysql-password", default=os.environ.get("MYSQL_ROOT_PASSWORD", ""))
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        parser.error("Pass --dry-run or --apply")
    if not args.mysql_password:
        parser.error("Set MYSQL_ROOT_PASSWORD or pass --mysql-password")

    text = decode_binlog(args.binlog_dir)
    deleted: list[tuple[int, int, int | None, str, str]] = []
    for m in DELETE_RE.finditer(text):
        deleted.append(
            (
                int(m.group(1)),
                int(m.group(2)),
                int(m.group(3)) if m.group(3) != "NULL" else None,
                norm_date(m.group(4)),
                m.group(5),
            )
        )
    inserted_keys: set[tuple[int, str, str]] = set()
    for m in INSERT_KEY_RE.finditer(text):
        inserted_keys.add((int(m.group(1)), norm_date(m.group(3)), m.group(4)))

    # Prefer latest DELETE snapshot per business key (last write wins).
    latest: dict[tuple[int, str, str], tuple[int, int, int | None, str, str]] = {}
    for row in deleted:
        _id, booking_id, instructor_id, date_iso, slot_time = row
        latest[(booking_id, date_iso, slot_time)] = row

    active_bookings = set()
    for line in run_mysql(
        "SELECT id FROM bookings WHERE status IN ('"
        + "','".join(RESERVING_STATUSES)
        + "') AND instructor_user_id IS NOT NULL;",
        args.mysql_password,
    ).splitlines():
        if line.strip():
            active_bookings.add(int(line.strip()))

    existing_keys: set[tuple[int, str, str]] = set()
    for line in run_mysql(
        "SELECT booking_id, date_iso, slot_time FROM booking_slots;",
        args.mysql_password,
    ).splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            existing_keys.add((int(parts[0]), parts[1][:10], parts[2]))

    occupied_instructor: set[tuple[int, str, str]] = set()
    for line in run_mysql(
        "SELECT instructor_user_id, date_iso, slot_time FROM booking_slots WHERE instructor_user_id IS NOT NULL;",
        args.mysql_password,
    ).splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            occupied_instructor.add((int(parts[0]), parts[1][:10], parts[2]))

    to_restore: list[tuple[int, int, int | None, str, str]] = []
    for key, row in latest.items():
        booking_id, date_iso, slot_time = key
        if booking_id not in active_bookings:
            continue
        if key in existing_keys:
            continue
        if (row[2], date_iso, slot_time) in inserted_keys:
            continue
        _id, _bid, instructor_id, _d, _t = row
        if instructor_id is not None and (instructor_id, date_iso, slot_time) in occupied_instructor:
            continue
        to_restore.append(row)

    print(f"deleted_events={len(deleted)} unique_deleted_keys={len(latest)} restore_candidates={len(to_restore)}")
    for row in to_restore[:50]:
        print(f"  booking={row[1]} instructor={row[2]} {row[3]} {row[4]}")
    if len(to_restore) > 50:
        print(f"  ... and {len(to_restore) - 50} more")

    if args.dry_run or not to_restore:
        return 0

    stmts = ["START TRANSACTION;"]
    for _id, booking_id, instructor_id, date_iso, slot_time in to_restore:
        inst_sql = str(instructor_id) if instructor_id is not None else "NULL"
        stmts.append(
            "INSERT INTO booking_slots (booking_id, instructor_user_id, date_iso, slot_time, created_at, updated_at) "
            f"SELECT {booking_id}, {inst_sql}, '{date_iso}', '{slot_time}', NOW(), NOW() "
            f"WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.id = {booking_id} AND b.status IN ('"
            + "','".join(RESERVING_STATUSES)
            + f"')) AND NOT EXISTS (SELECT 1 FROM booking_slots s WHERE s.booking_id = {booking_id} "
            f"AND s.date_iso = '{date_iso}' AND s.slot_time = '{slot_time}') "
            + (
                f"AND NOT EXISTS (SELECT 1 FROM booking_slots s WHERE s.instructor_user_id = {instructor_id} "
                f"AND s.date_iso = '{date_iso}' AND s.slot_time = '{slot_time}');"
                if instructor_id is not None
                else ";"
            )
        )
    stmts.append("COMMIT;")
    sql = "\n".join(stmts)
    env = os.environ.copy()
    env["MYSQL_PWD"] = args.mysql_password
    subprocess.run(["mysql", "-uroot", "viva"], input=sql, env=env, text=True, check=True)
    after = run_mysql("SELECT COUNT(*) FROM booking_slots;", args.mysql_password).strip()
    print(f"restore_complete total_slots={after}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
