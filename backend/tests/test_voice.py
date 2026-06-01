from unittest.mock import MagicMock, patch

import controllers.voice_controller as voice_controller
import pytest
from fastapi import HTTPException


@pytest.fixture
def module_deps(patch_controller):
    return patch_controller(voice_controller)


@pytest.mark.unit
@patch("controllers.voice_controller.client")
def test_generate_audio_success(mock_groq_client, module_deps):
    """
    Tests the happy path: Groq returns audio bytes successfully.
    """
    posthog, _ = module_deps

    # 1. Arrange: Setup the fake Groq API response
    fake_response = MagicMock()
    fake_response.read.return_value = b"fake_audio_wav_bytes"
    mock_groq_client.audio.speech.create.return_value = fake_response

    text_payload = "Welcome to your generated audiobook."

    # 2. Act
    result = voice_controller.generate_audio_from_text(
        text=text_payload, voice="troy", user_id="user_123"
    )

    # 3. Assert
    assert result == b"fake_audio_wav_bytes"

    # Verify Groq was called with the exact right parameters
    mock_groq_client.audio.speech.create.assert_called_once_with(
        model="canopylabs/orpheus-v1-english",
        voice="troy",
        input=text_payload,
        response_format="wav",
    )

    # Verify Analytics: Should be called twice (requested -> success)
    assert posthog.capture.call_count == 2
    assert (
        posthog.capture.call_args_list[0].kwargs["event"]
        == "audio_generation_requested"
    )
    assert (
        posthog.capture.call_args_list[1].kwargs["event"] == "audio_generation_success"
    )


@pytest.mark.unit
@patch("controllers.voice_controller.client")
def test_generate_audio_groq_failure(mock_groq_client, module_deps):
    """
    Tests the sad path: Groq API goes down, ensuring Sentry and PostHog catch it.
    """
    posthog, sentry = module_deps

    # 1. Arrange: Force the Groq client to throw a network or token error
    mock_groq_client.audio.speech.create.side_effect = Exception(
        "Insufficient Quota or 503 Service Unavailable"
    )

    # 2. Act & Assert: FastAPI should catch the error and raise an HTTP 500
    with pytest.raises(HTTPException) as exc_info:
        voice_controller.generate_audio_from_text(
            text="Fail me.", voice="troy", user_id="user_123"
        )

    assert exc_info.value.status_code == 500
    assert "Groq API Error" in exc_info.value.detail

    # 3. Verify Safety Nets
    sentry.assert_called_once()  # Alerts you on Slack/Email that Groq is down

    # Verify Analytics: Should be called twice (requested -> failed)
    assert posthog.capture.call_count == 2
    assert (
        posthog.capture.call_args_list[1].kwargs["event"] == "audio_generation_failed"
    )
    assert (
        "Insufficient Quota"
        in posthog.capture.call_args_list[1].kwargs["properties"]["error"]
    )
