import time
import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.routing import APIRoute
import sentry_sdk
from posthog import Posthog
import os

logger = logging.getLogger(__name__)

# Initialize PostHog globally
POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY", "")
posthog = Posthog(
    POSTHOG_API_KEY, 
    host=os.getenv("POSTHOG_HOST", "https://us.i.posthog.com"),
    disabled=not bool(POSTHOG_API_KEY)
)

class TelemetryRoute(APIRoute):
    """
    A custom APIRoute that automatically tracks latency, errors, and usage 
    for every single endpoint in the FastAPI application.
    """
    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            start_time = time.time()
            
            route_name = f"{request.method} {self.path}"
            
            user_id = getattr(request.state, "user_id", None) or request.headers.get("x-user-id", "anonymous")

            with sentry_sdk.isolation_scope() as scope:
                scope.set_user({"id": user_id})
                scope.set_tag("endpoint", route_name)
                
                try:
                    response: Response = await original_route_handler(request)
                    
                    latency = round(time.time() - start_time, 4)
                    
                    posthog.capture(
                        distinct_id=user_id,
                        event="api_request_completed",
                        properties={
                            "endpoint": route_name,
                            "status_code": response.status_code,
                            "latency_seconds": latency
                        }
                    )
                    return response
                    
                except Exception as e:
                    latency = round(time.time() - start_time, 4)
                    
                    posthog.capture(
                        distinct_id=user_id,
                        event="api_request_failed",
                        properties={
                            "endpoint": route_name,
                            "error": str(e),
                            "latency_seconds": latency
                        }
                    )
                    
                    raise e

        return custom_route_handler