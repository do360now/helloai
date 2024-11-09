# Stage 1 - Build stage
FROM python:3.10-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    unixodbc-dev \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install dependencies
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

# Install necessary system dependencies for runtime
RUN apt-get update && apt-get install -y \
    unixodbc \
    curl \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Add Microsoft repository keys and sources for ODBC driver
RUN curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.asc.gpg && \
    echo "deb [arch=amd64] https://packages.microsoft.com/ubuntu/20.04/prod focal main" > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18


# Copy only the compiled requirements file and application code from the build stage
COPY --from=builder /app/requirements.txt /app/requirements.txt
COPY ./frontend /app/

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Add a non-root user
RUN useradd -m appuser
USER appuser

# Expose the port (assuming uvicorn will use 8000)
EXPOSE 8000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:8000/ || exit 1

# Run the app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
