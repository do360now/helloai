ifneq (,$(wildcard ./.env))
	include .env
	export
endif
# Variables
VERSION=2.0.0
IMAGE_NAME=do360now/agent_x_frontend

uvicorn:
	uvicorn frontend/main:app --reload

docker-compose-up:
	docker-compose up --build

# Build the Docker image
docker-build:
	docker build -t $(IMAGE_NAME):$(VERSION) .

# Run the Docker container
docker-run:
	docker run --network helloai_app-network --rm --name agent_x_frontend -p 8000:8000 $(IMAGE_NAME):$(VERSION)

# Push the Docker image to the registry
docker-push:
	docker push $(IMAGE_NAME):$(VERSION)

# Stop the Docker container
docker-stop:
	docker stop agent_x_frontend

# Clean up stopped containers and unused images
docker-clean:
	docker system prune -f
	docker rmi $(IMAGE_NAME):$(VERSION)

# Serve Ollama
ollama-serve:
	ollama serve

# Run Agent_X locally (without Docker)
agent-x-run:
	python3 X/agent_x.py

deploy-agents:
	. ./deploy-agents.sh

# Help target to display available commands
help:
	@echo "Makefile commands:"
	@echo "  docker-build    - Build the Docker image"
	@echo "  docker-run      - Run the Docker container"
	@echo "  docker-push     - Push the Docker image to the registry"
	@echo "  docker-stop     - Stop the running Docker container"
	@echo "  docker-clean    - Remove stopped containers and unused images"
	@echo "  ollama-serve    - Serve Ollama"
	@echo "  agent-x-run     - Run Agent_X locally"

