from diffusers import StableDiffusionPipeline
import torch


def main():
    generate_image()

def generate_image(topic):
    model_id = "runwayml/stable-diffusion-v1-5"
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
    pipe = pipe.to("cuda")

    prompt = f"An image of {topic} for social media sharing."
    image = pipe(prompt).images[0]

    image.save(f"images/ai_gen_image.png")    

if __name__ == "__main__":
    main()
