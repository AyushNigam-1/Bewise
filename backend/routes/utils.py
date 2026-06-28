from fastapi import Request, HTTPException

def get_current_user_id(request: Request) -> str:
    """Safely extracts the user ID from the request state injected by Middleware."""
    user = getattr(request.state, "user", None)
    if not user or "id" not in user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user["id"]

def get_optional_user_id(request: Request) -> str:
    """Safely extracts the user ID if present, otherwise returns 'anonymous'."""
    user = getattr(request.state, "user", None)
    return user["id"] if user and "id" in user else "anonymous"
