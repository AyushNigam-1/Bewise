import uvicorn
from fastapi import FastAPI
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from middleware.auth_guard import BetterAuthMiddleware
from routes.books import router as books_router
from routes.users import router as users_router
from routes.voice import router as voice_router
from routes.chatbot import rag_ai_router 
from routes.quiz import quiz_ai_router
from core.analytics import posthog

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield



sentry_sdk.init(
    dsn="https://117ffe4b4489c70b8bc6b28005e777df@o4511026054561792.ingest.de.sentry.io/4511059781353552",
    send_default_pii=True,
)

app = FastAPI(lifespan=lifespan)

app.add_middleware(BetterAuthMiddleware)

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

app.on_event("shutdown")
def shutdown_event():
    # Flushes the queue when the server shuts down so you don't lose data
    posthog.flush()

@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)