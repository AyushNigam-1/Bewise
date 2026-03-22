from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from datetime import datetime
from core.database import engine
from core.models import User, AuthSession

PROTECTED_PREFIXES = [
    "/bookmark",
    "/recommend",
    "/bookmarks",
    "/insights/session-recommend"
]

class SessionAuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        
        request.state.user = None
        path = request.url.path

        should_authenticate = any(path.startswith(prefix) for prefix in PROTECTED_PREFIXES)

        if should_authenticate:
            cookie = request.cookies.get("better-auth.session_token")
            
            if cookie:
                try:
                    session_token = cookie.split(".")[0]
                    
                    with Session(engine) as db:
                        statement = (
                            select(User)
                            .join(AuthSession, AuthSession.userId == User.id)
                            .where(AuthSession.token == session_token)
                            .where(AuthSession.expiresAt > datetime.now())
                        )
                        
                        user = db.exec(statement).first()

                        if user:
                            request.state.user = {
                                "id": user.id,
                                "name": user.name,
                                "email": user.email
                            }
                except Exception as e:
                    print(f"Middleware DB Error: {e}")

            if not request.state.user:
                return JSONResponse(
                    status_code=401, 
                    content={"detail": "Not authenticated"}
                )

        response = await call_next(request)
        return response