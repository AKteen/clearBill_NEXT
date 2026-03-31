import fitz  # PyMuPDF
import json
import re
from services.groq_client import call_groq

EXTRACTION_PROMPT = """
You are an invoice data extractor. Extract structured data from the invoice and return ONLY a valid JSON object. No explanation, no markdown.

Fields to extract:
{
    "invoice_number": "string or null",
    "vendor_name": "string or null",
    "vendor_address": "string or null",
    "date": "YYYY-MM-DD format or null",
    "due_date": "YYYY-MM-DD format or null",
    "amount_subtotal": "float or null",
    "amount_tax": "float or null",
    "amount_total": "float or null",
    "currency": "string or null",
    "line_items": [{"description": "string", "quantity": "float", "unit_price": "float", "total": "float"}],
    "payment_method": "string or null",
    "is_invoice": true or false
}

STRICT EXTRACTION RULES:

1. Vendor Identification (VERY IMPORTANT):
- vendor_name MUST be extracted ONLY from sections labeled:
  "FROM", "Seller", "Vendor", "Issued By", or similar
- DO NOT extract vendor_name from:
  "Bill To", "Customer", "Client", or "Ship To"
- If vendor is missing, marked as "N/A", or unclear → return null

2. Do NOT guess or infer missing data
- If a field is not clearly present → return null
- Never hallucinate values

3. Dates:
- Must be in YYYY-MM-DD format
- If format unclear → return null

4. Amounts:
- Must be numeric (not strings)
- Remove currency symbols (₹, $, etc.)

5. is_invoice:
- Must be false if document is not clearly an invoice

6. Special Case:
- If "FROM" section is missing or contains "N/A", vendor_name must be null

Return ONLY valid JSON.
"""



def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text.strip()

def parse_json_response(response: str) -> dict:
    try:
        # Clean markdown code blocks if present
        cleaned = re.sub(r"```json|```", "", response).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None

def extract_invoice_data(file_bytes: bytes, file_type: str, mime_type: str = "image/jpeg") -> dict:
    if file_type.lower() == "pdf":
        text = extract_text_from_pdf(file_bytes)
        prompt = f"{EXTRACTION_PROMPT}\n\nInvoice text:\n{text}"
        response = call_groq(
            file_type=file_type,
            prompt=prompt,
            system="You are a precise invoice data extractor. Return only valid JSON."
        )
    else:
        response = call_groq(
            file_type=file_type,
            prompt=EXTRACTION_PROMPT,
            file_bytes=file_bytes,
            mime_type=mime_type
        )

    extracted = parse_json_response(response)

    if not extracted:
        return {
            "success": False,
            "error": "Failed to parse invoice data",
            "raw_response": response
        }

    if not extracted.get("is_invoice", False):
        return {
            "success": False,
            "error": "Document is not an invoice",
            "raw_response": response
        }

    return {
        "success": True,
        "data": extracted,
        "raw_response": response
    }