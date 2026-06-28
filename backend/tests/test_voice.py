import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from controllers.voice_controller import VoiceService


# --- 1. Construct the DI Service for Testing ---
@pytest.fixture
def mock_groq_client():
    """Creates a fake Groq client for testing without hitting the network."""
    return MagicMock()


@pytest.fixture
def service(mock_groq_client):
    """Injects the fake Groq client into our VoiceService."""
    return VoiceService(tts_client=mock_groq_client)


# --- 2. The Tests ---
@pytest.mark.unit
def test_generate_audio_success(service, mock_groq_client):
    """
    Tests the happy path: Groq returns audio bytes successfully.
    """
    # 1. Arrange: Setup the fake Groq API response
    fake_response = MagicMock()
    fake_response.read.return_value = b"fake_audio_wav_bytes"
    mock_groq_client.audio.speech.create.return_value = fake_response

    text_payload = "Welcome to your generated audiobook."

    # 2. Act
    result = service.generate_audio_from_text(
        text=text_payload, voice="troy", user_id="user_123"
    )

    # 3. Assert correct output
    assert result == b"fake_audio_wav_bytes"

    # Verify Groq was called with the exact right parameters
    mock_groq_client.audio.speech.create.assert_called_once_with(
        model="canopylabs/orpheus-v1-english",
        voice="troy",
        input=text_payload,
        response_format="wav",
    )


@pytest.mark.unit
def test_generate_audio_groq_failure(service, mock_groq_client):
    """
    Tests the sad path: Groq API goes down, ensuring the controller raises an HTTP 500.
    """
    # 1. Arrange: Force the Groq client to throw a network or token error
    mock_groq_client.audio.speech.create.side_effect = Exception(
        "Insufficient Quota or 503 Service Unavailable"
    )

    # 2. Act & Assert: FastAPI should catch the error and raise an HTTP 500
    with pytest.raises(HTTPException) as exc_info:
        service.generate_audio_from_text(
            text="Fail me.", voice="troy", user_id="user_123"
        )

    assert exc_info.value.status_code == 500
    assert "Groq API Error" in exc_info.value.detail