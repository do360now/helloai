# Dockerfile for Automated Twitter Post Bot

# Base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install dependencies
COPY ./requirements.in /app/requirements.in
RUN pip install --upgrade pip && pip install pip-tools
RUN pip-compile requirements.in --upgrade && pip install -r requirements.txt

# Copy application files
COPY ./X /app/

# Run the bot
CMD ["python", "chatgpt_agent_x.py"]
