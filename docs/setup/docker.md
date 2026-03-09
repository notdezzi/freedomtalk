# Docker Setup for FreedomTalk

This document describes the Docker configuration for local development.

## Services

The `docker-compose.yml` file defines the following services:

### PostgreSQL 16
- **Port**: 5432
- **User**: postgres
- **Password**: postgres
- **Database**: freedomtalk
- **Data Volume**: `postgres_data`

### Redis 7
- **Port**: 6379
- **Persistence**: AOF (Append-Only File) enabled
- **Data Volume**: `redis_data`

### RabbitMQ 3
- **AMQP Port**: 5672
- **Management UI**: http://localhost:15672
- **User**: rabbitmq
- **Password**: rabbitmq
- **Data Volume**: `rabbitmq_data`

## Usage

### Start all services
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq
```

### Check service status
```bash
docker-compose ps
```

### Restart a service
```bash
docker-compose restart postgres
```

### Remove all data (⚠️ destructive)
```bash
docker-compose down -v
```

## Connecting to Services

### PostgreSQL
```bash
# Using psql
docker-compose exec postgres psql -U postgres -d freedomtalk

# Connection string
postgresql://postgres:postgres@localhost:5432/freedomtalk
```

### Redis
```bash
# Using redis-cli
docker-compose exec redis redis-cli

# Connection string
redis://localhost:6379
```

### RabbitMQ
- **Management UI**: http://localhost:15672
- **Username**: rabbitmq
- **Password**: rabbitmq
- **AMQP URL**: amqp://rabbitmq:rabbitmq@localhost:5672

## Health Checks

All services include health checks to ensure they're running properly:

```bash
# Check health status
docker-compose ps
```

Healthy services will show `(healthy)` in their status.

## Troubleshooting

### Port already in use
If you get a port conflict error, check if another service is using the port:

```bash
# macOS/Linux
lsof -i :5432
lsof -i :6379
lsof -i :5672

# Stop the conflicting service or change the port in docker-compose.yml
```

### Reset a service
```bash
# Stop and remove the service
docker-compose rm -sf postgres

# Remove the volume
docker volume rm freedomtalk_postgres_data

# Start fresh
docker-compose up -d postgres
```

## Production Considerations

⚠️ **This configuration is for local development only!**

For production:
- Use strong, unique passwords
- Enable SSL/TLS
- Configure proper backup strategies
- Use managed services or production-grade configurations
- Implement proper security measures

