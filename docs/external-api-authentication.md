# External API Authentication

This document describes how the monolith application authenticates with the Fisiohome external API.

## Overview

The monolith uses **per-user authentication** with the external API. When a user logs in via Devise, the application also authenticates them with the external API using the same credentials. The external API token is stored in the Rails session and automatically refreshed when expired.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controllers                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VouchersController (includes ExternalApiAuth)          │    │
│  │    └── vouchers_service.new(token: external_api_token)  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Services                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VouchersService                                         │    │
│  │    └── FisiohomeApi::Client.get(path, token: token)     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FisiohomeApi::Client                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HTTP client for external API                            │    │
│  │    - authenticate(email:, password:)                     │    │
│  │    - refresh_access_token(refresh_token:)                │    │
│  │    - get(path, token:, params:, headers:)               │    │
│  │    - post(path, token:, body:, headers:)                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Fisiohome API                        │
│    POST /api/v1/auth/login                                       │
│    POST /api/v1/auth/refresh                                     │
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
| `authenticate(email:, password:)` | Authenticates with external API, returns tokens |
| `refresh_access_token(refresh_token:)` | Refreshes expired access token |
| `get(path, token:, params:, headers:)` | Makes authenticated GET request |
| `post(path, token:, body:, headers:)` | Makes authenticated POST request |

#### Authentication Response

```ruby
# Success
{
  success: true,
  access_token: "eyJhbG...",
  refresh_token: "eyJhbG...",
  expires_at: Time.current + 3.hours
}

# Failure
{
  success: false,
  error: "Invalid credentials"
}
```

### 2. ExternalApiAuth Concern

**Location**: `app/controllers/concerns/external_api_auth.rb`

Controller concern that manages the user's external API session.

#### Features

- **Auto-refresh**: Automatically refreshes expired tokens before each request
- **Session management**: Stores/retrieves tokens from Rails session
- **Graceful degradation**: Clears session if refresh fails (user must re-login)

#### Session Keys

| Key | Description |
|-----|-------------|
| `session[:external_api_token]` | Current access token |
| `session[:external_api_refresh_token]` | Refresh token for obtaining new access tokens |
| `session[:external_api_token_expires_at]` | Token expiration timestamp |

#### Helper Methods

```ruby
# Get the current valid token
external_api_token

# Check if token is still valid
external_api_token_valid?

# Manually clear external API session
clear_external_api_session!
```

### 3. Sessions Controller Integration

**Location**: `app/controllers/users/sessions_controller.rb`

Integrates external API authentication with Devise login/logout.

#### Login Flow

```ruby
def create
  super do |resource|
    authenticate_with_external_api if resource.persisted?
  end
end
```

#### Logout Flow

```ruby
def destroy
  session.delete(:external_api_token)
  session.delete(:external_api_refresh_token)
  session.delete(:external_api_token_expires_at)
  super
end
```

## Authentication Flow

### Login

```
1. User submits email/password to /sign-in
2. Devise authenticates user against local database
3. If successful, same credentials sent to external API
4. External API returns:
   - access_token (expires in 3 hours)
   - refresh_token (expires in ~1 day)
5. Tokens stored in Rails session
6. User redirected to dashboard
```

### Making API Requests

```
1. User accesses a page (e.g., /admin_portal/vouchers)
2. ExternalApiAuth concern runs before_action
3. Checks if access_token is expired
4. If expired and refresh_token exists:
   - Calls external API /auth/refresh
   - Updates session with new tokens
5. If refresh fails:
   - Clears session (user must re-login)
6. Controller uses external_api_token helper
7. Service makes API call with token
```

### Logout

```
1. User clicks logout
2. SessionsController#destroy clears external API tokens
3. Devise signs out user
4. User redirected to login page
```

## Usage

### In Controllers

```ruby
class AdminPortal::VouchersController < ApplicationController
  include ExternalApiAuth

  def index
    # external_api_token is automatically available and refreshed
    service = VouchersService.new(token: external_api_token)
    @vouchers = service.list
  end
end
```

### In Services

```ruby
class VouchersService
  def initialize(token:, client: FisiohomeApi::Client)
    @token = token
    @client = client
  end

  def list
    response = client.get("/api/v1/vouchers", token: token)
    # handle response...
  end
end
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FISIOHOME_EXTERNAL_API_URL` | Base URL of external API | Yes |

### Token Expiration

| Token | Expiration |
|-------|------------|
| Access Token | 3 hours (10800 seconds) |
| Refresh Token | ~1 day |

## Error Handling

### Authentication Failure

If external API authentication fails during login:
- User is still logged into monolith (graceful degradation)
- Warning logged: `[SessionsController] External API authentication failed`
- User won't be able to access external API features

### Token Refresh Failure

If token refresh fails:
- Session tokens cleared
- Warning logged: `[ExternalApiAuth] Token refresh failed, cleared session`
- User must re-login to restore external API access

### Network Errors

Network errors are caught and logged:
- `[FisiohomeApi::Client] Network error during authentication`
- `[FisiohomeApi::Client] Network error during token refresh`

## Security Considerations

1. **No password storage**: Passwords are never stored; only tokens are kept in session
2. **Session-based**: Tokens are stored in Rails session (encrypted by default)
3. **Auto-expiration**: Tokens expire and are automatically refreshed
4. **Logout cleanup**: All tokens cleared on logout
