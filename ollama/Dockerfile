# Use a multi-stage build to reduce image size
# Stage 1 - Build stage
FROM python:3.10-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /ollama

RUN apt-get update && apt-get install -y curl

# Stage 2 - Final image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=1

# Set working directory
WORKDIR /ollama


RUN curl -fsSL https://ollama.com/install.sh -o install.sh
RUN chmod +x install.sh
RUN ./install.sh

# Add a non-root user
RUN useradd -m appuser
USER appuser

# Expose the port (assuming uvicorn will use 11434)
EXPOSE 11434

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:11434/ || exit 1

# Run the bot using uvicorn
CMD ["ollama", "serve"]
