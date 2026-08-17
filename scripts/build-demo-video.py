from __future__ import annotations

import os
import subprocess
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "submission" / "video"
SLIDES = OUT / "slides"
SCREENSHOTS = ROOT / "submission" / "screenshots"
WIDTH, HEIGHT = 1280, 720


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path(os.environ["WINDIR"]) / "Fonts" / name), size)


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#090616")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        color = (
            int(9 + 20 * ratio),
            int(6 + 7 * ratio),
            int(22 + 30 * ratio),
        )
        draw.line((0, y, WIDTH, y), fill=color)
    draw.ellipse((880, -260, 1430, 290), fill="#241251")
    draw.ellipse((-240, 490, 300, 1030), fill="#11243d")
    return image, draw


def wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int,
            size: int, fill: str = "#eae8f5", bold: bool = False, spacing: int = 8) -> int:
    face = font(size, bold)
    chars = max(12, int(width / (size * 0.55)))
    lines: list[str] = []
    for paragraph in text.split("\n"):
        lines.extend(textwrap.wrap(paragraph, width=chars) or [""])
    y = xy[1]
    for line in lines:
        draw.text((xy[0], y), line, font=face, fill=fill)
        y += size + spacing
    return y


def heading(draw: ImageDraw.ImageDraw, kicker: str, title: str, subtitle: str = "") -> int:
    draw.text((64, 48), kicker.upper(), font=font(18, True), fill="#a77bff")
    y = wrapped(draw, title, (64, 85), 1130, 46, "#ffffff", True, 8)
    if subtitle:
        y = wrapped(draw, subtitle, (64, y + 8), 1110, 23, "#c8c2dc", False, 7)
    return y


