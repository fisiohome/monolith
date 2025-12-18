# External API Authentication

This document describes how the monolith application authenticates with the Fisiohome external API.

## Overview

The monolith uses **service authentication** with the external API.

Requests to the external API are authenticated via HTTP headers:

 - `X-Service-Name`: `dashboard`
 - `X-Service-Token`: a randomly-generated strong token (configured via environment variable)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controllers                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VouchersController                                     │    │
│  │    └── vouchers_service.new                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Services                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VouchersService                                         │    │
│  │    └── FisiohomeApi::Client.get(path)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FisiohomeApi::Client                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HTTP client for external API                            │    │
│  │    - get(path, params:, headers:)                       │    │
│  │    - post(path, body:, headers:)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Fisiohome API                        │
│    GET  /api/v1/vouchers                                         │
│    ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. FisiohomeApi::Client

**Location**: `app/services/fisiohome_api/client.rb`

HTTP client for communicating with the external API.

#### Methods

| Method | Description |
|--------|-------------|
| `get(path, params:, headers:)` | Makes authenticated GET request (service headers are added automatically) |
| `post(path, body:, headers:)` | Makes authenticated POST request (service headers are added automatically) |

## Authentication Flow

### Making API Requests

```
1. User accesses a page (e.g., /admin_portal/vouchers)
2. Controller calls an internal service (e.g., `AdminPortal::VouchersService`)
3. The service makes a request via `FisiohomeApi::Client`
4. `FisiohomeApi::Client` automatically attaches the service auth headers
```

## Usage

### In Controllers

```ruby
class AdminPortal::VouchersController < ApplicationController
  def index
    service = VouchersService.new
    @vouchers = service.list
  end
end
```

### In Services

```ruby
class VouchersService
  def initialize(client: FisiohomeApi::Client)
    @client = client
  end

  def list
    response = client.get("/api/v1/vouchers")
    # handle response...
  end
end
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FISIOHOME_EXTERNAL_API_URL` | Base URL of external API | Yes |
| `FISIOHOME_EXTERNAL_API_SERVICE_NAME` | Service name header value (e.g. `dashboard`) | Yes |
| `FISIOHOME_EXTERNAL_API_SERVICE_TOKEN` | Service token header value | Yes |

## Error Handling

### Network Errors

Network errors are caught and logged:
- `[FisiohomeApi::Client] Network error during request`

## Security Considerations

1. **No per-user credential forwarding**: The monolith does not send user passwords to the external API.
2. **Token secrecy**: `FISIOHOME_EXTERNAL_API_SERVICE_TOKEN` must not be committed and should be rotated.
3. **Least privilege**: The service token should be scoped to only the endpoints the dashboard needs.
