from datetime import datetime, timedelta
import re

CURRENCY_TO_USD = {
    "USD": 1.0,
    "INR": 0.012,
    "EUR": 1.08,
    "GBP": 1.27,
    "AED": 0.27,
}

POLICY = {
    "min_amount": 1,
    "max_amount": 10000,
    "max_invoice_age_days": 365
}

CONTENT_FLAGS = {
    "alcohol": [
        "beer bottle", "wine bottle", "liquor store", "whiskey bar",
        "vodka", "alcohol purchase", "bar tab", "nightclub drinks",
        "lager", "scotch whisky", "rum purchase", "gin bar", "bourbon"
    ],
    "entertainment": [
        "casino chips", "night club", "strip club", "party venue",
        "concert tickets", "gambling", "entertainment venue"
    ],
    "luxury": [
        "jewelry purchase", "rolex watch", "gucci bag", "louis vuitton",
        "designer handbag", "prada", "versace clothing"
    ],
    "high_risk": [
        "cash only", "no receipt", "off books", "unofficial payment"
    ]
}

def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def convert_to_usd(amount: float, currency: str) -> float:
    rate = CURRENCY_TO_USD.get(currency.upper() if currency else "USD", 1.0)
    return round(amount * rate, 2)

def extract_searchable_text(data: dict) -> str:
    vendor = str(data.get("vendor_name", ""))
    line_items = data.get("line_items", [])
    if isinstance(line_items, list):
        items_text = " ".join(
            item.get("description", "")
            for item in line_items
            if isinstance(item, dict)
        )
    else:
        items_text = ""
    return f"{vendor} {items_text}".lower()

def match_keyword(text: str, keyword: str) -> bool:
    return keyword.lower() in text.lower()

def check_required_fields(data: dict) -> list:
    violations = []
    required = ["invoice_number", "vendor_name", "date", "amount_total"]
    for field in required:
        if not data.get(field):
            violations.append({
                "rule": "required_field",
                "field": field,
                "message": f"Missing required field: {field}",
                "severity": "high"
            })
    return violations

def check_amount_limits(data: dict) -> list:
    violations = []
    amount = safe_float(data.get("amount_total"))
    currency = data.get("currency", "USD")

    if amount is None:
        violations.append({
            "rule": "amount_limit",
            "field": "amount_total",
            "message": "Invalid or unreadable amount",
            "severity": "high"
        })
        return violations

    amount_usd = convert_to_usd(amount, currency)

    if amount_usd < POLICY["min_amount"]:
        violations.append({
            "rule": "amount_limit",
            "field": "amount_total",
            "message": f"Amount ${amount_usd} (USD) is below minimum ${POLICY['min_amount']}",
            "severity": "high"
        })
    if amount_usd > POLICY["max_amount"]:
        violations.append({
            "rule": "amount_limit",
            "field": "amount_total",
            "message": f"Amount ${amount_usd} (USD) exceeds maximum ${POLICY['max_amount']}",
            "severity": "high"
        })
    return violations

def check_date_validity(data: dict) -> list:
    violations = []
    date_str = data.get("date")
    if date_str:
        try:
            invoice_date = datetime.strptime(date_str, "%Y-%m-%d")
            today = datetime.today()
            if invoice_date > today:
                violations.append({
                    "rule": "date_validity",
                    "field": "date",
                    "message": "Invoice date is in the future",
                    "severity": "high"
                })
            if invoice_date < today - timedelta(days=POLICY["max_invoice_age_days"]):
                violations.append({
                    "rule": "date_validity",
                    "field": "date",
                    "message": f"Invoice is older than {POLICY['max_invoice_age_days']} days",
                    "severity": "medium"
                })
        except ValueError:
            violations.append({
                "rule": "date_validity",
                "field": "date",
                "message": "Invalid date format",
                "severity": "medium"
            })
    return violations

def check_content_flags(data: dict) -> list:
    violations = []
    searchable = extract_searchable_text(data)
    for category, keywords in CONTENT_FLAGS.items():
        for keyword in keywords:
            if match_keyword(searchable, keyword):
                violations.append({
                    "rule": "content_warning",
                    "field": category,
                    "message": f"Flagged content detected: {keyword}",
                    "severity": "medium"
                })
                break
    return violations

def calculate_compliance_score(violations: list) -> float:
    if not violations:
        return 100.0
    deductions = {"high": 30, "medium": 15, "low": 5}
    total_deduction = sum(deductions.get(v["severity"], 10) for v in violations)
    return max(0.0, 100.0 - total_deduction)

def validate_invoice(extracted_data: dict) -> dict:
    violations = []
    violations += check_required_fields(extracted_data)
    violations += check_amount_limits(extracted_data)
    violations += check_date_validity(extracted_data)
    violations += check_content_flags(extracted_data)

    score = calculate_compliance_score(violations)

    has_high = any(v["severity"] == "high" for v in violations)
    has_medium = any(v["severity"] == "medium" for v in violations)

    if has_high:
        status = "rejected"
    elif has_medium:
        status = "review"
    else:
        status = "approved"

    is_compliant = status == "approved"

    if status == "approved":
        reasoning = "Invoice approved — all checks passed."
    elif status == "review":
        reasoning = f"Invoice needs review — {len(violations)} issue(s): " + ", ".join(v["message"] for v in violations)
    else:
        reasoning = f"Invoice rejected — {len(violations)} violation(s): " + ", ".join(v["message"] for v in violations)

    return {
        "is_compliant": is_compliant,
        "compliance_score": score,
        "violations": violations,
        "summary": status,
        "reasoning": reasoning
    }