def screenshot_card(base: Image.Image, source: Path, box: tuple[int, int, int, int]) -> None:
    shot = Image.open(source).convert("RGB")
    x1, y1, x2, y2 = box
    target_w, target_h = x2 - x1, y2 - y1
    scale = min(target_w / shot.width, target_h / shot.height)
    resized = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.Resampling.LANCZOS)
    card = Image.new("RGB", (target_w + 12, target_h + 12), "#efeaff")
    card.paste(resized, ((target_w - resized.width) // 2 + 6, (target_h - resized.height) // 2 + 6))
    base.paste(card, (x1 - 6, y1 - 6))


def bullet(draw: ImageDraw.ImageDraw, y: int, label: str, detail: str) -> int:
    draw.rounded_rectangle((65, y, 94, y + 29), radius=9, fill="#7c2cff")
    draw.text((74, y + 2), "✓", font=font(18, True), fill="#ffffff")
    draw.text((112, y - 2), label, font=font(25, True), fill="#ffffff")
    return wrapped(draw, detail, (112, y + 34), 1040, 20, "#c8c2dc", spacing=5) + 17


def side_bullet(draw: ImageDraw.ImageDraw, y: int, label: str, detail: str) -> int:
    draw.rounded_rectangle((860, y, 887, y + 27), radius=8, fill="#7c2cff")
    draw.text((868, y + 1), "✓", font=font(17, True), fill="#ffffff")
    draw.text((902, y - 1), label, font=font(21, True), fill="#ffffff")
    return wrapped(draw, detail, (902, y + 31), 285, 16, "#c8c2dc", spacing=4) + 14


def save(image: Image.Image, index: int, slug: str) -> Path:
    SLIDES.mkdir(parents=True, exist_ok=True)
    path = SLIDES / f"{index:02d}-{slug}.png"
    image.save(path, optimize=True)
    return path


def make_slides() -> list[Path]:
    slides: list[Path] = []

    image, draw = canvas()
    draw.rounded_rectangle((64, 54, 430, 94), radius=20, fill="#241341", outline="#8257e5", width=2)
    draw.text((84, 64), "YOUCAM CLOTHES VTO V4", font=font(17, True), fill="#f1eaff")
    wrapped(draw, "FitFront", (64, 160), 1120, 78, "#ffffff", True, 8)
    wrapped(draw, "See the look before you cart it.", (68, 260), 1060, 39, "#cbb8ff", True, 8)
    wrapped(draw, "A privacy-first virtual fitting room tailored into a complete Openfront retail journey.", (68, 340), 1020, 27, "#d5d0e3", False, 10)
    draw.rounded_rectangle((68, 500, 1210, 620), radius=22, fill="#141025", outline="#3d2d67", width=2)
    draw.text((100, 530), "LIVE", font=font(18, True), fill="#79f0c6")
    draw.text((165, 526), "fitfront-youcam.vercel.app", font=font(28, True), fill="#ffffff")
    draw.text((100, 574), "Apparel Virtual Try-On · 2026 YouCam API Hackathon", font=font(21), fill="#b9b3ca")
    slides.append(save(image, 1, "title"))

    image, draw = canvas()
    heading(draw, "Tailored, not rebuilt", "A real storefront with VTO at the decision point")
    screenshot_card(image, SCREENSHOTS / "01-fitfront-storefront.png", (65, 170, 820, 650))
    y = 190
    y = side_bullet(draw, y, "Preserved", "Catalog, variants, cart, checkout, backend, and dashboard.")
    y = side_bullet(draw, y, "Added", "FitFront identity and upper-body Try it on actions.")
    side_bullet(draw, y, "Integrated", "Visualization leads directly to the existing cart.")
    slides.append(save(image, 2, "storefront"))

    image, draw = canvas()
    heading(draw, "Consent before processing", "The shopper understands where the image goes")
    screenshot_card(image, SCREENSHOTS / "02-fitfront-consent.png", (65, 170, 850, 650))
    y = 195
    y = side_bullet(draw, y, "Explicit consent", "Generation is disabled until the shopper agrees.")
    y = side_bullet(draw, y, "No FitFront storage", "Photos and generated results never enter the database.")
    side_bullet(draw, y, "Clear retention", "YouCam retention and two-hour result links are disclosed.")
    slides.append(save(image, 3, "privacy"))

    image, draw = canvas()
    heading(draw, "Real YouCam result", "Compare the look, then cart the variant")
    screenshot_card(image, SCREENSHOTS / "03-fitfront-result.png", (64, 160, 1215, 675))
    slides.append(save(image, 4, "result"))

    image, draw = canvas()
    heading(draw, "One protected server workflow", "The browser never sees credentials or arbitrary garment URLs")
    nodes = [
        (70, 290, 280, 430, "SHOPPER", "demo or JPG/PNG"),
        (365, 290, 595, 430, "FITFRONT", "consent + quota"),
        (680, 290, 925, 430, "YOUCAM V4", "upload · task · poll"),
        (1010, 290, 1210, 430, "CART", "selected variant"),
    ]
    for x1, y1, x2, y2, label, detail in nodes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=24, fill="#171128", outline="#6c43bc", width=3)
        draw.text((x1 + 24, y1 + 28), label, font=font(23, True), fill="#ffffff")
        wrapped(draw, detail, (x1 + 24, y1 + 72), x2 - x1 - 42, 18, "#c7bfdc")
    for x in (310, 625, 955):
        draw.line((x, 360, x + 35, 360), fill="#9d6cff", width=5)
        draw.polygon(((x + 35, 352), (x + 50, 360), (x + 35, 368)), fill="#9d6cff")
    wrapped(draw, "Trusted catalog reference · exact presigned headers · one task creation · five-second polling", (120, 510), 1080, 24, "#d8d1e8", True, 9)
    slides.append(save(image, 5, "architecture"))

    image, draw = canvas()
    heading(draw, "Built to stay free and safe", "Every generation is checked before YouCam spends units")
    y = 210
    y = bullet(draw, y, "Live unit guard", "Reads the current cloth-v4 cost and balance; fails closed if unknown.")
    y = bullet(draw, y, "100-unit reserve", "No billing, no paid credits, and no paid fallback are configured.")
    y = bullet(draw, y, "Three per session", "Anonymous users are limited to three new tasks per twenty-four hours.")
    bullet(draw, y, "Catalog-controlled", "Only supported tops and trusted product images can reach YouCam.")
    slides.append(save(image, 6, "safety"))

    image, draw = canvas()
    heading(draw, "Retail value", "Reduce visual uncertainty without pretending to measure fit")
    cards = [
        (70, 220, "DISCOVER", "Keep browsing the existing product catalog."),
        (360, 220, "VISUALIZE", "See an upper-body garment on a person."),
        (650, 220, "COMPARE", "Move the before/after control instantly."),
        (940, 220, "CART", "Choose the actual sellable variant."),
    ]
    for x, y, label, detail in cards:
        draw.rounded_rectangle((x, y, x + 250, y + 250), radius=24, fill="#151025", outline="#473170", width=2)
        draw.ellipse((x + 82, y + 28, x + 168, y + 114), fill="#7c2cff")
        draw.text((x + 31, y + 138), label, font=font(23, True), fill="#ffffff")
        wrapped(draw, detail, (x + 31, y + 180), 190, 18, "#c8c2dc")
    wrapped(draw, "AI visualization only — never presented as a sizing or physical-fit guarantee.", (150, 555), 1040, 25, "#ffd87b", True, 8)
    slides.append(save(image, 7, "impact"))

    image, draw = canvas()
    heading(draw, "Try FitFront now", "The bundled demo model makes the complete flow judge-ready")
    draw.rounded_rectangle((70, 220, 1210, 360), radius=26, fill="#171028", outline="#7548cb", width=3)
    draw.text((110, 255), "LIVE DEMO", font=font(19, True), fill="#83f1ce")
    draw.text((110, 296), "fitfront-youcam.vercel.app/us", font=font(37, True), fill="#ffffff")
    draw.rounded_rectangle((70, 400, 1210, 540), radius=26, fill="#171028", outline="#3c3158", width=2)
    draw.text((110, 435), "SOURCE", font=font(19, True), fill="#b78cff")
    draw.text((110, 476), "github.com/shobhit1kapoor/fitfront-youcam", font=font(30, True), fill="#ffffff")
    draw.text((70, 620), "FitFront · Apparel Virtual Try-On · Powered by YouCam Clothes VTO v4", font=font(22), fill="#bdb6cf")
    slides.append(save(image, 8, "links"))

    return slides


def build_video(slides: list[Path]) -> Path:
    import imageio_ffmpeg

    durations = [10, 17, 17, 20, 16, 16, 13, 17]
    concat = OUT / "slides.ffconcat"
    with concat.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("ffconcat version 1.0\n")
        for path, duration in zip(slides, durations):
            handle.write(f"file '{path.as_posix()}'\n")
            handle.write(f"duration {duration}\n")
        handle.write(f"file '{slides[-1].as_posix()}'\n")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    output = OUT / "fitfront-demo.mp4"
    audio = OUT / "narration.wav"
    command = [
        ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    ]
    if audio.exists():
        command += ["-i", str(audio), "-af", "apad=pad_dur=3"]
    command += [
        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-movflags", "+faststart",
    ]
    if audio.exists():
        command += ["-c:a", "aac", "-b:a", "128k"]
    command += ["-t", str(sum(durations)), str(output)]
    subprocess.run(command, check=True)
    return output


if __name__ == "__main__":
    paths = make_slides()
    result = build_video(paths)
    print(result)
