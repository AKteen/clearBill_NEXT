
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.documents import router as documents_router
from routes.audit import router as audit_router

app = FastAPI(title="ClearBill API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(audit_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0"}