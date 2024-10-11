import tweepy
import os
import logging
import time
import random
from dotenv import load_dotenv
from openai import OpenAI
import openai
import math
import requests
from PIL import Image

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from the .env file
logger.info("Loading environment variables from .env file...")
load_dotenv()

# Load OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.")
ai_client = OpenAI(api_key=OPENAI_API_KEY)

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
    logger.info("Successfully authenticated with Twitter API v2.")
    return client

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
        "Machine Learning (ml)",
        "Robots"
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic: {topic}")
    return topic

def generate_tweet():
    """
    Generate a post based on a dynamically generated topic using ChatGPT API.
    """
    post_topic = generate_post_topic()
    logger.info(f"Generating a post based on the following topic using ChatGPT API: {post_topic}...")
    response = ai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": f'Generate a concise post with tips, news, or shortcuts for {post_topic}. Ensure it is under 200 characters including hashtags.'},
        ]
    )
    logger.info(f"Received response from ChatGPT API for topic '{post_topic}': {response}")
    tweet = response.choices[0].message.content.strip()
    if len(tweet) > 200:
        logger.warning(f"Generated tweet exceeds 200 characters. Truncating tweet: {tweet}")
        tweet = tweet[:197] + '...'  # Truncate to 200 characters with ellipsis
    logger.info(f"Generated tweet: {tweet}")
    return tweet, post_topic

def generate_image_for_topic(post_topic: str):
    """
    Generate an image related to the topic using the OpenAI image generation API.
    Catch billing errors and handle them gracefully.
    """
    logger.info(f"Generating an image related to topic: {post_topic}")
    try:
        response = ai_client.images.generate(
            prompt=f"{post_topic} related image",
            n=1,
            size="1024x1024"
        )
        image_url = response.data[0].url
        logger.info(f"Generated image for topic '{post_topic}': {image_url}")
        # Download the image to a local file
        image_path = 'images/image.png'
        image_response = requests.get(image_url)
        if image_response.status_code == 200:
            with open(image_path, 'wb') as file:
                file.write(image_response.content)
            logger.info(f"Image downloaded successfully to {image_path}")
        else:
            logger.error(f"Failed to download image, status code: {image_response.status_code}")
            return None
        return image_path
    except openai.BadRequestError as e:
        if 'billing_hard_limit_reached' in str(e):
            logger.error("Billing hard limit has been reached. Cannot generate image.")
        else:
            logger.error(f"Failed to generate image: {e}")
        return None

# Authenticate with Twitter API v2
logger.info("Starting authentication for Twitter API v2...")
client = authenticate_v2()

# Configurable frequency for posting (from environment variable or default to random between 1 to 2 hours)
POST_INTERVAL = int(os.getenv('POST_INTERVAL', random.randint(3600, 7200)))
logger.info(f"Configured posting interval: {POST_INTERVAL} seconds")

# Post a tweet every configured interval with retry mechanism
retry_count = 0
MAX_RETRIES = 5

while retry_count < MAX_RETRIES:
    try:
        logger.info("Starting tweet generation process...")
        image_path = generate_image_for_topic(generate_post_topic())

        if not image_path:
            logger.info("No valid image found, skipping image upload and proceeding with text-only post.")
        else:
            logger.info(f"Valid image generated: {image_path}")

        tweet_v2, post_topic = generate_tweet()
        logger.info(f"Attempting to post tweet using v2 API: '{tweet_v2}'")

        if image_path:
            # Authenticate with Twitter API v1.1 to upload media
            api_v1 = authenticate_v1()
            media = api_v1.media_upload(filename=image_path)
            # Post the tweet with the image
            response = client.create_tweet(text=tweet_v2, media_ids=[media.media_id])
            logger.info(f"Tweeted successfully with image using v2 API: {response.data['id']}")
        else:
            logger.info("No image found, posting tweet without image.")
            # Post the tweet without an image
            response = client.create_tweet(text=tweet_v2)
            logger.info(f"Tweeted successfully without image using v2 API: {response.data['id']}")
        
        # Reset retry count after successful tweet
        retry_count = 0
        logger.info(f"Waiting for {POST_INTERVAL} seconds before the next tweet...")
        time.sleep(POST_INTERVAL)
    except tweepy.TweepyException as e:
        logger.error(f"Failed to post tweet using v2 API: {e}")
        if '403' in str(e):
            logger.error("Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file.")
        retry_count += 1
        sleep_time = min(POST_INTERVAL, math.pow(2, retry_count) * 10)  # Exponential backoff
        logger.error(f"Retry attempt {retry_count} of {MAX_RETRIES}, sleeping for {sleep_time} seconds...")
        time.sleep(sleep_time)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        retry_count += 1
        sleep_time = min(POST_INTERVAL, math.pow(2, retry_count) * 10)
        logger.error(f"Retry attempt {retry_count} of {MAX_RETRIES}, sleeping for {sleep_time} seconds...")
        time.sleep(sleep_time)

if retry_count >= MAX_RETRIES:
    logger.error("Max retries reached. Stopping the tweet posting process.")
    logger.info("Exiting the tweet posting process.")
    exit(1)
