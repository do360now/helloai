import tweepy
import os
import logging
import time
import random
from dotenv import load_dotenv
from datetime import datetime, timedelta

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

def follow_accounts_by_hashtag(api, hashtag, max_follows=10):
    """
    Follow accounts that recently used a specific hashtag.
    """
    logger.info(f"Attempting to follow accounts related to hashtag: #{hashtag}")
    try:
        query = f"#{hashtag}"
        tweets = tweepy.Cursor(api.search_tweets, q=query, lang="en", tweet_mode="extended", count=max_follows).items(max_follows)
        for tweet in tweets:
            user_id = tweet.user.id
            screen_name = tweet.user.screen_name
            if not tweet.user.following:
                api.create_friendship(user_id)
                logger.info(f"Followed user: {screen_name} (ID: {user_id})")
            else:
                logger.info(f"Already following user: {screen_name} (ID: {user_id})")
    except tweepy.TweepyException as e:
        logger.error(f"Failed to search for tweets or follow users: {e}")

def unfollow_accounts_younger_than(api, max_unfollows=10, days=7):
    """
    Unfollow accounts that were followed less than a specified number of days ago.
    """
    logger.info(f"Attempting to unfollow accounts followed less than {days} days ago.")
    try:
        following = api.get_friends()
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        unfollow_count = 0

        for friend in following:
            if unfollow_count >= max_unfollows:
                break

            user_id = friend.id
            screen_name = friend.screen_name
            friendship = api.show_friendship(source_screen_name=api.me().screen_name, target_screen_name=screen_name)
            follow_date = friendship[0].created_at

            if follow_date > cutoff_date:
                api.destroy_friendship(user_id)
                logger.info(f"Unfollowed user: {screen_name} (ID: {user_id}), followed on {follow_date}")
                unfollow_count += 1
            else:
                logger.info(f"Skipping user: {screen_name} (ID: {user_id}), followed on {follow_date}")
    except tweepy.TweepyException as e:
        logger.error(f"Failed to get friends or unfollow users: {e}")

# Authenticate with Twitter API v1.1 for following/unfollowing actions
logger.info("Starting authentication for Twitter API v1.1...")
api_v1 = authenticate_v1()

# Configurable frequency for follow/unfollow (random between 1 to 2 hours)
FOLLOW_UNFOLLOW_INTERVAL = random.randint(3600, 7200)
logger.info(f"Configured follow/unfollow interval: {FOLLOW_UNFOLLOW_INTERVAL} seconds")

# Hashtags for following and unfollowing
HASHTAGS = ["DevOps", "Python", "MachineLearning"]

# Follow and unfollow accounts based on hashtags
while True:
    for hashtag in HASHTAGS:
        logger.info(f"Processing hashtag: #{hashtag}")
        follow_accounts_by_hashtag(api_v1, hashtag)
    
    unfollow_accounts_younger_than(api_v1, days=7)

    # Wait for the configured interval before next follow/unfollow cycle
    logger.info(f"Waiting for {FOLLOW_UNFOLLOW_INTERVAL} seconds before the next follow/unfollow cycle...")
    time.sleep(FOLLOW_UNFOLLOW_INTERVAL)
