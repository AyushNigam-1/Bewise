import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from routes.books import router as books_router
from routes.users import router as users_router
from routes.voice import router as voice_router
from routes.chatbot import rag_ai_router
from routes.quiz import quiz_ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://10.126.224.43:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books_router)
app.include_router(users_router)
app.include_router(rag_ai_router)
app.include_router(voice_router)
app.include_router(quiz_ai_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)