
import asyncio
import base64
import os
import uuid
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

# -------------------- CONFIGURATION --------------------

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
JSON2VIDEO_API_KEY = os.getenv("JSON2VIDEO_API_KEY", "").strip()

CLOUDFLARE_API_BASE = (
    "https://api.cloudflare.com/client/v4/accounts/"
    f"{CLOUDFLARE_ACCOUNT_ID}/ai"
)

JSON2VIDEO_API_BASE = "https://api.json2video.com/v2"

IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell"

VIDEO_DURATION = 60
SCENE_DURATION = 10
SCENE_COUNT = 6

app = FastAPI(
    title="FOXICAN AI API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# -------------------- REQUEST MODELS --------------------

class ImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    aspect_ratio: str = "1:1"
    quality: str = "Standard"


class VideoRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2500)
    ratio: str = "16:9"
    resolution: str = "720P"
    duration: int = Field(default=60, ge=1, le=60)


# -------------------- COMMON HELPERS --------------------

def require_cloudflare() -> None:
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Cloudflare credentials are missing in backend/.env.",
        )


def require_json2video() -> None:
    if not JSON2VIDEO_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="JSON2VIDEO_API_KEY is missing in backend/.env.",
        )


def cloudflare_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json",
    }


def json2video_headers() -> dict:
    return {
        "x-api-key": JSON2VIDEO_API_KEY,
        "Content-Type": "application/json",
    }


def provider_error(data: Any) -> str:
    if isinstance(data, dict):
        errors = data.get("errors")

        if isinstance(errors, list) and errors:
            return "; ".join(
                str(item.get("message", item))
                if isinstance(item, dict)
                else str(item)
                for item in errors
            )

        return str(
            data.get("detail")
            or data.get("message")
            or "Provider returned an error."
        )

    return "Provider returned an unexpected response."


def get_image_bytes(response: httpx.Response) -> tuple[bytes, str]:
    content_type = response.headers.get(
        "content-type", "image/jpeg"
    ).split(";")[0]

    if content_type.startswith("image/"):
        return response.content, content_type

    try:
        data = response.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Cloudflare returned an invalid image response.",
        )

    if data.get("success") is False:
        raise HTTPException(
            status_code=502,
            detail=provider_error(data),
        )

    result = data.get("result", data)
    image = result.get("image") if isinstance(result, dict) else None

    if not isinstance(image, str) or not image:
        raise HTTPException(
            status_code=502,
            detail="Cloudflare did not return an image.",
        )

    if image.startswith("data:"):
        header, encoded = image.split(",", 1)
        mime = header.split(";")[0].replace("data:", "")
        return base64.b64decode(encoded), mime

    return base64.b64decode(image), "image/jpeg"


# -------------------- CLOUDFLARE IMAGE GENERATION --------------------

async def generate_scene_image(
    client: httpx.AsyncClient,
    prompt: str,
) -> tuple[bytes, str]:
    url = f"{CLOUDFLARE_API_BASE}/run/{IMAGE_MODEL}"
    last_error = "Cloudflare request failed."

    # Retry temporary network failures and temporary provider errors.
    for attempt in range(3):
        try:
            response = await client.post(
                url,
                headers=cloudflare_headers(),
                json={"prompt": prompt, "steps": 4},
                timeout=180,
            )

            if response.is_success:
                return get_image_bytes(response)

            try:
                detail = provider_error(response.json())
            except ValueError:
                detail = response.text[:500] or "Empty response from Cloudflare."

            # These responses may be temporary; retry them.
            if response.status_code not in (429, 500, 502, 503, 504):
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Cloudflare error: {detail}",
                )

            last_error = f"Cloudflare HTTP {response.status_code}: {detail}"

        except httpx.TimeoutException:
            last_error = "Cloudflare image generation timed out."
        except httpx.RequestError as exc:
            last_error = f"Could not connect to Cloudflare: {type(exc).__name__}"

        if attempt < 2:
            await asyncio.sleep(2 ** attempt)

    raise HTTPException(
        status_code=502,
        detail=f"Cloudflare failed after 3 attempts. {last_error}",
    )


