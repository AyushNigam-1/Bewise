from fastapi import APIRouter, Response, Depends
from pydantic import BaseModel, Field
from routes.utils import get_optional_user_id
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration
from core.telemetry import TelemetryRoute
from controllers.voice_controller import VoiceService, get_voice_service

router = APIRouter(
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(5, Duration.MINUTE * 1))))],
    route_class=TelemetryRoute
)

class TTSRequest(BaseModel):
    text: str = Field(..., max_length=200, description="Text to convert to speech (max 200 chars)")
    voice: str = Field(default="troy", description="Voice persona (e.g., troy, hannah, autumn)")


@router.post("/generate-voice", summary="Convert Text to Speech")
async def generate_voice_route(
    payload: TTSRequest,
    user_id: str = Depends(get_optional_user_id),
    service: VoiceService = Depends(get_voice_service)
):
    audio_bytes = service.generate_audio_from_text(
        text=payload.text, 
        voice=payload.voice,
        user_id=user_id
    )
    
    return Response(
        content=audio_bytes, 
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'attachment; filename="output.wav"'
        }
    )