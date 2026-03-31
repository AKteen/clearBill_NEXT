from fastapi import APIRouter, Header
from db.supabase import supabase

router = APIRouter()

@router.get("/audit/stats")
def get_audit_stats(user_id: str = Header(default=None)):
    query = supabase.table("documents").select("is_compliant, compliance_score, status")
    
    if user_id:
        query = query.eq("user_id", user_id)
    
    response = query.execute()
    records = response.data or []
    total = len(records)
    approved = sum(1 for r in records if r["status"] == "approved")
    rejected = total - approved
    avg_score = round(sum(r["compliance_score"] for r in records) / total, 1) if total > 0 else 0

    return {
        "success": True,
        "data": {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "avg_compliance_score": avg_score
        }
    }
