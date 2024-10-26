import os
import logging
import random
import ollama
from authenticate import open_ai_auth


# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ai_client = open_ai_auth()

import random
import logging

logger = logging.getLogger(__name__)

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
        "VenezArt",
        "Cutting-Edge Gadgets"  # New topic for Amazon link
    ]
    topic = random.choice(topics)
    logger.info(f"Selected random topic: {topic}")
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
    logger.info(f"Generating a post based on the following topic: {topic}...")

    # Specific prompts for each topic
    prompts = {
        "Artificial Intelligence (AI)": "Share insights into the future of AI and how it’s transforming industries. Keep it under 250 characters with hashtags like #FutureTech and #AI.",
        "Machine Learning (ML)": "Generate a tweet on the latest ML trends and best practices. Keep it concise with hashtags #ML and #DataScience.",
        "Cybersecurity": "Promote tips on enhancing cybersecurity for everyday users under 250 characters. Use hashtags like #Cybersecurity and #StaySafeOnline.",
        "Cloud Computing": "Discuss benefits of cloud adoption for businesses. Keep it under 250 characters, including hashtags #CloudTech and #Innovation.",
        "Blockchain & Cryptocurrency": "Create an engaging post on blockchain’s impact on finance. Keep it within 250 characters and add hashtags like #Blockchain and #CryptoNews.",
        "DevOps & CI/CD": "Share tips for seamless CI/CD in DevOps. Keep it brief with hashtags #DevOps and #CICD.",
        "Artificial Neural Networks (ANN) & Deep Learning": "Promote the benefits of ANNs and deep learning advancements. Limit to 250 characters with hashtags #DeepLearning and #AIResearch.",
        "Data Science & Data Analytics": "Discuss the importance of data-driven decisions. Keep it under 250 characters and add hashtags #DataScience and #Analytics.",
        "Python (Programming Language)": "Generate a post on Python tips for beginners under 250 characters. Use hashtags #PythonTips and #CodeNewbie. Mention this link for best python books: https://amzn.to/4f11fJC",
        "Tech Trends (2024)": "Share predictions for tech trends in 2024. Limit to 250 characters and include #TechTrends2024 and #Innovation.",
        "Robots & Automation": "Discuss the role of robotics in modern industries. Keep it under 250 characters with hashtags #Automation and #Robotics.",
        "Natural Language Processing (NLP)": "Promote NLP’s role in enhancing customer experience. Keep it brief with hashtags #NLP and #AI.",
        "HelloAI": "Create a snappy and engaging post promoting https://helloai.com, keep it under 250 characters. Highlight benefits of Automatic Post Generation using AI Agents. Use hashtags like #AIAutomation and #SmartPosting.",
        "VenezArt": "Generate a tweet on VenezArt Multimedia Corp’s services. Keep it under 250 characters, using hashtags like #Innovation, #Multimedia, and #VenezArt.",
        "Cutting-Edge Gadgets": "Share a captivating tweet promoting the latest tech gadget. Mention this link https://amzn.to/3Ahx4i9 as a top pick for tech enthusiasts. Use hashtags like #TechGadget and #AmazonFinds."
    }

    if topic in prompts:
        response = ollama.chat(
            model="llama3.2",
            messages=[
                {
                    "role": "user",
                    "content": prompts[topic],
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
