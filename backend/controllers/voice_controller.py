import time

import sentry_sdk
from core.analytics import posthog
from fastapi import HTTPException
from groq import Groq

client = Groq()


def generate_audio_from_text(
    text: str, voice: str = "troy", user_id: str = "anonymous"
) -> bytes:
    """
    Takes text and a voice ID, calls the Groq TTS API,
    and returns the raw audio bytes.
    """
    start_time = time.time()

    # 🌟 Track that a user requested audio
    posthog.capture(
        distinct_id=user_id,
        event="audio_generation_requested",
        properties={"voice": voice, "text_length": len(text)},
    )

    try:
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=voice,
            input=text,
            response_format="wav",
        )

        audio_bytes = response.read()

        # 🌟 Track successful generation and speed
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id,
            event="audio_generation_success",
            properties={
                "voice": voice,
                "latency_seconds": round(latency, 2),
                "audio_size_kb": round(len(audio_bytes) / 1024, 2),
            },
        )

        return audio_bytes

    except Exception as e:
        latency = time.time() - start_time

        # 🚨 SENTRY: Catch API keys expiring or Groq downtime
        sentry_sdk.capture_exception(e)

        # 🌟 POSTHOG: Track the failure so you know if your users are seeing errors
        posthog.capture(
            distinct_id=user_id,
            event="audio_generation_failed",
            properties={
                "voice": voice,
                "error": str(e),
                "latency_seconds": round(latency, 2),
            },
        )

        print(e)
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")
