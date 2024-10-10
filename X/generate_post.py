import random
import logging
import ollama
import os

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


def generate_tweet():
    """
    Generate a post based on a dynamically generated topic using Ollama.
    """
    post_topic = generate_post_topic()
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