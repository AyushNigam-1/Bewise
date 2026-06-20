import logging
from fastapi import HTTPException
from groq import Groq

# 1. Standard Python logger handles everything
logger = logging.getLogger(__name__)

client = Groq()

def generate_audio_from_text(
    text: str, voice: str = "troy", user_id: str = "anonymous"
) -> bytes:
    """
    Takes text and a voice ID, calls the Groq TTS API,
    and returns the raw audio bytes.
    """
    # 2. Bundle metadata locally
    log_context = {
        "user_id": user_id,
        "action": "audio_generation",
        "voice": voice,
        "text_length": len(text)
    }

    try:
        response = client.audio.speech.create(
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
        # 3. Native logger captures the stack trace, and Sentry automatically attaches the extra context!
        logger.exception("Failed to generate audio via Groq API", extra=log_context)
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}") from e