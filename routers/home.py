import fastapi
from fastapi_chameleon import template

router = fastapi.APIRouter()


router.get("/")
@template(template_file="index.pt")
def index():
    return {
        "post_count": 271,
        "followers_count": 1000,
        "latest_post": [
            {'id': 1, 'title': 'First post', 'content': 'This is the first post'},
            {'id': 2, 'title': 'Second post', 'content': 'This is the second post'},

    ],
    }

router.get("/about")
def about():
    return {
        "message": "This is the about page"
    }