# User Microservice

A NestJS-based user authentication microservice with Kafka integration for event-driven architecture.

## Features

- User registration
- User login
- JWT token-based authentication
- PostgreSQL database
- Kafka event publishing
- Validation and error handling

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

## Environment Variables

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=userdb
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=1d
KAFKA_BROKER=localhost:9092
PORT=3000
```

## Running the Application

### With Docker (Recommended)

```bash
# Start all services (PostgreSQL, Kafka, Application)
docker-compose up -d

# Follow logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Setup

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### POST /auth/register
Register a new user

```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123"
}
```

### POST /auth/login
User login

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Kafka Events

- `user.registered`: When a user registers
- `user.logged_in`: When a user logs in

Topic: `user-events`

## Requirements

- Node.js 18+
- PostgreSQL
- Kafka (optional)