import tweepy
import os
import logging
import time
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

def generate_tweet():
    """
    Generate a tweet using ollama related to semiconductors.
    """
    logger.info("Generating a tweet related to semiconductors using ollama...")
    response = ollama.chat(model='llama3.2', messages=[
        {
            'role': 'user',
            'content': 'Generate a tweet about semiconductors.',
        },
    ])
    tweet = response['message']['content']
    return tweet

# Authenticate with Twitter API v2
logger.info("Starting authentication for Twitter API v2...")
client = authenticate_v2()

# Post a tweet every hour
while True:
    tweet_v2 = generate_tweet()
    logger.info(f"Attempting to post tweet using v2 API: '{tweet_v2}'")
    try:
        response = client.create_tweet(text=tweet_v2)
        logger.info(f"Tweeted successfully using v2 API: {response.data['id']}")
    except tweepy.TweepyException as e:
        if '403' in str(e):
            logger.error("Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file.")
        logger.error(f"Failed to post tweet using v2 API: {e}")
    
    # Wait for an hour before posting the next tweet
    time.sleep(3600)

