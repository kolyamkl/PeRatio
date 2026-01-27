# Security Hardening Documentation

## Overview

This document outlines the security measures implemented in the TG_TRADE backend following OWASP best practices.

## Security Features Implemented

### 1. Rate Limiting

**Implementation**: `security.py` - `RateLimiter` and `RateLimitMiddleware`

**Default Limits**:
- **Per Minute**: 60 requests
- **Per Hour**: 1000 requests  
- **Burst Protection**: 10 requests in 10 seconds

**Stricter Limits for Sensitive Endpoints**:
- `/api/llm/generate-trade`: 10/min, 100/hour, 3 burst
- `/api/trades/execute`: 10/min, 100/hour, 3 burst
- `/api/pear-signal/broadcast`: 10/min, 100/hour, 3 burst

**Tracking**: IP-based and user-based (combined identifier)

**Response**: HTTP 429 with `Retry-After` header

**OWASP Mapping**: A04:2021 - Insecure Design

### 2. Input Validation & Sanitization

**Implementation**: `schemas.py` with Pydantic validators

**Validations Applied**:

#### String Fields
- **Length Limits**: All strings have max length constraints
- **Pattern Matching**: Regex validation for specific formats
- **Null Byte Removal**: Prevents injection attacks
- **Whitespace Trimming**: Removes leading/trailing whitespace

#### Numeric Fields
- **Range Validation**: Min/max constraints on all numbers
- **Type Checking**: Strict type enforcement
- **Financial Limits**: Max $1M per asset, max 100x leverage

#### User IDs
- **Format**: `^[a-zA-Z0-9_\-\.]+$`
- **Max Length**: 100 characters
- **Sanitization**: Applied via `sanitize_user_id()`

#### Trade IDs
- **Format**: `^tr_[a-f0-9]{10}$`
- **Validation**: Strict format enforcement

#### Trading Symbols
- **Format**: `^[A-Z0-9\-]+$`
- **Max Length**: 20 characters
- **Case**: Uppercase only

#### Baskets
- **Max Assets**: 20 per basket (prevents DoS)
- **Max Total Weight**: 20.0 (2000%)
- **Weight Range**: 0.0 - 10.0 per asset

#### TP/SL Ratios
- **Range**: -1.0 to 1.0 (decimal form)
- **TP Validation**: Must be positive
- **SL Validation**: Must be negative

**Extra Fields**: Rejected via `extra = "forbid"` in all schemas

**OWASP Mapping**: A03:2021 - Injection

### 3. Security Headers

**Implementation**: `security.py` - `SecurityHeadersMiddleware`

**Headers Applied**:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**OWASP Mapping**: A05:2021 - Security Misconfiguration

### 4. API Key Management

**Implementation**: All API keys stored in environment variables only

**Secure Handling**:
- ✅ No hardcoded keys in source code
- ✅ Keys loaded from `.env` file (gitignored)
- ✅ Keys never logged in full
- ✅ Keys never exposed to client-side code
- ✅ Pydantic `Field` with `validation_alias` for env mapping

**Sensitive Keys**:
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY` (legacy, to be removed)
- `PEAR_ACCESS_TOKEN`
- `PEAR_AGENT_API_KEY`
- `TELEGRAM_API_HASH`
- `PEAR_PRIVATE_KEY`

**Key Rotation**: Recommended every 90 days

**OWASP Mapping**: A07:2021 - Identification and Authentication Failures

### 5. Database Security

**Implementation**: SQLModel with parameterized queries

**Protections**:
- ✅ Parameterized queries (prevents SQL injection)
- ✅ ORM-based access (SQLModel/SQLAlchemy)
- ✅ No raw SQL execution
- ✅ Connection pooling with limits
- ✅ Database credentials in environment variables

**OWASP Mapping**: A03:2021 - Injection

### 6. CORS Configuration

**Implementation**: Configurable via `CORS_ORIGINS` environment variable

**Default**: `*` (development only)

**Production Recommendation**:
```bash
CORS_ORIGINS=https://your-frontend-domain.com,https://api.telegram.org
```

**OWASP Mapping**: A05:2021 - Security Misconfiguration

## Security Best Practices

### Environment Variables

**Required for Production**:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
POSTGRES_PASSWORD=strong_random_password

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# Pear Protocol
PEAR_ACCESS_TOKEN=your_pear_token
PEAR_USER_WALLET=0x...
PEAR_AGENT_API_KEY=your_api_key

# Backend URLs
BACKEND_URL=https://api.yourdomain.com
MINI_APP_URL=https://app.yourdomain.com

# CORS (production)
CORS_ORIGINS=https://app.yourdomain.com
```

