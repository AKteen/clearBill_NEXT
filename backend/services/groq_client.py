from groq import Groq
from config import GROQ_API_KEY
import base64

client = Groq(api_key=GROQ_API_KEY)

TEXT_MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def is_image_file(file_type: str) -> bool:
    return file_type.lower() in ["png", "jpg", "jpeg", "gif", "bmp", "tiff"]

def encode_image(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")

def call_groq_text(prompt: str, system: str = "") -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=messages,
        max_tokens=2000,
        temperature=0.1
    )
    return response.choices[0].message.content

def call_groq_vision(image_bytes: bytes, prompt: str, mime_type: str = "image/jpeg") -> str:
    base64_image = encode_image(image_bytes)

    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        max_tokens=2000,
        temperature=0.1
    )
    return response.choices[0].message.content

def call_groq(file_type: str, prompt: str, file_bytes: bytes = None, mime_type: str = "image/jpeg", system: str = "") -> str:
    if is_image_file(file_type):
        return call_groq_vision(file_bytes, prompt, mime_type)
    else:
        return call_groq_text(prompt, system)