# -------------------- JSON2VIDEO MEDIA UPLOAD --------------------

async def upload_scene_image(
    client: httpx.AsyncClient,
    image_bytes: bytes,
    content_type: str,
    scene_number: int,
) -> str:

    extension = (
        "png" if "png" in content_type else "jpg"
    )

    filename = (
        f"foxican_{uuid.uuid4().hex}_scene_{scene_number}.{extension}"
    )

    try:
        response = await client.post(
            f"{JSON2VIDEO_API_BASE}/media/file",
            headers=json2video_headers(),
            json={
                "name": filename,
                "contentType": content_type,
                "size": len(image_bytes),
                "folder": "foxican-scenes",
            },
            timeout=60,
        )

        if not response.is_success:
            raise HTTPException(
                status_code=response.status_code,
                detail=provider_error(response.json()),
            )

        upload_data = response.json()

        upload_url = upload_data.get("uploadUrl")
        file_url = upload_data.get("fileUrl")

        if not upload_url or not file_url:
            raise HTTPException(
                status_code=502,
                detail="JSON2Video did not return upload URLs.",
            )

        # Upload image bytes directly to the temporary upload URL.
        upload_response = await client.put(
            upload_url,
            content=image_bytes,
            headers={"Content-Type": content_type},
            timeout=120,
        )

        if not upload_response.is_success:
            raise HTTPException(
                status_code=502,
                detail="Could not upload a generated scene image.",
            )

        return file_url

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="JSON2Video media upload timed out.",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to JSON2Video media storage.",
        )


# -------------------- VIDEO SCENES --------------------

def build_scene_prompts(prompt: str) -> list[str]:
    scene_directions = [
        "Opening scene: a wide cinematic establishing shot.",
        "Second scene: show the main subject from a different camera angle.",
        "Third scene: show important details and surroundings.",
        "Fourth scene: create a visually rich close-up shot.",
        "Fifth scene: show a dramatic wide composition.",
        "Final scene: create a beautiful cinematic closing shot.",
    ]

    return [
        (
            f"{prompt}. {direction} "
            "High quality cinematic composition, detailed lighting, "
            "professional photography, visually consistent style. "
            "No text, no watermark."
        )
        for direction in scene_directions
    ]


def build_movie_json(
    prompt: str,
    image_urls: list[str],
    ratio: str,
) -> dict:

    scenes = []

    for index, image_url in enumerate(image_urls):
        directions = [
            "right",
            "left",
            "top",
            "bottom",
            "top-right",
            "bottom-left",
        ]

        scenes.append({
            "comment": f"FOXICAN AI Scene {index + 1}",
            "duration": SCENE_DURATION,
            "elements": [
                {
                    "type": "image",
                    "src": image_url,
                    "duration": SCENE_DURATION,
                    "resize": "cover",
                    "position": "center-center",
                    "zoom": 3 if index % 2 == 0 else -2,
                    "pan": directions[index],
                    "fade-in": 0.7,
                    "fade-out": 0.7,
                },
                {
                    "type": "text",
                    "text": prompt[:100],
                    "duration": SCENE_DURATION,
                    "style": "002",
                    "settings": {
                        "font-family": "Montserrat",
                        "font-size": "36px",
                        "font-weight": "700",
                        "color": "#FFFFFF",
                        "text-align": "center",
                        "text-shadow": "2px 2px 8px #000000",
                        "vertical-position": "bottom",
                        "horizontal-position": "center",
                    },
                    "fade-in": 0.5,
                    "fade-out": 0.5,
                },
            ],
        })

    if ratio == "9:16":
        resolution = "instagram-story"
    elif ratio == "1:1":
        resolution = "squared"
    elif ratio == "4:3":
        resolution = "custom"
    else:
        resolution = "full-hd"

    movie = {
        "resolution": resolution,
        "scenes": scenes,
    }

    if ratio == "4:3":
        movie["width"] = 1440
        movie["height"] = 1080

    return movie


# -------------------- JSON2VIDEO RENDERING --------------------

