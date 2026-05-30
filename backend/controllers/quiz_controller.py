import json
import hashlib
import time
import traceback
from typing import List, TypedDict
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableLambda
from core.llm import llm 
from core.redis import redis_client, CACHE_TTL 
import sentry_sdk 
from core.analytics import posthog

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class QuizData(BaseModel):
    quiz: List[QuizQuestion]

class GraphState(TypedDict):
    source_text: str
    generated_quiz: dict

def generate_quiz_node(state: GraphState):
    text = state["source_text"]
    system_prompt = "You are an expert educator. Generate a 3-question multiple-choice quiz based on the provided text."
    
    structured_llm = llm.with_structured_output(QuizData)
    
    messages = [
        ("system", system_prompt),
        ("human", f"Generate a quiz based on this text:\n\n{text}")
    ]
    
    result = structured_llm.invoke(messages)
    return {"generated_quiz": result.model_dump()}

workflow = StateGraph(GraphState)
workflow.add_node("generator", generate_quiz_node)
workflow.add_edge(START, "generator")
workflow.add_edge("generator", END)

quiz_graph = workflow.compile()

def generate_quiz_with_cache(input_data: dict):
    start_time = time.time()
    text = input_data.get("source_text", "")
    
    user_id = input_data.get("session_id", "anonymous")

    posthog.capture(
        distinct_id=user_id, 
        event='quiz_generation_requested', 
        properties={'text_length': len(text)}
    )

    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    cache_key = f"quiz:{text_hash}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            latency = time.time() - start_time
            posthog.capture(
                distinct_id=user_id, 
                event='quiz_generated', 
                properties={
                    'source': 'redis_cache',
                    'latency_seconds': round(latency, 2),
                    'text_length': len(text)
                }
            )
            return json.loads(cached)

        final_state = quiz_graph.invoke({"source_text": text})
        result = final_state["generated_quiz"]

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id, 
            event='quiz_generated', 
            properties={
                'source': 'llm_generation',
                'latency_seconds': round(latency, 2),
                'questions_count': len(result.get("quiz", [])),
                'text_length': len(text)
            }
        )
        
        return result

    except Exception as e:
        latency = time.time() - start_time
        
        sentry_sdk.capture_exception(e)
        
        posthog.capture(
            distinct_id=user_id, 
            event='quiz_generation_failed', 
            properties={
                'error': str(e),
                'latency_seconds': round(latency, 2)
            }
        )
        
        traceback.print_exc()
        raise Exception("Failed to generate quiz.")

quiz_runnable = RunnableLambda(generate_quiz_with_cache)