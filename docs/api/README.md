# Fisiohome API Documentation

## Overview

This directory contains Bruno API documentation for the Fisiohome healthcare platform.

## Files

- **`fisiohome-api-collection.bru`** - Main Bruno collection file
- **`therapists-feasible.bru`** - Therapist feasibility endpoint documentation

## Getting Started with Bruno

1. Install Bruno from [https://www.usebruno.com/](https://www.usebruno.com/)
2. Import the collection file: `fisiohome-api-collection.bru`
3. Set your environment variables (base URLs, authentication tokens)
4. Start making API requests

## Environment Setup

Create environments in Bruno for:

### Development
```
BASE_URL: http://localhost:3000
AUTH_TOKEN: your_dev_token_here
```

### Staging
```
BASE_URL: https://admin-staging.fisiohome.id
AUTH_TOKEN: your_staging_token_here
```

### Production
```
BASE_URL: https://admin.fisiohome.id
AUTH_TOKEN: your_production_token_here
```

## Available Endpoints

### Public Endpoints (No Authentication)
- `GET /api/v1/therapists/feasible` - Get feasible therapists for appointment booking

### Authenticated Endpoints
- Coming soon: appointments, patients, admins, locations, services

## Authentication

Most endpoints require Devise token authentication:

```http
Authorization: Bearer <your_token>
Content-Type: application/json
Accept: application/json
```

## Response Format

All endpoints return JSON responses with consistent structure:

### Success Response (200)
```json
{
  "data": [...],
  "message": "Success"
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "Error message",
  "details": {...}
}
```

## Testing

Each endpoint includes automated tests that run automatically:
- Status code validation
- Response format validation
- Data structure validation

## Contributing

To add new endpoint documentation:

1. Create a new `.bru` file for the endpoint
2. Include it in the main collection file using `!include filename.bru`
3. Follow the established documentation pattern
4. Add comprehensive tests and examples

## Support

For API questions or issues:
- Check the Bruno documentation for each endpoint
- Review the service implementation in the codebase
- Contact the development team
