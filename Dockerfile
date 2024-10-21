# Use a multi-stage build to reduce image size
# Stage 1 - Build stage
FROM python:3.10-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install dependencies
COPY ./requirements.in /app/requirements.in
RUN pip install --upgrade pip && pip install pip-tools
RUN pip-compile requirements.in --upgrade

# Stage 2 - Final image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=1

# Set working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/requirements.txt /app/requirements.txt
COPY ./frontend /app/

# Install the compiled dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Add a non-root user
RUN useradd -m appuser
USER appuser

# Expose the port (assuming uvicorn will use 8000)
EXPOSE 8000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:8000/ || exit 1

# Run the bot using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
