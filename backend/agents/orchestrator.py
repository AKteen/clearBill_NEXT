import hashlib
from agents.tools.extract import extract_invoice_data
from agents.tools.validate import validate_invoice
from agents.tools.vendor import check_vendor
from agents.tools.anomaly import detect_anomaly
from services.cloudinary import upload_file
from db.supabase import supabase

def generate_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def check_duplicate(file_hash: str) -> dict | None:
    response = supabase.table("documents") \
        .select("*") \
        .eq("file_hash", file_hash) \
        .execute()
    records = response.data
    return records[0] if records else None

def merge_violations(*violation_lists) -> list:
    merged = []
    for vlist in violation_lists:
        merged.extend(vlist)
    return merged

def run_agent(file_bytes: bytes, filename: str, file_type: str, user_id: str) -> dict:
    
    # ── Step 1: Duplicate detection ──────────────────────────────
    file_hash = generate_file_hash(file_bytes)
    duplicate = check_duplicate(file_hash)
    if duplicate:
        return {
            "success": False,
            "error": "Duplicate invoice — already processed",
            "duplicate_id": duplicate["id"]
        }

    # ── Step 2: Extract (mandatory, always runs) ──────────────────
    mime_type = f"image/{file_type.lower()}" if file_type.lower() != "pdf" else "application/pdf"
    extraction = extract_invoice_data(file_bytes, file_type, mime_type)

    if not extraction["success"]:
        return {
            "success": False,
            "error": extraction["error"]
        }

    extracted_data = extraction["data"]

    # ── Step 3: Agent decides tools based on extracted data ───────
    all_violations = []

    # Always validate policy rules
    validation = validate_invoice(extracted_data)
    all_violations += validation["violations"]

    # Always check vendor history
    vendor = check_vendor(extracted_data)
    all_violations += vendor["violations"]

    # Run anomaly detection if amount is high or vendor is risky
    amount = extracted_data.get("amount_total", 0)
    vendor_risky = vendor["vendor_history"].get("is_risky_vendor", False)

    if amount > 1000 or vendor_risky:
        anomaly = detect_anomaly(extracted_data)
        all_violations += anomaly.get("violations", [])
        anomaly_result = anomaly
    else:
        anomaly_result = {"anomalies_found": False, "risk_level": "low", "reasoning": "Skipped — low risk"}

    # ── Step 4: Final compliance decision ─────────────────────────
    from agents.tools.validate import calculate_compliance_score
    compliance_score = calculate_compliance_score(all_violations)
    has_high = any(v["severity"] == "high" for v in all_violations)
    has_medium = any(v["severity"] == "medium" for v in all_violations)

    if has_high:
        status = "rejected"
    elif has_medium:
        status = "review"
    else:
        status = "approved"

    is_compliant = status == "approved"

    reasoning_parts = [validation["reasoning"]]
    if anomaly_result.get("reasoning"):
        reasoning_parts.append(f"Anomaly check: {anomaly_result['reasoning']}")
    if vendor["vendor_history"].get("found"):
        reasoning_parts.append(
            f"Vendor history: {vendor['vendor_history']['rejection_rate']}% rejection rate"
        )
    final_reasoning = " | ".join(reasoning_parts)

    audit_result = {
        "is_compliant": is_compliant,
        "compliance_score": compliance_score,
        "violations": all_violations,
        "reasoning": final_reasoning,
        "anomaly": anomaly_result,
        "vendor": vendor["vendor_history"]
    }

    # ── Step 5: Upload to Cloudinary (only if compliant) ──────────
    cloudinary_url = None
    if is_compliant:
        upload = upload_file(file_bytes, filename)
        cloudinary_url = upload["url"]

    # ── Step 6: Store in Supabase ─────────────────────────────────
    record = {
        "user_id": user_id if user_id else None,
        "original_filename": filename,
        "file_type": file_type,
        "file_hash": file_hash,
        "cloudinary_url": cloudinary_url,
        "extracted_data": extracted_data,
        "groq_response": extraction["raw_response"],
        "audit_result": audit_result,
        "is_compliant": is_compliant,
        "compliance_score": compliance_score,
        "status": status
    }

    db_response = supabase.table("documents").insert(record).execute()
    saved = db_response.data[0] if db_response.data else {}

    return {
        "success": True,
        "document_id": saved.get("id"),
        "is_compliant": is_compliant,
        "compliance_score": compliance_score,
        "extracted_data": extracted_data,
        "audit_result": audit_result,
        "cloudinary_url": cloudinary_url,
        "status": "approved" if is_compliant else "rejected"
    }
