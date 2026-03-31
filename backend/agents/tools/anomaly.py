from services.groq_client import call_groq_text

ANOMALY_PROMPT =ANOMALY_PROMPT = """
You are a financial fraud detection expert. Analyze this invoice data and detect anomalies.

Invoice data:
{invoice_data}

Check for:
1. Round number TOTAL amounts only (e.g. exactly $1000, $5000) — NOT unit prices, unit prices being round is normal
2. Missing line items despite large total amount
3. Suspicious vendor names (generic like "Services Inc", "Consulting LLC")
4. Duplicate-looking invoice numbers (e.g. INV-001, INV-1)
5. Mismatched amounts (subtotal + tax != total)
6. Unusually high amounts with no justification

DO NOT flag:
- Round number unit prices (e.g. $2500/hr, $35000 flat fee) — these are normal
- Standard service invoices with clear line item descriptions
- High amounts that are clearly justified by line items

Return ONLY a valid JSON object:
{{
    "anomalies_found": true or false,
    "risk_level": "low" or "medium" or "high",
    "flags": [
        {{
            "type": "string",
            "message": "string",
            "severity": "low" or "medium" or "high"
        }}
    ],
    "reasoning": "string explaining overall assessment"
}}
"""

def detect_anomaly(extracted_data: dict) -> dict:
    prompt = ANOMALY_PROMPT.format(invoice_data=str(extracted_data))
    
    import json, re
    response = call_groq_text(prompt)

    try:
        cleaned = re.sub(r"```json|```", "", response).strip()
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "anomalies_found": False,
            "risk_level": "low",
            "flags": [],
            "reasoning": "Anomaly detection failed to parse"
        }

    violations = []
    for flag in result.get("flags", []):
        violations.append({
            "rule": "anomaly_detection",
            "field": flag.get("type", "unknown"),
            "message": flag.get("message", ""),
            "severity": flag.get("severity", "medium")
        })

    return {
        "anomalies_found": result.get("anomalies_found", False),
        "risk_level": result.get("risk_level", "low"),
        "violations": violations,
        "reasoning": result.get("reasoning", "")
    }