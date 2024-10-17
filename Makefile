
docker-build:
	docker build -t do360now/chatgpt-agent-x:1.0.0 .

docker-run:
	docker run --rm --name chatgpt-agent-x -p 80:80 do360now/chatgpt-agent-x:1.0.0

docker-push:
	docker push do360now/chatgpt-agent-x:1.0.0

docker-stop:
	docker stop agent-x

docker-push:
	docker push do360now/chatgpt-agent-x:1.0.0

