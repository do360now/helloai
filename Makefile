build:
	docker build -t do360now/aime-app:0.2.1 .

run:
	docker run --name aime-instance -p 80:80 do360now/aime-app:0.2.1

connect:
	docker run -it --rm --name aime-instance -p 80:80 do360now/aime-app:0.1.0 /bin/bash

push:
	docker push do360now/aime-app:0.2.1

pyrun:
	uvicorn main:app --reload  


