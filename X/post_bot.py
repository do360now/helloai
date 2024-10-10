"""This agent picks a topic from the list below, picks an image from the available images, and 
generates a post"""

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


def authenticate_v1():
    """
    Authenticate with Twitter API v1.1 using OAuth 1.0a User Context and return the API object.
    """
    logger.info("Authenticating with Twitter API v1.1 using OAuth 1.0a User Context...")
    auth = tweepy.OAuth1UserHandler(API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET)
    api = tweepy.API(auth)
    logger.info("Successfully authenticated with Twitter API v1.1.")
    return api

def generate_post_topic():
    """
    Generate a random topic for a tweet from a predefined list of topics.
    """
    topics = [
        "DevOps",
        "Continuous Integration/Continuous Deployment (CI/CD)",
        "Python",
        "Azure DevOps (ADO)",
        "Docker",
        "Kubernetes (K8S)",
        "Semiconductors",
        "Artificial Intelligence (AI)",
        "Machine Learning ( ml )",
        "Robots"
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic:{topic}")
    return topic

post_topic = generate_post_topic()

def generate_tweet():
    """
    Generate a post based on a dynamically generated topic using Ollama.
    """
    # post_topic = generate_post_topic()
    logger.info(f"Generating a post based on the following topic: {post_topic}...")
    response = ollama.chat(model='llama3.2', messages=[
        {
            'role': 'user',
            'content': f'Generate a concise post with tips, news, or shortcuts for {post_topic}. Ensure it is under 250 characters and includes hashtags.',
        },
    ])
    logger.info(f"Received response from Ollama for topic '{post_topic}': {response}")
    tweet = response['message']['content']
    logger.info(f"Generated tweet: {tweet}")
    return tweet, post_topic

def find_image_for_topic(post_topic: str):
    """
    Find an image that matches the topic from the images folder.
    """
    images_folder = "images/"
    logger.info(f"Searching for an image related to topic: {post_topic}")
    if not os.path.exists(images_folder):
        logger.error(f"Images folder '{images_folder}' does not exist.")
        return None

    for filename in os.listdir(images_folder):
        if post_topic.lower() in filename.lower():
            image_path = os.path.join(images_folder, filename)
            logger.info(f"Found image for topic '{post_topic}': {image_path}")
            if not os.path.isfile(image_path):
                logger.error(f"Found file '{image_path}' is not a valid image file.")
                return None
            return image_path
    logger.info(f"No image found for topic: {post_topic}")
    return None

# Authenticate with Twitter API v2
logger.info("Starting authentication for Twitter API v2...")
client = authenticate_v2()

# Configurable frequency for posting (random between 1 to 2 hours)
POST_INTERVAL = random.randint(3600, 7200)
logger.info(f"Configured posting interval: {POST_INTERVAL} seconds")

# Post a tweet every configured interval
while True:
    logger.info("Starting tweet generation process...")
    image_path = find_image_for_topic(generate_post_topic())

    if not image_path:
        logger.info("No valid image found, skipping image upload and proceeding with text-only post.")
    else:
        logger.info(f"Valid image found: {image_path}")

    tweet_v2, topic = generate_tweet()
    logger.info(f"Attempting to post tweet using v2 API: '{tweet_v2}'")
    try:
        if image_path:
            # Upload the media first using Tweepy API v1.1 client
            logger.info(f"Image found for topic '{post_topic}', attempting to upload image...")
            api_v1 = authenticate_v1()
            with open(image_path, 'rb') as media_file:
                media = api_v1.media_upload(filename=image_path)
            logger.info(f"Image uploaded successfully: media_id = {media.media_id}")
            # Then post the tweet with the image
            response = client.create_tweet(text=tweet_v2, media_ids=[media.media_id])
            logger.info(f"Tweeted successfully with image using v2 API: {response.data['id']}")
        else:
            logger.info("No image found, posting tweet without image.")
            # Post the tweet without an image
            response = client.create_tweet(text=tweet_v2)
            logger.info(f"Tweeted successfully without image using v2 API: {response.data['id']}")
    except tweepy.TweepyException as e:
        logger.error(f"Failed to post tweet using v2 API: {e}")
        if '403' in str(e):
            logger.error("Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file.")

    # Wait for the configured interval before posting the next tweet
    logger.info(f"Waiting for {POST_INTERVAL} seconds before the next tweet...")
    time.sleep(POST_INTERVAL)