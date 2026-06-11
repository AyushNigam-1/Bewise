from fastapi import HTTPException
from groq import Groq
from core.telemetry import NodeTracker

client = Groq()

def generate_audio_from_text(
    text: str, voice: str = "troy", user_id: str = "anonymous"
) -> bytes:
    """
    Takes text and a voice ID, calls the Groq TTS API,
    and returns the raw audio bytes.
    """

    with NodeTracker("audio_generation", session_id=user_id) as tracker:
        
        tracker.add_data(voice=voice, text_length=len(text))

        try:
            response = client.audio.speech.create(
                model="canopylabs/orpheus-v1-english",
                voice=voice,
                input=text,
                response_format="wav",
            )

            audio_bytes = response.read()

            tracker.add_data(audio_size_kb=round(len(audio_bytes) / 1024, 2))
            
            return audio_bytes

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}") from e