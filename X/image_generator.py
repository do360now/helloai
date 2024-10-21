from diffusers import StableDiffusionPipeline
from torch import autocast
from datetime import datetime
import torch
import os


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
        prompt = f"An isometric scene of a DevOps engineer working in a data center, surrounded by servers, code, and CI/CD pipelines. Include {topic} elements."
    elif "Artificial Intelligence" in topic:
        prompt = f"An isometric scene of an AI lab, with neural networks, robots, and computers analyzing data. Highlight {topic} with futuristic tech."
    elif "Blockchain" in topic:
        prompt = f"A futuristic isometric scene showcasing blockchain technology, with digital ledgers, nodes, and cryptocurrency symbols like Bitcoin."
    elif "Machine Learning" in topic:
        prompt = f"An isometric scene of a machine learning lab, with data scientists, algorithms, and deep learning models. Include {topic} elements."
    elif "Cybersecurity" in topic:
        prompt = f"An isometric scene of a cybersecurity operations center, with analysts, firewalls, and threat detection systems. Include {topic} elements."
    elif "Cloud Computing" in topic:
        prompt = f"An isometric scene of a cloud data center, with servers, virtual machines, and cloud storage. Highlight {topic} with modern tech."
    elif "Artificial Neural Networks (ANN) & Deep Learning" in topic:
        prompt = f"An isometric scene of a deep learning lab, with artificial neural networks, training data, and AI researchers. Include {topic} elements."
    elif "Data Science & Data Analytics" in topic:
        prompt = f"An isometric scene of a data science lab, with data visualization, machine learning models, and big data analysis. Include {topic} elements."
    elif "Python (Programming Language)" in topic:
        prompt = f"An isometric scene of a Python coding environment, with code editors, libraries, and programming concepts. Highlight {topic} with Pythonic elements."
    elif "Tech Trends (2024)" in topic:
        prompt = f"An isometric scene of a futuristic tech expo, showcasing the latest gadgets, AI robots, and smart devices. Include {topic} elements."
    elif "Robots & Automation" in topic:
        prompt = f"An isometric scene of a robotics lab, with autonomous robots, drones, and automation equipment. Highlight {topic} with futuristic tech."
    elif "HelloAI" in topic:
        prompt = f"An isometric scene of an AI-powered agent, posting messages on X.com. Include {topic} elements."
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


if __name__ == "__main__":
    topic = "DevOps"  # Replace with desired topic or use input()
    main(topic)
