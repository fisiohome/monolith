# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t monolith .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name monolith monolith

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.3.5
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

# Rails app lives here
WORKDIR /rails

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y libjemalloc2 libvips postgresql-client unzip && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development"

# Build stage: Install Ruby dependencies
FROM base AS build

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Use Bun for JavaScript dependencies
FROM oven/bun:latest AS bun

# Copy package files
WORKDIR /rails
COPY package.json bun.lockb ./

# Install production JavaScript dependencies with Bun
RUN bun install --production

# Back to build stage to handle Ruby and Bun together
FROM build AS final-build

# Copy Bun dependencies and ensure Bun binary is available
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun 
COPY --from=bun /rails/node_modules ./node_modules
COPY --from=bun /rails/bun.lockb ./bun.lockb

# Copy application files (including bin/, app/, config/, etc.)
COPY . . 

# Install application gems
COPY Gemfile Gemfile.lock ./ 
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Precompile assets
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# Clean unnecessary files
RUN rm -rf node_modules tmp/cache

# Final stage for app image
FROM base

# Copy built artifacts: gems, application, and Bun dependencies
COPY --from=final-build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=final-build /rails /rails

# Run and own only the runtime files as a non-root user for security
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp

# Switch to non-root user
USER 1000:1000

# Entrypoint prepares the database.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Start server via Thruster by default, this can be overwritten at runtime
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
