import os
from typing import Dict, List
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

# --- Memory Store ---
store: Dict[str, ChatMessageHistory] = {}

def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# --- Schema & Parser ---
class RAGResponse(BaseModel):
    answer: str = Field(description="Short answer to user question")
    ids: List[int] = Field(description="List of relevant insight ids. Empty if none.")

parser = PydanticOutputParser(pydantic_object=RAGResponse)

# --- LLM Instance ---
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)

# --- Prompt & Chain Setup ---
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Bookist AI. You ONLY answer using provided insights."),
    ("human", "{input}\n\n{format}")
])

chain = prompt | llm

# Expose this 'chat' instance to be imported by the controllers
chat = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
)