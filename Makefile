
docker-build:
	docker build -t do360now/chatgpt-agent-x:1.0.1 .

docker-run:
	docker run --rm --name chatgpt-agent-x -p 8000:80 do360now/chatgpt-agent-x:1.0.1

docker-push:
	docker push do360now/chatgpt-agent-x:1.0.1

docker-stop:
	docker stop agent-x

ollama-serve:
	ollama serve

agent-x-run:
	python3 X/agent_x.py