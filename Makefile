
docker-build:
	docker build -t do360now/chatgpt-agent-x:1.0.0 .

docker-run:
	docker run --rm --name chatgpt-agent-x do360now/chatgpt-agent-x:1.0.0

docker-stop:
	docker stop agent-x

