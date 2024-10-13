from diffusers import StableDiffusionPipeline
import torch
import os


def main(topic):
    print("Starting the main function...")
    generate_image(topic)
    print("Main function finished.")


def generate_image(topic):
    print(f"Generating image for topic: {topic}")
    model_id = "runwayml/stable-diffusion-v1-5"
    print(f"Loading model: {model_id}")
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)

    if torch.cuda.is_available():
        pipe = pipe.to("cuda")
        print("Model loaded and moved to CUDA.")
    else:
        print("CUDA is not available. Using CPU instead.")

    prompt = f"Create a random isometric pixel art scene of a busy data center. Include elements such as stacks of servers, {topic}, cables, and networking equipment."
    print(f"Generated prompt: {prompt}")
    try:
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


if __name__ == "__main__":
    topic = "DevOps"  # Replace with desired topic or use input()
    main(topic)
