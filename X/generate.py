import os
import logging
import random
from openai import OpenAI
import openai
import requests

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError(
        "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable."
    )
ai_client = OpenAI(api_key=OPENAI_API_KEY)


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
        "Robots",
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic: {topic}")
    return topic


def generate_tweet():
    """
    Generate a post based on a dynamically generated topic using ChatGPT API.
    """
    post_topic = generate_post_topic()
    logger.info(
        f"Generating a post based on the following topic using ChatGPT API: {post_topic}..."
    )
    response = ai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a posting agent.  Your purpose is to generate tweets that will keep the audience engaged and want to follow you."},
            {
                "role": "user",
                "content": f"Generate a concise post with latest tips, tricks, news, or shortcuts for {post_topic}. Ensure it is under 200 characters including hashtags.",
            },
        ],
    )
    logger.info(
        f"Received response from ChatGPT API for topic '{post_topic}': {response}"
    )
    tweet = response.choices[0].message.content.strip()
    if len(tweet) > 200:
        logger.warning(
            f"Generated tweet exceeds 200 characters. Truncating tweet: {tweet}"
        )
        tweet = tweet[:197] + "..."  # Truncate to 200 characters with ellipsis
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
            prompt=f"Create an isometric pixel art scene of a busy data center. Include elements such as stacks of servers, cables, and networking equipment. Add characters working on various tasks, such as a person monitoring graphs on a computer screen, someone typing on a laptop, and a group of people discussing a {post_topic} problem. Incorporate quirky details like lava spilling from a broken server and small humorous elements like papers scattered on desks. Use a mix of warm and neutral colors to convey a vibrant yet chaotic environment",
            n=1,
            size="512x512",
        )
        image_url = response.data[0].url
        logger.info(f"Create and an image for topic '{post_topic}': {image_url}")
        # Download the image to a local file
        image_path = "images/image.png"
        image_response = requests.get(image_url)
        if image_response.status_code == 200:
            with open(image_path, "wb") as file:
                file.write(image_response.content)
            logger.info(f"Image downloaded successfully to {image_path}")
        else:
            logger.error(
                f"Failed to download image, status code: {image_response.status_code}"
            )
            return None
        return image_path
    except openai.BadRequestError as e:
        if "billing_hard_limit_reached" in str(e):
            logger.error("Billing hard limit has been reached. Cannot generate image.")
        else:
            logger.error(f"Failed to generate image: {e}")
        return None
