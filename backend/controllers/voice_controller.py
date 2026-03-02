import os
from groq import Groq
from fastapi import HTTPException

client = Groq()

def generate_audio_from_text(text: str, voice: str = "troy") -> bytes:
    """
    Takes text and a voice ID, calls the Groq TTS API, 
    and returns the raw audio bytes.
    """
    try:
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=voice,
            input=text,
            response_format="wav" 
        )
        
        return response.read()

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")