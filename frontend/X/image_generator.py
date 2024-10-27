from diffusers import StableDiffusionPipeline
from torch import autocast
from authenticate import open_ai_auth
import logging
import torch
import os
import openai
import requests


# Configure logger with timestamp and log level
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

ai_client = open_ai_auth()


def main(topic):
    print("Starting the main function...")
    generate_image(topic)
    print("Main function finished.")


def validate_topic(topic):
    if not topic or not isinstance(topic, str):
        raise ValueError("The topic must be a non-empty string.")
    return topic.strip()


def generate_image(topic):
    print(f"Generating image for topic: {topic}")
    model_id = "runwayml/stable-diffusion-v1-5"
    print(f"Loading model: {model_id}")
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)

    pipe.enable_attention_slicing()
    print("Model loaded successfully.")

    if torch.cuda.is_available():
        pipe = pipe.to("cuda")
        print(f"CUDA available. Using {torch.cuda.get_device_name(0)}")
    else:
        print("CUDA is not available. Using CPU instead.")

    if "DevOps" in topic:
        prompt = f"A photorealistic scene of a DevOps engineer working in a data center, surrounded by servers, code, and CI/CD pipelines. Include {topic} elements."
    elif "Artificial Intelligence" in topic:
        prompt = f"A photorealistic scene of an AI lab, with neural networks, robots, and computers analyzing data. Highlight {topic} with futuristic tech."
    elif "Blockchain" in topic:
        prompt = "A futuristic photorealistic scene showcasing blockchain technology, with digital ledgers, nodes, and cryptocurrency symbols like Bitcoin."
    elif "Machine Learning" in topic:
        prompt = f"A photorealistic scene of a machine learning lab, with data scientists, algorithms, and deep learning models. Include {topic} elements."
    elif "Cybersecurity" in topic:
        prompt = f"A Lego scene of a cybersecurity operations center, with analysts, firewalls, and threat detection systems. Include {topic} elements."
    elif "Cloud Computing" in topic:
        prompt = f"A Lego scene of a cloud data center, with servers, virtual machines, and cloud storage. Highlight {topic} with modern tech."
    elif "Artificial Neural Networks (ANN) & Deep Learning" in topic:
        prompt = f"A Lego scene of a deep learning lab, with artificial neural networks, training data, and AI researchers. Include {topic} elements."
    elif "Data Science & Data Analytics" in topic:
        prompt = f"A Lego scene of a data science lab, with data visualization, machine learning models, and big data analysis. Include {topic} elements."
    elif "Python (Programming Language)" in topic:
        prompt = f"A Lego scene of a Python coding environment, with code editors, libraries, and programming concepts. Highlight {topic} with Pythonic elements."
    elif "Tech Trends (2024)" in topic:
        prompt = f"A Lego scene of a futuristic tech expo, showcasing the latest gadgets, AI robots, and smart devices. Include {topic} elements."
    elif "Robots & Automation" in topic:
        prompt = f"A photorealistic scene of a robotics lab, with autonomous robots, drones, and automation equipment. Highlight {topic} with futuristic tech."
    elif "HelloAI" in topic:
        prompt = f"A Lego scene of an AI-powered agent, posting messages on X.com. Include {topic} elements."
    elif "VenezArt" in topic:
        prompt = f"A dynamic and visually rich image showcasing a blend of animations, immersive gaming, graphic design, and custom apparel creation. The scene features elements like a digital artist's workstation with a tablet, gaming controllers, 3D animation characters, and apparel with unique designs, all set in a vibrant, futuristic studio. The background hints at a creative workspace with a subtle mix of technology and art, with glowing screens and colorful sketches, embodying the theme 'where tech meets art."
    else:
        prompt = f"Create a random isometric pixel art scene of a busy data center. Include elements such as stacks of servers, {topic}, cables, and networking equipment."

    print(f"Generated prompt: {prompt}")
    try:
        with autocast("cuda"):
            image = pipe(prompt).images[0]
        print("Image generated successfully.")
    except Exception as e:
        print(f"Error generating image: {e}")
        return

    # Check if the 'images' directory exists, create if it doesn't
    if not os.path.exists("images"):
        os.makedirs("images")
        print("Created 'images' directory.")

    image.save("images/ai_gen_image.png")
    print("Image saved to images/ai_gen_image.png")

    # Maybe TODO: Save image with timestamp
    # timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # file_name = f"images/{topic}_{timestamp}.png"
    # image.save(file_name)
    # print(f"Image saved to {file_name}")


