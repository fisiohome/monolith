# FisioHome Monolith - Admin Dashboard

A Rails 8 monolith application with Vite for frontend assets and SolidQueue for background job processing.

## Features

For detailed information about the application's features and implementation, see the [Feature Documentation](./docs/features.md).

## Overview

- **Backend**: Ruby on Rails 8.0.1
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **Job Queue**: SolidQueue
- **Styling**: TailwindCSS
- **Package Manager**: Bun (for frontend dependencies)

## Development Setup

### Prerequisites

- Ruby 3.3.5
- PostgreSQL 16+
- Bun 1.0+
- Git

### Quick Start

Choose one of the following development environments:

#### Option 1: Local Development

1. **Clone and prepare**
   ```bash
   git clone <repository-url>
   cd monolith
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Required variables:
   - `RAILS_MASTER_KEY` - Rails encryption key
   - `VITE_RUBY_HERE_MAPS_API_KEY` - HERE Maps API key
   
   Database configuration (choose one):
   - `MONOLITH_DATABASE_URL` (full connection string)
   - Or individual variables:
     - `DB_HOST`
     - `MONOLITH_DATABASE_PORT`
     - `MONOLITH_DATABASE_USERNAME`
     - `MONOLITH_DATABASE_PASSWORD`

3. **Set up Rails credentials**
   
   The application uses encrypted credentials for sensitive data. After setting up your `.env` file:
   
   ```bash
   # View decrypted credentials (for debugging)
   bin/rails credentials:show
   ```

   ```bash
   # Edit encrypted credentials with your actual values
   bin/rails credentials:edit
   ```
   
   Example structure (replace with your actual keys):
   ```yaml
   secret_key_base: <your_secret_key_base>
   here_map: { api_key: <your_here_maps_api_key> }
   resend: { api_key: <your_resend_api_key> }
   
   mission_control:
     http_basic_auth_user: <your_mission_control_user>
     http_basic_auth_password: <your_mission_control_password>
   ```

4. **Start PostgreSQL**
   ```bash
   docker compose up db-postgresql -d
   ```
   This runs PostgreSQL on `localhost:7432`.

4. **Install dependencies and setup database**
   ```bash
   bin/setup --skip-server
   bun install
   ```

5. **Start development servers**
   ```bash
   bin/dev
   ```
   
   Services started:
   - Rails server: http://localhost:3000
   - Vite dev server: http://localhost:3036
   - SolidQueue worker

#### Option 2: VS Code Dev Container

1. **Open in VS Code**
   ```bash
   code .
   ```

2. **Reopen in Container**
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Select "Dev Containers: Reopen in Container"

3. **Start the application**
   ```bash
   bin/dev
   ```

   The Dev Container includes:
   - PostgreSQL (pre-configured)
   - Selenium WebDriver
   - Bun
   - All Ruby dependencies

### Environment Variables

#### Generating RAILS_MASTER_KEY

The `RAILS_MASTER_KEY` decrypts encrypted credentials in `config/credentials.yml.enc`.

**Important**: Never commit `config/master.key` to version control. It's included in `.gitignore`.

To generate a new master key:
```bash
# Generate and display
bin/rails secret

# Copy to clipboard (macOS)
bin/rails secret | pbcopy

# Copy to clipboard (Linux)
bin/rails secret | xclip -selection clipboard
```

For local development, you can use the existing key:
```bash
export RAILS_MASTER_KEY="$(cat config/master.key)"
```

### Architecture

#### Directory Structure

```
monolith/
├── app/
│   ├── frontend/          # React components and assets
│   ├── models/           # ActiveRecord models
│   ├── controllers/      # Rails controllers
│   └── views/            # Rails views
├── config/
│   ├── credentials.yml.enc  # Encrypted secrets
│   ├── database.yml         # Database configuration
│   └── vite.json            # Vite configuration
├── db/
│   ├── migrate/          # Database migrations
│   └── seeds/            # Seed data
├── lib/                  # Library code
├── public/               # Static assets
└── test/                 # Test files
```

#### Key Components

- **`bin/setup`**: Initializes the development environment
- **`bin/dev`**: Starts all development processes via `Procfile.dev`
- **`Procfile.dev`**: Defines development process configuration
- **`docker-compose.yml`**: Local development database setup
- **`.devcontainer/`**: VS Code Dev Container configuration

### Testing

Run the test suite:
```bash
# Run all tests
bundle exec rails test

# Run specific test file
bundle exec rails test test/models/user_test.rb

# Run system tests
bundle exec rails test:system
```

### Code Quality

- **Ruby**: StandardRB for linting and formatting
  ```bash
  bundle exec standard
  ```
- **JavaScript/TypeScript**: Biome for linting and formatting
  ```bash
  bun run check
  ```

### Deployment

The application is configured for deployment via Kamal. See `config/deploy.yml` for configuration details.

## Troubleshooting

### Common Issues

**Database connection errors**
- Verify PostgreSQL is running on the correct port
- Check environment variables in `.env`
- For Docker PostgreSQL: ensure port 7432 is available

**Vite/Bun not found**
- Install Bun: `curl -fsSL https://bun.sh/install | bash`
- Verify installation: `bun --version`

**Missing RAILS_MASTER_KEY**
- Generate a new key with `bin/rails secret`
- Or use existing key from `config/master.key`

**Frontend assets not loading**
- Ensure Vite server is running (check port 3036)
- Run `bun install` to install frontend dependencies

### Getting Help

- Check the [Rails Guides](https://guides.rubyonrails.org/)
- Review [Vite documentation](https://vitejs.dev/)
- Consult the project's issue tracker

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and code quality checks
5. Submit a pull request
