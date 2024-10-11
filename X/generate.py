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


def generate_tweet(topic):
    
    """
    Generate a post based on a dynamically generated topic using Ollama.
    """
    # post_topic = generate_post_topic()
    logger.info(f"Generating a post based on the following topic: {topic}...")
    response = ollama.chat(model='llama3.2', messages=[
        {
            'role': 'user',
            'content': f'Generate a concise post with tips, news, or shortcuts for {topic}. Ensure it is under 250 characters and includes hashtags.',
        },
    ])
    logger.info(f"Received response from Ollama for topic '{topic}': {response}")
    tweet = response['message']['content']
    logger.info(f"Generated tweet: {tweet}")
    return tweet

def find_image_for_topic(topic: str):
    """
    Find an image that matches the topic from the images folder.
    """
    images_folder = "images/"
    logger.info(f"Searching for an image related to topic: {topic}")
    if not os.path.exists(images_folder):
        logger.error(f"Images folder '{images_folder}' does not exist.")
        return None

    for filename in os.listdir(images_folder):
        if topic.lower() in filename.lower():
            image_path = os.path.join(images_folder, filename)
            logger.info(f"Found image for topic '{topic}': {image_path}")
            if not os.path.isfile(image_path):
                logger.error(f"Found file '{image_path}' is not a valid image file.")
                return None
            return image_path, topic
    logger.info(f"No image found for topic: {topic}")
    return None

def find_ai_generated_image(topic: str):
    """
    Find an image that matches the topic from the images folder.
    """
    image_path = "images/ai_gen_image.png"
    logger.info(f"Loading image for topic: {topic}")
    if not os.path.exists(image_path):
        logger.error(f"Image file '{image_path}' does not exist.")
        return None

    if not os.path.isfile(image_path):
        logger.error(f"Found file '{image_path}' is not a valid image file.")
        return None

    logger.info(f"Found image for topic '{topic}': {image_path}")
    return image_path