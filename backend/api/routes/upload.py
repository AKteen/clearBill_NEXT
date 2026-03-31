from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from agents.orchestrator import run_agent

router = APIRouter()

ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "gif", "bmp", "tiff"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def get_file_type(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower()

def validate_file(file: UploadFile, file_bytes: bytes):
    file_type = get_file_type(file.filename)
    if file_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_type}' not allowed"
        )
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    user_id: str = Header(default=None)
):
    file_bytes = await file.read()
    validate_file(file, file_bytes)

    file_type = get_file_type(file.filename)

    result = run_agent(
        file_bytes=file_bytes,
        filename=file.filename,
        file_type=file_type,
        user_id=user_id
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        "success": True,
        "message": "Invoice processed successfully",
        "data": result
    }