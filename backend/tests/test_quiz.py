import json
import hashlib
import pytest
from unittest.mock import MagicMock, ANY
from controllers.quiz_controller import QuizService


# --- 1. Construct the DI Service for Testing ---
@pytest.fixture
def mock_redis():
    return MagicMock()


@pytest.fixture
def mock_llm():
    """Fake LLM client to satisfy the QuizService constructor."""
    return MagicMock()


@pytest.fixture
def service(mock_redis, mock_llm):
    """Injects fake dependencies and isolates the LangGraph execution."""
    svc = QuizService(redis_client=mock_redis, llm_client=mock_llm)
    # We mock the internal graph so we can test the caching logic 
    # without actually running LangChain nodes during unit tests.
    svc.quiz_graph = MagicMock()
    return svc


# --- 2. The Tests ---

@pytest.mark.unit
@pytest.mark.rag
def test_generate_quiz_cache_hit(service, mock_redis):
    """
    Tests that if the quiz is already in Redis, it skips LangGraph entirely.
    """
    # 1. Arrange: Pre-populate our Fake Redis with a generated quiz
    source_text = "This is a book about Python."
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

    mock_redis.get.return_value = json.dumps(cached_quiz)

    # 2. Act
    result = service.generate_quiz(text=source_text, user_id="test_user")

    # 3. Assert
    assert result == cached_quiz
    mock_redis.get.assert_called_once_with(f"quiz:{text_hash}")
    service.quiz_graph.invoke.assert_not_called()  # Proves we skipped the AI!


@pytest.mark.unit
@pytest.mark.rag
def test_generate_quiz_llm_generation(service, mock_redis):
    """
    Tests that an empty cache triggers LangGraph and saves the result to Redis.
    """
    # 1. Arrange: Fake a cache miss
    mock_redis.get.return_value = None

    source_text = "Brand new text never seen before."
    text_hash = hashlib.md5(source_text.encode("utf-8")).hexdigest()

    # Set up what the fake LLM LangGraph will return
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
    service.quiz_graph.invoke.return_value = {"generated_quiz": fake_generated_quiz}

    # 2. Act
    result = service.generate_quiz(text=source_text, user_id="test_user")

    # 3. Assert
    assert result == fake_generated_quiz
    service.quiz_graph.invoke.assert_called_once_with({"source_text": source_text})

    # Check that it was saved to Redis for next time
    mock_redis.setex.assert_called_once_with(
        f"quiz:{text_hash}", 
        ANY, # CACHE_TTL
        json.dumps(fake_generated_quiz)
    )


@pytest.mark.unit
@pytest.mark.rag
def test_generate_quiz_catastrophic_failure(service, mock_redis):
    """
    Tests that a total LLM failure triggers the safety nets.
    """
    # 1. Arrange: Fake a cache miss and force LangGraph to explode
    mock_redis.get.return_value = None
    service.quiz_graph.invoke.side_effect = Exception("Groq API Timeout")

    source_text = "Make this explode."

    # 2. Act & Assert: We expect the code to raise an exception
    with pytest.raises(Exception) as exc_info:
        service.generate_quiz(text=source_text, user_id="test_user")

    # Verify it raised your custom fallback message
    assert str(exc_info.value) == "Failed to generate quiz."