from fastapi import APIRouter, Response, Depends
from pydantic import BaseModel, Field
from controllers.voice_controller import generate_audio_from_text
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

router = APIRouter(dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE * 1))))])

class TTSRequest(BaseModel):
    text: str = Field(..., max_length=200, description="Text to convert to speech (max 200 chars)")
    voice: str = Field(default="troy", description="Voice persona (e.g., troy, hannah, autumn)")

@router.post(
    "/generate-voice", 
    summary="Convert Text to Speech")
async def generate_voice_route(request: TTSRequest):
    audio_bytes = generate_audio_from_text(text=request.text, voice=request.voice)
    
    return Response(
        content=audio_bytes, 
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'attachment; filename="output.wav"'
        }
    )