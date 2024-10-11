import tweepy
import os
import logging
import time
import random
from dotenv import load_dotenv
import ollama
from authenticate import authenticate_v2, authenticate_v1
from generate import generate_tweet, find_ai_generated_image, generate_post_topic
from image_generator import generate_image


# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    # Authenticate with Twitter API v2
    logger.info("Starting authentication for Twitter API v2...")
    client = authenticate_v2()
    topic = generate_post_topic()
    logger.info(f"Generated topic for the post: {topic}")
    generate_image(topic)

    # Configurable frequency for posting (random between 1 to 2 hours)
    POST_INTERVAL = random.randint(3600, 7200)
    logger.info(f"Configured posting interval: {POST_INTERVAL} seconds")

    # Post a tweet every configured interval
    while True:
        logger.info("Starting tweet generation process...")
        image_path = str(find_ai_generated_image(topic))
        print(f'Image path: {image_path}')
        print(type(image_path))

        if not image_path:
            logger.info("No valid image found, skipping image upload and proceeding with text-only post.")
        else:
            logger.info(f"Valid image found: {image_path}")

        tweet_v1 = str(generate_tweet(topic))
        print(f'Tweet: {tweet_v1}')
        print(type(tweet_v1))
        logger.info(f"Attempting to post tweet using v2 API: '{tweet_v1}'")
        try:
            if image_path:
                # Upload the media first using Tweepy API v1.1 client
                logger.info(f"Image found for topic '{topic}', attempting to upload image...")
                api_v1 = authenticate_v1()
                                
                media = api_v1.media_upload(filename=image_path)
                logger.info(f"Image uploaded successfully: media_id = {media.media_id}")
                
                # Then post the tweet with the image
                response = client.create_tweet(text=tweet_v1, media_ids=[media.media_id])
                logger.info(f"Tweeted successfully with image using v2 API: {response.data['id']}")
            else:
                logger.info("No image found, posting tweet without image.")
                # Post the tweet without an image
                response = client.create_tweet(text=tweet_v1)
                logger.info(f"Tweeted successfully without image using v2 API: {response.data['id']}")
        except tweepy.TweepyException as e:
            logger.error(f"Failed to post tweet using v2 API: {e}")
            if '403' in str(e):
                logger.error("Your client app is not configured with the appropriate permissions for this endpoint. Please check your app settings on the Twitter Developer Portal and make sure it has 'Read and Write' permissions. If permissions were updated, regenerate the Access Tokens and update your .env file.")

        # Wait for the configured interval before posting the next tweet
        logger.info(f"Waiting for {POST_INTERVAL} seconds before the next tweet...")
        time.sleep(POST_INTERVAL)

if __name__ == "__main__":
    main()