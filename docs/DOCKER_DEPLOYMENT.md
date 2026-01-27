# Docker Deployment Guide

## Quick Start

### 1. Setup Environment Variables
```bash
# Copy example env file
cp env.example .env

# Edit .env with your actual values
nano .env
```

Required variables:
- `POSTGRES_PASSWORD` - PostgreSQL password
- `OPENAI_API_KEY` - Your OpenAI API key
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `BACKEND_URL` - Your public backend URL (for webhooks)

### 2. Build and Run Locally
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 3. Production Deployment (AWS)
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## AWS Deployment Options

### Option 1: AWS ECS (Elastic Container Service)
1. Push images to ECR:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL

# Tag and push backend
docker tag tg_trade_backend:latest YOUR_ECR_URL/tg_trade_backend:latest
docker push YOUR_ECR_URL/tg_trade_backend:latest

# Tag and push frontend
docker tag tg_trade_frontend:latest YOUR_ECR_URL/tg_trade_frontend:latest
docker push YOUR_ECR_URL/tg_trade_frontend:latest
```

2. Create ECS task definitions for each service
3. Create ECS service with load balancer
4. Use RDS for PostgreSQL (recommended)

### Option 2: AWS EC2 with Docker Compose
1. Launch EC2 instance (t3.medium or larger)
2. Install Docker and Docker Compose
3. Clone repository
4. Setup environment variables
5. Run `docker-compose -f docker-compose.prod.yml up -d`

### Option 3: AWS Lightsail
1. Create Lightsail container service
2. Push images to Lightsail
3. Configure container service with 3 containers
4. Use managed PostgreSQL database

## Database Management

### Backup PostgreSQL
```bash
# Create backup
docker exec tg_trade_postgres pg_dump -U postgres tg_trade > backup.sql

# Restore backup
docker exec -i tg_trade_postgres psql -U postgres tg_trade < backup.sql
```

### Access PostgreSQL
```bash
docker exec -it tg_trade_postgres psql -U postgres -d tg_trade
```

## Monitoring

### Check Service Health
```bash
# Check all services
docker-compose ps

# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost/
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify PostgreSQL is healthy: `docker-compose ps postgres`
- Check logs: `docker-compose logs backend`

### Frontend can't reach backend
- Verify nginx.conf proxy settings
- Check backend is running: `curl http://localhost:8000/health`
- Check Docker network: `docker network inspect tg_trade_tg_trade_network`

### Database connection issues
- Ensure PostgreSQL is fully started before backend
- Check password in .env matches
- Verify port 5432 is not in use: `lsof -i :5432`

## Scaling

### Horizontal Scaling
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Add load balancer (nginx or AWS ALB)
```

### Vertical Scaling
Update docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Security

### Production Checklist
- [ ] Change default PostgreSQL password
- [ ] Use secrets management (AWS Secrets Manager)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Enable Docker security scanning
- [ ] Set up monitoring and alerts
- [ ] Regular backups
- [ ] Update base images regularly

## Cost Optimization (AWS)

### Recommended Setup
- **Frontend**: ECS Fargate (0.25 vCPU, 0.5 GB) - ~$10/month
- **Backend**: ECS Fargate (0.5 vCPU, 1 GB) - ~$20/month
- **Database**: RDS t3.micro PostgreSQL - ~$15/month
- **Load Balancer**: ALB - ~$20/month
- **Total**: ~$65/month

### Budget Option
- **EC2**: t3.small with Docker Compose - ~$15/month
- **Database**: PostgreSQL in Docker (same instance)
- **Total**: ~$15/month (not recommended for production)
