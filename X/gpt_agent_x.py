import tweepy
import os
import logging
import time
import random
import math
from authenticate import authenticate_v2, authenticate_v1
from generate import generate_post_topic, generate_tweet, generate_image_for_topic

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Authenticate with Twitter API v2
logger.info("Starting authentication for Twitter API v2...")
client = authenticate_v2()

# Configurable frequency for posting (from environment variable or default to random between 1 to 2 hours)
POST_INTERVAL = int(os.getenv("POST_INTERVAL", random.randint(3600, 7200)))
logger.info(f"Configured posting interval: {POST_INTERVAL} seconds")

# Post a tweet every configured interval with retry mechanism
retry_count = 0
MAX_RETRIES = 5

while retry_count < MAX_RETRIES:
    try:
        logger.info("Starting tweet generation process...")
        image_path = generate_image_for_topic(generate_post_topic())

        if not image_path:
            logger.info(
                "No valid image found, skipping image upload and proceeding with text-only post."
            )
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
            logger.info(
                f"Tweeted successfully with image using v2 API: {response.data['id']}"
            )
        else:
            logger.info("No image found, posting tweet without image.")
            # Post the tweet without an image
            response = client.create_tweet(text=tweet_v2)
            logger.info(
                f"Tweeted successfully without image using v2 API: {response.data['id']}"
            )

        # Reset retry count after successful tweet
        retry_count = 0
        logger.info(f"Waiting for {POST_INTERVAL} seconds before the next tweet...")
        time.sleep(POST_INTERVAL)
    except tweepy.TweepyException as e:
        logger.error(f"Failed to post tweet using v2 API: {e}")
        if "403" in str(e):
            logger.error(
                "Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file."
            )
        retry_count += 1
        sleep_time = min(
            POST_INTERVAL, math.pow(2, retry_count) * 10
        )  # Exponential backoff
        logger.error(
            f"Retry attempt {retry_count} of {MAX_RETRIES}, sleeping for {sleep_time} seconds..."
        )
        time.sleep(sleep_time)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        retry_count += 1
        sleep_time = min(POST_INTERVAL, math.pow(2, retry_count) * 10)
        logger.error(
            f"Retry attempt {retry_count} of {MAX_RETRIES}, sleeping for {sleep_time} seconds..."
        )
        time.sleep(sleep_time)

if retry_count >= MAX_RETRIES:
    logger.error("Max retries reached. Stopping the tweet posting process.")
    logger.info("Exiting the tweet posting process.")
    exit(1)
