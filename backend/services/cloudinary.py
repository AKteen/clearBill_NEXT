import cloudinary
import cloudinary.uploader
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

def upload_file(file_bytes: bytes, filename: str, folder: str = "clearbill") -> dict:
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=filename,
        folder=folder,
        resource_type="auto"
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"]
    }

def delete_file(public_id: str) -> bool:
    result = cloudinary.uploader.destroy(public_id)
    return result["result"] == "ok"