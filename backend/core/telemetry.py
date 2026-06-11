import os
import time
import logging
import sentry_sdk
from posthog import Posthog

logger = logging.getLogger(__name__)


posthog = Posthog(
    os.getenv("POSTHOG_API_KEY", ""), 
    host=os.getenv("POSTHOG_HOST", "https://app.posthog.com")
)

def init_telemetry():
    """Call this when the application starts."""
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        send_default_pii=True,
    )
    logger.info("Sentry and Telemetry initialized.")

def flush_telemetry():
    """Call this when the application shuts down."""
    posthog.flush()
    sentry_sdk.flush()
    logger.info("Telemetry flushed cleanly.")


class NodeTracker:
    """A Universal Context Manager for Sync and Async tracking."""
    
    def __init__(self, event_name: str, session_id: str = "anonymous"):
        self.event_name = event_name
        self.session_id = session_id or "anonymous" 
        self.start_time = None
        self.properties = {}

    def add_data(self, **kwargs):
        self.properties.update(kwargs)

    def _handle_exit(self, exc_type, exc_val):
        """Shared logic for both sync and async exits."""
        latency = round(time.time() - self.start_time, 2)
        self.properties["latency_seconds"] = latency

        if exc_type is not None:
            logger.error(f"Error in {self.event_name}: {exc_val}")
            sentry_sdk.capture_exception(exc_val)
            
            posthog.capture(
                distinct_id=self.session_id,
                event=f"{self.event_name}_failed",
                properties={**self.properties, "error": str(exc_val)}
            )
            return False 
        
        posthog.capture(
            distinct_id=self.session_id,
            event=f"{self.event_name}_completed",
            properties=self.properties
        )
        return True

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._handle_exit(exc_type, exc_val)

    async def __aenter__(self):
        self.start_time = time.time()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return self._handle_exit(exc_type, exc_val)