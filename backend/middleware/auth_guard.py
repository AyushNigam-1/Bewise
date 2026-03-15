from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from core.database import connect_db

PROTECTED_PREFIXES = [
    "/bookmark",
    "/recommend",
    "/bookmarks",
    "/insights/session-recommend"
]

class BetterAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.user = None
        path = request.url.path

        should_authenticate = any(path.startswith(prefix) for prefix in PROTECTED_PREFIXES)

        if should_authenticate:
            cookie = request.cookies.get("better-auth.session_token")
            
            if cookie:
                try:
                    session_token = cookie.split(".")[0]
                    conn = connect_db()
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT u.id, u.name, u.email 
                        FROM "session" s
                        JOIN "user" u ON s."userId" = u.id
                        WHERE s.token = %s AND s."expiresAt" > NOW()
                    """, (session_token,))
                    
                    user_row = cursor.fetchone()
                    cursor.close()
                    conn.close()

                    if user_row:
                        request.state.user = {
                            "id": user_row[0],
                            "name": user_row[1],
                            "email": user_row[2]
                        }
                except Exception as e:
                    print(f"Middleware DB Error: {e}")

        response = await call_next(request)
        return response