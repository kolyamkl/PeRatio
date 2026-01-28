#!/bin/bash
# Quick Docker Start Script for TG_TRADE
# Handles network timeouts and provides better error messages

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🐳 TG_TRADE DOCKER STARTUP${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo -e "${YELLOW}Creating .env from env.example...${NC}"
    cp env.example .env
    echo -e "${RED}❌ Please edit .env with your actual values before continuing${NC}"
    echo -e "${YELLOW}Required: POSTGRES_PASSWORD, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN${NC}"
    exit 1
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop and try again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Pull base images first to avoid timeout during build
echo -e "\n${BLUE}📥 Pre-pulling base images...${NC}"
echo -e "${YELLOW}This may take a few minutes on first run${NC}"

docker pull postgres:15-alpine 2>/dev/null || echo -e "${YELLOW}⚠️  Postgres image will be pulled during build${NC}"
docker pull python:3.11-slim 2>/dev/null || echo -e "${YELLOW}⚠️  Python image will be pulled during build${NC}"
docker pull node:20-alpine 2>/dev/null || echo -e "${YELLOW}⚠️  Node image will be pulled during build${NC}"
docker pull nginx:alpine 2>/dev/null || echo -e "${YELLOW}⚠️  Nginx image will be pulled during build${NC}"

# Stop any existing containers
echo -e "\n${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true

# Build and start services
echo -e "\n${BLUE}🔨 Building containers...${NC}"
echo -e "${YELLOW}This will take 5-10 minutes on first build${NC}"

if docker-compose build --parallel; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}If you see network timeout errors, try:${NC}"
    echo -e "  1. Check your internet connection"
    echo -e "  2. Wait a few minutes and run: ${BLUE}bash docker-start.sh${NC}"
    echo -e "  3. Or build individually: ${BLUE}docker-compose build backend${NC}"
    exit 1
fi

# Start services
echo -e "\n${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

# Check service status
echo -e "\n${BLUE}📊 Service Status:${NC}"
docker-compose ps

# Check health
echo -e "\n${BLUE}🏥 Health Checks:${NC}"

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: Healthy${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Not ready${NC}"
fi

# Check Backend
sleep 10
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend: Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend: Starting... (check logs: docker-compose logs backend)${NC}"
fi

# Check Frontend
if curl -sf http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend: Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: Starting... (check logs: docker-compose logs frontend)${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 DOCKER SERVICES STARTED${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e ""
echo -e "📦 ${YELLOW}Services:${NC}"
echo -e "   Backend:  http://localhost:8000"
echo -e "   Frontend: http://localhost"
echo -e "   Database: localhost:5432"
echo -e ""
echo -e "📋 ${YELLOW}Useful Commands:${NC}"
echo -e "   View logs:    ${BLUE}docker-compose logs -f${NC}"
echo -e "   Stop:         ${BLUE}docker-compose down${NC}"
echo -e "   Restart:      ${BLUE}docker-compose restart${NC}"
echo -e "   Rebuild:      ${BLUE}docker-compose up -d --build${NC}"
echo -e ""
echo -e "${BLUE}========================================${NC}"