### Secrets Management

**Development**: `.env` file (gitignored)

**Production**: Use secure secret management:
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Kubernetes Secrets

### HTTPS/TLS

**Requirement**: All production deployments MUST use HTTPS

**Implementation**:
- Use AWS ALB with ACM certificate
- Or use nginx with Let's Encrypt
- Enable HSTS header (uncomment in `security.py`)

### Logging Security

**Current Implementation**:
- ✅ API keys never logged in full
- ✅ Sensitive data masked in logs
- ✅ User IDs logged for audit trail

**Recommendations**:
- Implement log rotation
- Use centralized logging (CloudWatch, ELK)
- Monitor for suspicious patterns

## Testing Security

### Rate Limiting Test
```bash
# Should return 429 after 10 requests in 10 seconds
for i in {1..15}; do
  curl -X POST http://localhost:8000/api/llm/generate-trade \
    -H "Content-Type: application/json" \
    -d '{"userId":"test_user"}'
done
```

### Input Validation Test
```bash
# Should return 422 for invalid user ID
curl -X POST http://localhost:8000/api/llm/generate-trade \
  -H "Content-Type: application/json" \
  -d '{"userId":"invalid@user#id"}'

# Should return 422 for SQL injection attempt
curl -X POST http://localhost:8000/api/llm/generate-trade \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin'\'' OR 1=1--"}'
```

### Security Headers Test
```bash
# Check security headers are present
curl -I http://localhost:8000/health
```

## Vulnerability Scanning

**Recommended Tools**:
- `safety` - Python dependency vulnerability scanner
- `bandit` - Python security linter
- `trivy` - Container vulnerability scanner
- `OWASP ZAP` - Web application security scanner

**Run Scans**:
```bash
# Install tools
pip install safety bandit

# Scan dependencies
safety check

# Scan code
bandit -r backend/

# Scan Docker image
trivy image tg_trade-backend:latest
```

## Incident Response

### If API Key is Compromised

1. **Immediate**: Rotate the compromised key
2. **Audit**: Check logs for unauthorized access
3. **Update**: Deploy new key to all environments
4. **Monitor**: Watch for suspicious activity

### If Rate Limit is Bypassed

1. **Investigate**: Check logs for attack patterns
2. **Block**: Add IP to blocklist if needed
3. **Adjust**: Tighten rate limits if necessary
4. **Scale**: Consider using Redis for distributed rate limiting

## Compliance

### OWASP Top 10 Coverage

- ✅ A01:2021 - Broken Access Control (rate limiting)
- ✅ A02:2021 - Cryptographic Failures (HTTPS, secure storage)
- ✅ A03:2021 - Injection (input validation, parameterized queries)
- ✅ A04:2021 - Insecure Design (rate limiting, validation)
- ✅ A05:2021 - Security Misconfiguration (headers, CORS)
- ✅ A06:2021 - Vulnerable Components (dependency management)
- ✅ A07:2021 - Authentication Failures (secure key handling)
- ⚠️ A08:2021 - Software and Data Integrity (TODO: implement signing)
- ⚠️ A09:2021 - Security Logging (partial - needs enhancement)
- ✅ A10:2021 - Server-Side Request Forgery (input validation)

## Future Enhancements

### High Priority
1. **Distributed Rate Limiting**: Migrate to Redis
2. **Request Signing**: Implement HMAC signatures
3. **Audit Logging**: Enhanced security event logging
4. **WAF**: Web Application Firewall (AWS WAF, Cloudflare)

### Medium Priority
1. **2FA**: Two-factor authentication for admin operations
2. **IP Allowlisting**: Restrict admin endpoints
3. **Automated Scanning**: CI/CD security checks
4. **Penetration Testing**: Regular security audits

### Low Priority
1. **Rate Limit Analytics**: Dashboard for monitoring
2. **Anomaly Detection**: ML-based threat detection
3. **DDoS Protection**: Cloudflare or AWS Shield

## Contact

For security issues, please contact: security@yourdomain.com

**Do NOT** open public GitHub issues for security vulnerabilities.
