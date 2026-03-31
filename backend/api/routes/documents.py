from fastapi import APIRouter, HTTPException, Header
from db.supabase import supabase

router = APIRouter()

@router.get("/documents")
def get_documents(user_id: str = Header(default="anonymous")):
    response = supabase.table("documents") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()
    return {"success": True, "data": response.data}

@router.get("/documents/{document_id}")
def get_document(document_id: str, user_id: str = Header(default="anonymous")):
    response = supabase.table("documents") \
        .select("*") \
        .eq("id", document_id) \
        .eq("user_id", user_id) \
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"success": True, "data": response.data[0]}