# User Microservice

A NestJS-based user authentication microservice with Kafka integration for event-driven architecture.

## Features

- User registration and authentication
- JWT token-based authentication
- **Advanced user search and filtering system**
- PostgreSQL database with extended user profile fields
- Kafka event publishing for user events
- Comprehensive validation and error handling
- Pagination and sorting capabilities

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

### Authentication

#### POST /auth/register
Register a new user

```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123"
}
```

#### POST /auth/login
User login

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### User Search

#### GET /users/search
Advanced user search with filtering and pagination

**Query Parameters:**
- `search` - Search by name or email (partial match)
- `city` - Filter by city
- `country` - Filter by country
- `gender` - Filter by gender (male, female, other)
- `minAge` - Minimum age (13-120)
- `maxAge` - Maximum age (13-120)
- `interests` - Filter by interests (comma-separated)
- `skills` - Filter by skills (comma-separated)
- `joinedAfter` - Filter by registration date (ISO date)
- `joinedBefore` - Filter by registration date (ISO date)
- `lastActiveAfter` - Filter by last activity date (ISO date)
- `sortBy` - Sort field: `firstName`, `lastName`, `createdAt`, `lastLoginAt` (default: `createdAt`)
- `sortOrder` - Sort order: `ASC` or `DESC` (default: `DESC`)
- `page` - Page number (default: 1)
- `limit` - Results per page (1-100, default: 10)

**Example:**
```bash
GET /users/search?search=john&city=istanbul&minAge=25&maxAge=35&sortBy=firstName&sortOrder=ASC&page=1&limit=10
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "city": "Istanbul",
      "country": "Turkey",
      "gender": "male",
      "dateOfBirth": "1990-01-01",
      "bio": "Software developer",
      "interests": ["technology", "music"],
      "skills": ["javascript", "nodejs"],
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "lastLoginAt": "2025-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Kafka Events

- `user.registered`: When a user registers
- `user.logged_in`: When a user logs in

Topic: `user-events`

## Database Schema

The User entity includes the following fields:
- `id` - UUID primary key
- `email` - Unique email address
- `firstName` - First name
- `lastName` - Last name
- `password` - Hashed password (excluded from responses)
- `dateOfBirth` - Date of birth (optional)
- `gender` - Gender (optional)
- `city` - City location (optional)
- `country` - Country location (optional)
- `bio` - User biography (optional, max 500 chars)
- `interests` - Array of interests (optional)
- `skills` - Array of skills (optional)
- `lastLoginAt` - Last login timestamp (optional)
- `isActive` - Account status (default: true)
- `createdAt` - Registration timestamp
- `updatedAt` - Last update timestamp

## Testing

The project includes comprehensive test coverage with unit tests, integration tests, and end-to-end tests.

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests with coverage report
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

### Test Coverage

The test suite includes:

- **Unit Tests**: All services and controllers
- **Integration Tests**: Search functionality with real database
- **End-to-End Tests**: Complete API workflows
- **Error Handling**: Database, Kafka, JWT, and validation errors
- **Edge Cases**: Pagination, filtering, sorting scenarios
- **Performance Tests**: Large dataset handling

**Coverage Thresholds:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### Test Structure

```
src/
├── auth/
│   ├── auth.controller.spec.ts
│   ├── auth.service.spec.ts
├── user/
│   ├── user.controller.spec.ts
│   ├── user.service.spec.ts
├── test/
│   ├── test-helpers.ts
│   └── setup.ts
test/
└── search-integration.e2e-spec.ts
```

## Requirements

- Node.js 18+
- PostgreSQL
- Kafka (optional)