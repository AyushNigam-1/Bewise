import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class VoiceService:
    """Service class for Text-to-Speech generation, injecting the Groq API client."""
    
    def __init__(self, tts_client):
        self.client = tts_client

    def generate_audio_from_text(
        self, text: str, voice: str = "troy", user_id: str = "anonymous"
    ) -> bytes:
        """
        Takes text and a voice ID, calls the TTS API,
        and returns the raw audio bytes.
        """
        log_context = { 
            "user_id": user_id,
            "action": "audio_generation",
            "voice": voice,
            "text_length": len(text)
        }

        try:
            response = self.client.audio.speech.create(
                model="canopylabs/orpheus-v1-english",
                voice=voice,
                input=text,
                response_format="wav",
            )

            audio_bytes = response.read()

            log_context["audio_size_kb"] = round(len(audio_bytes) / 1024, 2)
            logger.info("Audio generated successfully", extra=log_context)
            
            return audio_bytes

        except Exception as e:
            logger.exception("Failed to generate audio via Groq API", extra=log_context)
            raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}") from e


def get_voice_service() -> VoiceService:
    from groq import Groq
    
    # Instantiate the real Groq client here so it only connects in production
    client = Groq()
    return VoiceService(tts_client=client)