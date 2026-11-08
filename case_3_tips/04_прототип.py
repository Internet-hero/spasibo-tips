#!/usr/bin/env python3
"""CLI-прототип платформы чаевых — кейс 3."""
import csv
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime, timezone

SECRET = b"demo-secret-k3"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QR_CSV = os.path.join(BASE_DIR, "qr_links.csv")
OUT_CSV = os.path.join(BASE_DIR, "payments_out.csv")
OUT_FIELDS = ["payment_id", "merchant_id", "employee_id", "amount", "tip", "status", "timestamp"]


def load_qr(qr_id):
    with open(QR_CSV, encoding="utf-8") as file:
        for row in csv.DictReader(file):
            if row["qr_id"] == qr_id:
                return row
    return None


def verify_signature(qr):
    payload = f"{qr['merchant_id']}|{qr['employee_id']}|{qr['receipt_id']}|{qr['nonce']}|{qr['exp']}"
    expected = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(expected, qr["signature"])


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def check_exp(qr, now=None):
    current = now or datetime.now(timezone.utc)
    return parse_time(qr["exp"]) >= current


def calc_amounts(base, pct):
    tip = round(base * pct / 100, 2)
    return tip, round(base + tip, 2)


def emulate_gateway(qr_id, nonce):
    if qr_id == "qr_001":
        return "SUCCESS", None
    if qr_id == "qr_003":
        return "DECLINED", "CARD_DECLINED"
    value = int(hashlib.md5((qr_id + nonce).encode()).hexdigest(), 16) % 10
    if value <= 7:
        return "SUCCESS", None
    if value == 8:
        return "DECLINED", "CARD_DECLINED"
    return "PENDING", "GATEWAY_TIMEOUT"


def write_payment(payment):
    new_file = not os.path.exists(OUT_CSV)
    with open(OUT_CSV, "a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=OUT_FIELDS)
        if new_file:
            writer.writeheader()
        writer.writerow(payment)


def fail(code):
    print(json.dumps({"status": "ERROR", "error_code": code}, ensure_ascii=False))
    sys.exit(2)


def main():
    if len(sys.argv) < 2:
        print("Использование: python 04_прототип.py qr.json")
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as file:
        request = json.load(file)

    qr = load_qr(request["qr_id"])
    if not qr or not verify_signature(qr):
        fail("INVALID_QR")

    now = parse_time(request["now"]) if request.get("now") else datetime.now(timezone.utc)
    if not check_exp(qr, now):
        fail("QR_EXPIRED")

    base = float(request.get("base_amount", 1500))
    pct = float(request.get("tip_pct", 10))
    if not 0 < base <= 1_000_000:
        fail("AMOUNT_OUT_OF_RANGE")
    if not 0 <= pct <= 50:
        fail("TIP_OUT_OF_RANGE")

    tip, total = calc_amounts(base, pct)
    status, error = emulate_gateway(qr["qr_id"], qr["nonce"])
    payment = {
        "payment_id": f"p_demo_{qr['qr_id'][-3:]}",
        "merchant_id": qr["merchant_id"],
        "employee_id": qr["employee_id"],
        "amount": f"{base:.2f}",
        "tip": f"{tip:.2f}",
        "status": status,
        "timestamp": now.isoformat().replace("+00:00", "Z"),
    }
    write_payment(payment)
    print(json.dumps({
        "payment_id": payment["payment_id"],
        "status": status,
        "amount_total": total,
        "tip_amount": tip,
        "error_code": error,
    }, ensure_ascii=False, indent=2))
    sys.exit(0 if status == "SUCCESS" else 1)


if __name__ == "__main__":
    main()
