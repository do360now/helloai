import tweepy
import os
import logging
import time
import random
from dotenv import load_dotenv
import ollama

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from the .env file
logger.info("Loading environment variables from .env file...")
load_dotenv()

# Get Twitter API credentials from environment variables with error handling
API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
ACCESS_TOKEN = os.getenv('ACCESS_TOKEN')
ACCESS_SECRET = os.getenv('ACCESS_SECRET')

logger.info("Checking if all Twitter API credentials are available...")
if not all([API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET]):
    raise ValueError("One or more Twitter API credentials are missing. Please check your environment variables.")

def authenticate_v2():
    """
    Authenticate with Twitter API v2 using OAuth 1.0a User Context and return the Client object.
    """
    logger.info("Authenticating with Twitter API v2 using OAuth 1.0a User Context...")
    client = tweepy.Client(consumer_key=API_KEY,
                           consumer_secret=API_SECRET,
                           access_token=ACCESS_TOKEN,
                           access_token_secret=ACCESS_SECRET)
    return client

def generate_post_topic():
    """
    Generate a random topic for a tweet from a predefined list of topics.
    """
    topics = [
        "DevOps",
        "CI/CD",
        "Python",
        "Azure DevOps (ADO)",
        "Docker",
        "Kubernetes (K8S)",
        "Semiconductors",
        "Artificial Intelligence (AI)",
        "Machine Learning",
        "Robots"
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic: {topic}")
    return topic

def generate_tweet():
    """
    Generate a post based on a dynamically generated topic using Ollama.
    """
    post_topic = generate_post_topic()
    logger.info(f"Generating a post based on the following topic: {post_topic}...")
    response = ollama.chat(model='llama3.2', messages=[
        {
            'role': 'user',
            'content': f'Generate a concise post with tips, news, or shortcuts for {post_topic}. Ensure it is under 250 characters.',
        },
    ])
    tweet = response['message']['content']
    return tweet, post_topic

def find_image_for_topic(topic: str):
    """
    Find an image that matches the topic from the images folder.
    """
    images_folder = "images/"
    for filename in os.listdir(images_folder):
        if topic.lower() in filename.lower():
            return os.path.join(images_folder, filename)
    return None

# Authenticate with Twitter API v2
logger.info("Starting authentication for Twitter API v2...")
client = authenticate_v2()

# Configurable frequency for posting (random between 1 to 2 hours)
POST_INTERVAL = random.randint(3600, 7200)

# Post a tweet every configured interval
while True:
    tweet_v2, topic = generate_tweet()
    image_path = find_image_for_topic(topic)

    logger.info(f"Attempting to post tweet using v2 API: '{tweet_v2}'")
    try:
        if image_path:
            # Upload the media first
            media = client.media_upload(filename=image_path)
            # Then post the tweet with the image
            response = client.create_tweet(text=tweet_v2, media_ids=[media.media_id])
            logger.info(f"Tweeted successfully with image using v2 API: {response.data['id']}")
        else:
            # Post the tweet without an image
            response = client.create_tweet(text=tweet_v2)
            logger.info(f"Tweeted successfully without image using v2 API: {response.data['id']}")
    except tweepy.TweepyException as e:
        if '403' in str(e):
            logger.error("Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file.")
        logger.error(f"Failed to post tweet using v2 API: {e}")

    # Wait for the configured interval before posting the next tweet
    time.sleep(POST_INTERVAL)