async def create_and_wait_for_video(
    client: httpx.AsyncClient,
    movie: dict,
) -> str:

    try:
        response = await client.post(
            f"{JSON2VIDEO_API_BASE}/movies",
            headers=json2video_headers(),
            json=movie,
            timeout=120,
        )

        if not response.is_success:
            try:
                detail = provider_error(response.json())
            except ValueError:
                detail = response.text[:500]

            raise HTTPException(
                status_code=response.status_code,
                detail=detail,
            )

        data = response.json()
        project_id = data.get("project")

        if not project_id:
            raise HTTPException(
                status_code=502,
                detail="JSON2Video did not return a project ID.",
            )

        # Render can take several minutes.
        # Poll every 5 seconds, up to 15 minutes.
        for _ in range(180):
            await asyncio.sleep(5)

            status_response = await client.get(
                f"{JSON2VIDEO_API_BASE}/movies",
                params={"project": project_id},
                headers=json2video_headers(),
                timeout=60,
            )

            if not status_response.is_success:
                raise HTTPException(
                    status_code=502,
                    detail="Could not check JSON2Video render status.",
                )

            status_data = status_response.json()
            movie_data = status_data.get("movie", {})
            status = movie_data.get("status", "").lower()

            if status == "done":
                video_url = movie_data.get("url")

                if (
                    isinstance(video_url, str)
                    and video_url.startswith("https://")
                ):
                    return video_url

                raise HTTPException(
                    status_code=502,
                    detail="Render completed but no video URL was returned.",
                )

            if status in {"error", "timeout"}:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "JSON2Video rendering failed: "
                        + str(movie_data.get("message", status))
                    ),
                )

        raise HTTPException(
            status_code=504,
            detail=(
                "Video rendering is taking too long. "
                "Please try again later."
            ),
        )

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="JSON2Video request timed out.",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to JSON2Video.",
        )


# -------------------- BASIC ROUTES --------------------

@app.get("/")
async def root():
    return {
        "name": "FOXICAN AI API",
        "status": "running",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "image_model": IMAGE_MODEL,
        "video_model": "JSON2Video",
        "cloudflare_configured": bool(
            CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
        ),
        "json2video_configured": bool(JSON2VIDEO_API_KEY),
        "video_duration": VIDEO_DURATION,
    }


# -------------------- IMAGE GENERATION --------------------

@app.post("/api/generate-image")
async def generate_image(request: ImageRequest):
    require_cloudflare()

    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty.",
        )

    async with httpx.AsyncClient() as client:
        image_bytes, content_type = await generate_scene_image(
            client,
            prompt,
        )

    encoded = base64.b64encode(image_bytes).decode("ascii")

    return {
        "image": f"data:{content_type};base64,{encoded}"
    }


# -------------------- VIDEO GENERATION --------------------

@app.post("/api/generate-video")
async def generate_video(request: VideoRequest):
    require_cloudflare()
    require_json2video()

    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty.",
        )

    allowed_ratios = {
        "16:9",
        "9:16",
        "1:1",
        "4:3",
    }

    if request.ratio not in allowed_ratios:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video ratio: {request.ratio}",
        )

    image_urls = []

    scene_prompts = build_scene_prompts(prompt)

    # Generate and upload six separate AI images.
    async with httpx.AsyncClient() as client:

        for index, scene_prompt in enumerate(scene_prompts):
            image_bytes, content_type = await generate_scene_image(
                client,
                scene_prompt,
            )

            image_url = await upload_scene_image(
                client,
                image_bytes,
                content_type,
                index + 1,
            )

            image_urls.append(image_url)

        movie = build_movie_json(
            prompt=prompt,
            image_urls=image_urls,
            ratio=request.ratio,
        )

        video_url = await create_and_wait_for_video(
            client,
            movie,
        )

    return {
        "video_url": video_url,
        "state": "completed",
        "model": "Cloudflare FLUX + JSON2Video",
        "duration": VIDEO_DURATION,
        "resolution": request.resolution,
        "ratio": request.ratio,
        "scenes": SCENE_COUNT,
    }
