import time
import hmac
import hashlib
from functools import wraps
from typing import Dict, Optional

class APISecurity:
    def __init__(self):
        self.secret_key = "your-secret-key-change-this"
        self.blacklisted_tokens = set()

    def verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook or API signatures"""
        expected = hmac.new(
            self.secret_key.encode(), 
            payload.encode(), 
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def rate_limiter(self, limit: int = 100, window: int = 60):
        """
        Simple in-memory rate limiter decorator.
        Note: For production, use Redis.
        """
        history = {}
        
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                # Mocking IP retrieval from args context
                # In Flask/Django this would access request object
                ip = "127.0.0.1" 
                
                now = time.time()
                if ip not in history:
                    history[ip] = []
                
                # Clean old requests
                history[ip] = [t for t in history[ip] if now - t < window]
                
                if len(history[ip]) >= limit:
                    return {"error": "Rate limit exceeded"}, 429
                
                history[ip].append(now)
                return f(*args, **kwargs)
            return wrapper
        return decorator

    def require_role(self, role: str):
        """Mock role checker decorator"""
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                # Mock user context logic
                user_role = "admin" # Replace with actual check
                if user_role != role:
                    return {"error": "Unauthorized"}, 403
                return f(*args, **kwargs)
            return wrapper
        return decorator

# Initialize
api_security = APISecurity()