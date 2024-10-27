import tweepy
import os
import logging
import time
import random
from dotenv import load_dotenv
from generate import generate_post_topic, gpt_generate_tweet
from authenticate import authenticate_v2, authenticate_v1
from image_generator import gpt_generate_image

# Configure logger with timestamp and log level
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Load environment variables from the .env file
logger.info("Loading environment variables from .env file...")
load_dotenv()


# Main function to run the tweet generation process
def main():
    """
    Main function to run the tweet generation process
    """
    try:
        # Authenticate with Twitter API v2
        logger.info("Starting authentication for Twitter API v2...")
        client = authenticate_v2()

        # Configurable frequency for posting (from environment variable or default to random between 1 to 2 hours)
        POST_INTERVAL = int(os.getenv("POST_INTERVAL", random.randint(600, 7200)))
        logger.info(f"Configured posting interval: {POST_INTERVAL} seconds")

        while True:
            try:
                logger.info("Starting tweet generation process...")
                post_topic = generate_post_topic()  # Generate the topic once

                # Generate both image and tweet based on the same topic
                image_path = gpt_generate_image(post_topic)
                tweet_v2 = gpt_generate_tweet(post_topic)
                logger.info(f"Attempting to post tweet using v2 API: '{tweet_v2}'")

                if image_path:
                    # Authenticate with Twitter API v1.1 to upload media
                    api_v1 = authenticate_v1()
                    media = api_v1.media_upload(filename=image_path)
                    # Post the tweet with the image
                    response = client.create_tweet(
                        text=tweet_v2, media_ids=[media.media_id]
                    )
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

                logger.info(
                    f"Waiting for {POST_INTERVAL} seconds before the next tweet..."
                )
                time.sleep(POST_INTERVAL)

            except tweepy.TweepyException as e:
                logger.error(f"Failed to post tweet using v2 API: {e}")
            except Exception as e:
                logger.error(f"An unexpected error occurred: {e}")

    except KeyboardInterrupt:
        logger.info("Tweet posting process interrupted by user.")
    finally:
        logger.info("Exiting the tweet posting process.")


if __name__ == "__main__":
    main()
