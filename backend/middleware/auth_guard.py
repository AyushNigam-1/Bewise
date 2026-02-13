from fastapi import Request, HTTPException
from jose import jwt
import os

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

async def require_user(request: Request):

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(401,"Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        request.state.user = payload["sub"]
        return payload

    except:
        raise HTTPException(401,"Invalid token")
        
