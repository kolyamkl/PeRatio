"""
Security middleware and utilities for the TG_TRADE backend.

Implements:
- Rate limiting (IP-based and user-based)
- Input sanitization
- Security headers
- Request validation

OWASP Best Practices:
- A07:2021 - Identification and Authentication Failures
- A04:2021 - Insecure Design
- A05:2021 - Security Misconfiguration
"""
import time
import logging
import re
from typing import Dict, Optional, Callable
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimiter:
    """
    In-memory rate limiter with IP and user-based tracking.
    
    For production, consider using Redis for distributed rate limiting.
    """
    
    def __init__(
        self,
        requests_per_minute: int = 120,
        requests_per_hour: int = 2000,
        burst_size: int = 30
    ):
        """
        Initialize rate limiter with configurable limits.
        
        Args:
            requests_per_minute: Max requests per minute per identifier
            requests_per_hour: Max requests per hour per identifier
            burst_size: Max burst requests in short time window
        """
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_size = burst_size
        
        # Track requests: {identifier: [(timestamp, count), ...]}
        self.minute_buckets: Dict[str, list] = defaultdict(list)
        self.hour_buckets: Dict[str, list] = defaultdict(list)
        self.burst_buckets: Dict[str, list] = defaultdict(list)
        
        # Last cleanup time
        self.last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove expired entries to prevent memory bloat"""
        now = time.time()
        
        # Cleanup every 5 minutes
        if now - self.last_cleanup < 300:
            return
        
        cutoff_minute = now - 60
        cutoff_hour = now - 3600
        cutoff_burst = now - 10  # 10 second burst window
        
        # Clean minute buckets
        for key in list(self.minute_buckets.keys()):
            self.minute_buckets[key] = [
                (ts, count) for ts, count in self.minute_buckets[key]
                if ts > cutoff_minute
            ]
            if not self.minute_buckets[key]:
                del self.minute_buckets[key]
        
        # Clean hour buckets
        for key in list(self.hour_buckets.keys()):
            self.hour_buckets[key] = [
                (ts, count) for ts, count in self.hour_buckets[key]
                if ts > cutoff_hour
            ]
            if not self.hour_buckets[key]:
                del self.hour_buckets[key]
        
        # Clean burst buckets
        for key in list(self.burst_buckets.keys()):
            self.burst_buckets[key] = [
                (ts, count) for ts, count in self.burst_buckets[key]
                if ts > cutoff_burst
            ]
            if not self.burst_buckets[key]:
                del self.burst_buckets[key]
        
        self.last_cleanup = now
    
    def is_allowed(self, identifier: str) -> tuple[bool, Optional[str]]:
        """
        Check if request is allowed for given identifier.
        
        Args:
            identifier: IP address or user ID
            
        Returns:
            (allowed, error_message) tuple
        """
        now = time.time()
        self._cleanup_old_entries()
        
        # Check burst limit (10 requests in 10 seconds)
        burst_window = now - 10
        burst_requests = sum(
            count for ts, count in self.burst_buckets[identifier]
            if ts > burst_window
        )
        if burst_requests >= self.burst_size:
            retry_after = 10
            return False, f"Rate limit exceeded (burst). Retry after {retry_after}s"
        
        # Check per-minute limit
        minute_window = now - 60
        minute_requests = sum(
            count for ts, count in self.minute_buckets[identifier]
            if ts > minute_window
        )
        if minute_requests >= self.requests_per_minute:
            retry_after = 60
            return False, f"Rate limit exceeded. Retry after {retry_after}s"
        
        # Check per-hour limit
        hour_window = now - 3600
        hour_requests = sum(
            count for ts, count in self.hour_buckets[identifier]
            if ts > hour_window
        )
        if hour_requests >= self.requests_per_hour:
            retry_after = 3600
            return False, f"Rate limit exceeded (hourly). Retry after {retry_after}s"
        
        # Record this request
        self.burst_buckets[identifier].append((now, 1))
        self.minute_buckets[identifier].append((now, 1))
        self.hour_buckets[identifier].append((now, 1))
        
        return True, None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for rate limiting.
    
    Applies different limits based on endpoint sensitivity.
    """
    
    def __init__(self, app, limiter: RateLimiter):
        super().__init__(app)
        self.limiter = limiter
        
        # Stricter limits for sensitive endpoints
        self.strict_limiter = RateLimiter(
            requests_per_minute=10,
            requests_per_hour=100,
            burst_size=3
        )
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for health checks and OPTIONS preflight requests
        if request.url.path in ["/health", "/docs", "/openapi.json"] or request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client identifier (IP + user if available)
        client_ip = request.client.host if request.client else "unknown"
        user_id = request.headers.get("X-User-ID", "")
        identifier = f"{client_ip}:{user_id}" if user_id else client_ip
        
        # Use strict limiter for sensitive endpoints
        limiter = self.limiter
        if any(path in request.url.path for path in [
            "/api/llm/generate-trade",
            "/api/trades/execute",
            "/api/pear-signal/broadcast"
        ]):
            limiter = self.strict_limiter
        
        # Check rate limit
        allowed, error_msg = limiter.is_allowed(identifier)
        
        if not allowed:
            logger.warning(
                f"[RATE_LIMIT] Blocked request from {identifier} "
                f"to {request.url.path}: {error_msg}"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": error_msg,
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        response = await call_next(request)
        return response


# ============================================================================
# INPUT SANITIZATION
# ============================================================================

def sanitize_string(value: str, max_length: int = 1000) -> str:
    """
    Sanitize string input to prevent injection attacks.
    
    Args:
        value: Input string
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
        
    Raises:
        ValueError: If input is invalid
    """
    if not isinstance(value, str):
        raise ValueError("Input must be a string")
    
    # Enforce length limit
    if len(value) > max_length:
        raise ValueError(f"Input exceeds maximum length of {max_length}")
    
    # Remove null bytes (potential for injection)
    value = value.replace('\x00', '')
    
    # Strip leading/trailing whitespace
    value = value.strip()
    
    return value


def sanitize_user_id(user_id: str) -> str:
    """
    Sanitize and validate user ID.
    
    Args:
        user_id: User identifier
        
    Returns:
        Sanitized user ID
        
    Raises:
        ValueError: If user ID is invalid
    """
    user_id = sanitize_string(user_id, max_length=100)
    
    # User IDs should be alphanumeric with limited special chars
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', user_id):
        raise ValueError("Invalid user ID format")
    
    return user_id


def sanitize_trade_id(trade_id: str) -> str:
    """
    Sanitize and validate trade ID.
    
    Args:
        trade_id: Trade identifier
        
    Returns:
        Sanitized trade ID
        
    Raises:
        ValueError: If trade ID is invalid
    """
    trade_id = sanitize_string(trade_id, max_length=50)
    
    # Trade IDs should match expected format (tr_xxxxxxxxxx)
    if not re.match(r'^tr_[a-f0-9]{10}$', trade_id):
        raise ValueError("Invalid trade ID format")
    
    return trade_id


def sanitize_symbol(symbol: str) -> str:
    """
    Sanitize trading symbol.
    
    Args:
        symbol: Trading symbol (e.g., BTC-PERP)
        
    Returns:
        Sanitized symbol
        
    Raises:
        ValueError: If symbol is invalid
    """
    symbol = sanitize_string(symbol, max_length=20).upper()
    
    # Symbols should be alphanumeric with hyphen
    if not re.match(r'^[A-Z0-9\-]+$', symbol):
        raise ValueError("Invalid symbol format")
    
    return symbol


def validate_numeric_range(
    value: float,
    min_value: float,
    max_value: float,
    field_name: str
) -> float:
    """
    Validate numeric value is within acceptable range.
    
    Args:
        value: Numeric value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        field_name: Name of field for error messages
        
    Returns:
        Validated value
        
    Raises:
        ValueError: If value is out of range
    """
    if not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    
    if value < min_value or value > max_value:
        raise ValueError(
            f"{field_name} must be between {min_value} and {max_value}"
        )
    
    return value


# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    Implements OWASP recommended security headers.
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Strict transport security (HTTPS only)
        # Only enable in production with HTTPS
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.telegram.org https://api.pear.garden"
        )
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        
        return response