def gpt_generate_image(post_topic: str):
    """
    Generate an image related to the topic using the OpenAI image generation API.
    Catch billing errors and handle them gracefully.
    """
    logger.info(f"Generating an image related to topic: {post_topic}")
    prompt_map = {
        "Artificial Intelligence (AI)": "A photorealistic lego image of a humanoid robot with a glowing neural network visible through its transparent head. The robot is sitting in front of multiple computer screens displaying AI data and graphs. In the background, a large server rack filled with blinking lights symbolizes the vast data being processed.",
        "Machine Learning (ML)": "A photorealistic lego representation of Machine Learning: an abstract brain made of data streams and binary code. Around it, colorful lines of algorithms and mathematical symbols swirl through a digital void. In the background, layers of neural networks glow, showing the hidden processes of machine learning models as they evolve and learn from data.",
        "Cybersecurity": "A photorealistic lego representation of cybersecurity: a glowing digital fortress with layers of firewalls, encryption keys, and locks floating around it. Binary code streams through the background, symbolizing data protection. In the distance, shadowy figures representing hackers attempt to breach the fortress, but beams of light block their path. The color scheme is neon blue and black, creating a high-tech, protective atmosphere.",
        "Cloud Computing": "A photorealistic lego image of a modern data center with vast rows of servers connected to cloud infrastructure. Technicians in the background are maintaining the servers, while holographic screens display real-time cloud storage data, network connections, and virtual machines being managed. Outside the glass window, a futuristic city skyline symbolizes global connectivity powered by cloud computing. The room is brightly lit with a cool blue hue, emphasizing the advanced technology.",
        "Blockchain & Cryptocurrency": "A photorealistic lego image of a high-tech office with multiple computer screens displaying live blockchain transactions and cryptocurrency market charts. In the foreground, a digital wallet interface shows Bitcoin and Ethereum transactions being processed. Holographic screens float above the desk, showing decentralized network nodes and encrypted ledgers. In the background, a large wall-sized digital map highlights global blockchain networks, with bright neon lines connecting various cities. The environment is illuminated with a soft blue glow, emphasizing the futuristic, digital economy.",
        "DevOps & CI/CD": "A photorealistic lego image of a DevOps engineer sitting in front of a multi-monitor setup, overseeing continuous integration and continuous deployment pipelines. The screens display automated tests running, deployment logs, and code being pushed to production. In the background, servers in a data center are lit up, connected to the cloud. A digital dashboard shows system health, uptime metrics, and real-time monitoring of microservices. The workspace has a clean, modern look with subtle neon lighting, emphasizing the seamless automation and fast-paced nature of DevOps workflows.",
        "Artificial Neural Networks (ANN) & Deep Learning": "A photorealistic lego image of a high-tech research lab where deep learning models are being trained. Multiple large computer screens show complex neural network diagrams, training algorithms, and real-time data visualizations. In the center, a powerful GPU cluster is actively processing large datasets, with glowing cables connected to the servers. On a nearby table, a digital whiteboard displays a flowchart of a deep learning model architecture. The environment has a futuristic, clean design, with cool blue and white lighting emphasizing the advanced computational power of deep learning.",
        "Data Science & Data Analytics": "A photorealistic Lego image of a sleek, modern data science office with a large digital dashboard displaying real-time data analytics, graphs, and predictive models. On multiple monitors, a data scientist is working with complex datasets, using tools like Python and Jupyter Notebooks to analyze trends and patterns. In the background, a team collaborates on a large screen displaying a heatmap and other visualizations of big data. The room is brightly lit with a blue hue, and the atmosphere reflects the high-tech environment of advanced data analytics.",
        "Python (Programming Language)": "A photorealistic Lego of some python code on a computer screen.",
        "Tech Trends (2024)": "A photorealistic Lego image of a futuristic tech expo showcasing the latest innovations for 2024. In the foreground, cutting-edge gadgets like foldable smartphones, augmented reality (AR) glasses, and AI-powered drones are displayed on sleek, illuminated platforms. In the background, large digital screens show live demos of emerging technologies such as quantum computing, 6G networks, and AI-driven automation. Attendees interact with holographic interfaces and virtual assistants. The environment is brightly lit with neon accents, highlighting the high-tech atmosphere of a rapidly evolving tech world.",
        "Robots & Automation": "A photorealistic Lego of a state-of-the-art robotics factory where autonomous robots are assembling complex machinery with precision. The robots, equipped with advanced sensors and AI, work alongside automated conveyor belts, assembling products without human intervention. In the background, a control center displays real-time data on robotic efficiency, automation workflows, and machine learning optimization. The factory floor is illuminated with soft industrial lighting, reflecting a clean, futuristic workspace focused on speed and precision.",
        "HelloAI": "A photorealistic Lego of an AI-powered personal assistant in action, displayed as a holographic interface floating above a sleek, modern desk. The assistant is responding to voice commands, managing tasks like scheduling, sending emails, and offering weather updates. In the background, a smart home setup is visible, with lights, temperature, and security systems controlled through the AI interface. The environment is illuminated with soft ambient lighting, creating a futuristic, tech-savvy atmosphere where AI seamlessly integrates with everyday life.",
    }

    prompt = prompt_map.get(
        post_topic,
        f"Create a random isometric scene of {post_topic} with futuristic elements.",
    )
    try:
        response = ai_client.images.generate(
            prompt=prompt,
            n=1,
            size="512x512",
        )

        image_url = response.data[0].url
        logger.info(f"Generated image for topic '{post_topic}': {image_url}")

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
    except openai.error.OpenAIError as e:
        logger.error(f"Failed to generate image: {e}")
        return None


if __name__ == "__main__":
    topic = "DevOps"  # Replace with desired topic or use input()
    main(topic)
