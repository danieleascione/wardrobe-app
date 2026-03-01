import modal
import io

# 1. Define the Cloud Environment
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "torchvision",
        "diffusers",
        "transformers<5.0.0",
        "accelerate",
        "Pillow"
    )
)

app = modal.App("flat-lay-generator")

# 2. Define the Remote GPU Function
@app.function(image=image, gpu="T4", timeout=600)
def generate_flat_lay(input_image_bytes: bytes, item_name: str) -> bytes:
    import torch
    import gc
    from PIL import Image
    from transformers import CLIPSegProcessor, CLIPSegForImageSegmentation
    from diffusers import StableDiffusionXLImg2ImgPipeline

    # --- A. LOAD IMAGE ---
    print(f"Loading image to process '{item_name}'...")
    original_image = Image.open(io.BytesIO(input_image_bytes)).convert("RGB")

    # --- B. DETECT & CROP THE GARMENT ---
    print(f"Searching for '{item_name}'...")
    processor = CLIPSegProcessor.from_pretrained("CIDAS/clipseg-rd64-refined")
    segmenter = CLIPSegForImageSegmentation.from_pretrained("CIDAS/clipseg-rd64-refined").to("cuda")

    inputs = processor(text=[item_name], images=[original_image], return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = segmenter(**inputs)

    # Find the bounding box of the detected item
    tensor = outputs.logits.unsqueeze(1)
    mask = torch.sigmoid(tensor) > 0.5
    indices = torch.nonzero(mask.squeeze())

    if len(indices) == 0:
        print(f"Could not find '{item_name}'. Using center crop as fallback.")
        crop_box = (0, 0, original_image.width, original_image.height)
    else:
        y_min, x_min = torch.min(indices, dim=0)[0]
        y_max, x_max = torch.max(indices, dim=0)[0]

        # Add a 50-pixel buffer around the item
        pad = 50
        left = max(0, x_min.item() - pad)
        top = max(0, y_min.item() - pad)
        right = min(original_image.width, x_max.item() + pad)
        bottom = min(original_image.height, y_max.item() + pad)
        crop_box = (left, top, right, bottom)

    cropped_item = original_image.crop(crop_box)

    # Resize the crop to exactly 1024x1024 for SDXL
    cropped_item = cropped_item.resize((1024, 1024), Image.Resampling.LANCZOS)

    # --- C. MEMORY CLEANUP ---
    del processor, segmenter, inputs, outputs, mask
    gc.collect()
    torch.cuda.empty_cache()

    # --- D. IMAGE-TO-IMAGE GENERATION (The Reshape) ---
    print("Loading SDXL Img2Img Model...")
    pipeline = StableDiffusionXLImg2ImgPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True
    ).to("cuda")

    print(f"Transforming '{item_name}' into a flat-lay...")

    prompt = f"professional flat-lay catalog photography of a {item_name}, pure solid white background #FFFFFF, top-down view, perfectly laid out, studio lighting, high resolution product shot, e-commerce"
    negative_prompt = "person, model, body, limbs, messy, wrinkled, hangers, mannequin, busy background, street, realistic human, walking"

    result_image = pipeline(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=cropped_item,
        num_inference_steps=40,
        strength=0.85,
        guidance_scale=8.5
    ).images[0]

    # --- E. RETURN RESULT ---
    output_buffer = io.BytesIO()
    result_image.save(output_buffer, format="JPEG", quality=95)
    return output_buffer.getvalue()

# 3. Define the Local Entry Point for Batch Processing
@app.local_entrypoint()
def main(input_path: str):
    print(f"Uploading {input_path} to Modal...")

    # Read the original full-body photo once
    with open(input_path, "rb") as f:
        input_bytes = f.read()

    # Define the dictionary of items to hunt for and their output filenames
    wardrobe = {
        "brown sweater": "sweater_flat.jpg",
        "plaid skirt": "skirt_flat.jpg",
        "plaid scarf": "scarf_flat.jpg",
        "black leather boots": "boots_flat.jpg"
    }

    # Loop through each item in the wardrobe
    for item_name, output_path in wardrobe.items():
        print(f"\n--- Extracting: {item_name.upper()} ---")

        # Send the image to the cloud GPU to hunt and reshape
        # This matches the remote function defined above!
        result_bytes = generate_flat_lay.remote(input_bytes, item_name)

        # Save the resulting flat-lay
        with open(output_path, "wb") as f:
            f.write(result_bytes)

        print(f"Success! {item_name} flat-lay saved to {output_path}")

    print("\nBatch processing complete! All catalog items are ready.")