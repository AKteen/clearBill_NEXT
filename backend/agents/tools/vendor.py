from db.supabase import supabase

def get_vendor_history(vendor_name: str) -> dict:
    if not vendor_name:
        return {"found": False, "history": []}

    response = supabase.table("documents") \
        .select("id, created_at,  is_compliant, audit_result") \
        .ilike("extracted_data->>vendor_name", f"%{vendor_name}%") \
        .order("created_at", desc=True) \
        .limit(10) \
        .execute()

    records = response.data or []

    if not records:
        return {"found": False, "history": []}

    total = len(records)
    compliant = sum(1 for r in records if r.get("is_compliant"))
    rejection_rate = round((total - compliant) / total * 100, 1)

    return {
        "found": True,
        "total_invoices": total,
        "compliant_count": compliant,
        "rejection_rate": rejection_rate,
        "is_risky_vendor": rejection_rate > 50,
        "history": records
    }

def check_vendor(extracted_data: dict) -> dict:
    vendor_name = extracted_data.get("vendor_name")
    history = get_vendor_history(vendor_name)

    violations = []
    if history["found"] and history["is_risky_vendor"]:
        violations.append({
            "rule": "vendor_risk",
            "field": "vendor_name",
            "message": f"Vendor '{vendor_name}' has {history['rejection_rate']}% rejection rate",
            "severity": "high"
        })

    return {
        "vendor_history": history,
        "violations": violations
    }