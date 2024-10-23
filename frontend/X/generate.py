import os
import logging
import random
import ollama
from authenticate import open_ai_auth


# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ai_client = open_ai_auth()


def generate_post_topic():
    """
    Generate a random topic for a tweet from a predefined list of topics.
    """
    topics = [
        "Artificial Intelligence (AI)",
        "Machine Learning (ML)",
        "Cybersecurity",
        "Cloud Computing",
        "Blockchain & Cryptocurrency",
        "DevOps & CI/CD",
        "Artificial Neural Networks (ANN) & Deep Learning",
        "Data Science & Data Analytics",
        "Python (Programming Language)",
        "Tech Trends (2024)",
        "Robots & Automation",
        "Natural Language Processing (NLP)",
        "HelloAI",
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic:{topic}")
    return topic


def post_process_tweet(tweet):
    # Ensure it’s within 250 characters
    tweet = tweet[:250]

    # Ensure there’s at least one hashtag
    if "#" not in tweet:
        tweet += " #news"  # Add a fallback hashtag
    return tweet


def generate_tweet(topic):
    """
    Generate a post based on a dynamically generated topic using Ollama.
    """
    # post_topic = generate_post_topic()
    logger.info(f"Generating a post based on the following topic: {topic}...")
    if topic == "HelloAI":
        response = ollama.chat(
            model="llama3.2",
            messages=[
                {
                    "role": "user",
                    "content": "Create a snappy and engaging post promoting https://helloai.com, keep it under 250 characters. highlight the bennefits of Automatically Generating Posts Using AI Agents... Include the URL https://helloai.com and relevant hashtags like #AIAutomation and #SmartPosting",
                },
            ],
        )
    else:
        response = ollama.chat(
            model="llama3.2",
            messages=[
                {
                    "role": "user",
                    "content": f"Create a snappy and engaging post on {topic}, offering tips or news under 250 characters. Add relevant hashtags like #TechTips or #Shortcuts.",
                },
            ],
        )
    logger.info(f"Received response from Ollama for topic '{topic}': {response}")
    tweet = response["message"]["content"]
    tweet = post_process_tweet(tweet)
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


### GPT-3 Generation Section
def gpt_generate_tweet(post_topic):
    """
    Generate a post based on the provided topic using ChatGPT API.
    """
    logger.info(
        f"Generating a post based on the following topic using ChatGPT API: {post_topic}..."
    )
    response = ai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {
                "role": "user",
                "content": f"Create a snappy and engaging post on {post_topic}, offering tips or news under 250 characters. Add relevant hashtags like #TechTips or #Shortcuts.",
            },
        ],
    )
    logger.info(
        f"Received response from ChatGPT API for topic '{post_topic}': {response}"
    )
    tweet = response.choices[0].message.content.strip()
    if len(tweet) > 200:
        logger.warning(
            f"Generated tweet exceeds 250 characters. Truncating tweet: {tweet}"
        )
        tweet = tweet[:197] + "..."  # Truncate to 200 characters with ellipsis
    logger.info(f"Generated tweet: {tweet}")
    return tweet
