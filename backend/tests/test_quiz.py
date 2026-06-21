import json
from unittest.mock import patch

import controllers.quiz_controller as quiz_controller
import pytest


@pytest.fixture
def module_deps(patch_controller):
    return patch_controller(quiz_controller)


@pytest.mark.unit
@pytest.mark.rag
@patch("controllers.quiz_controller.quiz_graph.invoke")
def test_generate_quiz_cache_hit(mock_graph, module_deps):
    """
    Tests that if the quiz is already in Redis, it skips LangGraph entirely.
    """
    redis, _, _ = module_deps

    # 1. Arrange: Pre-populate our Fake Redis with a generated quiz
    source_text = "This is a book about Python."
    import hashlib

    text_hash = hashlib.md5(source_text.encode("utf-8")).hexdigest()

    cached_quiz = {
        "quiz": [
            {
                "question": "What is Python?",
                "options": ["A", "B"],
                "correct_answer": "A",
                "explanation": "...",
            }
        ]
    }

    # Updated to use standard .set() for consistency with your other tests
    redis.set(f"quiz:{text_hash}", json.dumps(cached_quiz))

    payload = {"source_text": source_text, "session_id": "test_user"}

    # 2. Act
    result = quiz_controller.generate_quiz_with_cache(payload)

    # 3. Assert
    assert result == cached_quiz
    mock_graph.assert_not_called()  # Proves we saved money by skipping the LLM!


@pytest.mark.unit
@pytest.mark.rag
@patch("controllers.quiz_controller.quiz_graph.invoke")
def test_generate_quiz_llm_generation(mock_graph, module_deps):
    """
    Tests that an empty cache triggers LangGraph and saves the result to Redis.
    """
    redis, _, _ = module_deps

    # 1. Arrange: Set up what the fake LLM LangGraph will return
    fake_generated_quiz = {
        "quiz": [
            {
                "question": "New Question",
                "options": ["1", "2"],
                "correct_answer": "1",
                "explanation": "...",
            }
        ]
    }
    mock_graph.return_value = {"generated_quiz": fake_generated_quiz}

    payload = {
        "source_text": "Brand new text never seen before.",
        "session_id": "test_user",
    }

    # 2. Act
    result = quiz_controller.generate_quiz_with_cache(payload)

    # 3. Assert
    assert result == fake_generated_quiz
    mock_graph.assert_called_once()  # Proves we actually triggered the AI

    # Check that it was saved to Redis for next time
    import hashlib

    text_hash = hashlib.md5(payload["source_text"].encode("utf-8")).hexdigest()

    # fakeredis natively supports exists()
    assert redis.exists(f"quiz:{text_hash}")


@pytest.mark.unit
@pytest.mark.rag
@patch("controllers.quiz_controller.quiz_graph.invoke")
def test_generate_quiz_catastrophic_failure(mock_graph, module_deps):
    """
    Tests that a total LLM failure triggers the safety nets.
    """
    _, _, _ = module_deps

    # 1. Arrange: Force LangGraph to explode
    mock_graph.side_effect = Exception("Groq API Timeout")

    payload = {"source_text": "Make this explode.", "session_id": "test_user"}

    # 2. Act & Assert: We expect the code to raise an exception
    with pytest.raises(Exception) as exc_info:
        quiz_controller.generate_quiz_with_cache(payload)

    # Verify it raised your custom fallback message
    assert str(exc_info.value) == "Failed to generate quiz."