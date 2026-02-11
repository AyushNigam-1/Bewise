import uvicorn
from fastapi import FastAPI
from routes.books import router as books_router
from routes.users import router as users_router
from routes.chatbot import router as chatbot_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://10.63.43.43:3001"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  # better to allow all headers for dev unless you're strict
)

app.include_router(books_router)
app.include_router(users_router)
app.include_router(chatbot_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)