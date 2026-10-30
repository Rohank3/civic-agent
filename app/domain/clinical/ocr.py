import subprocess
import tempfile
from pathlib import Path


def tesseract_page(raw: bytes, number: int) -> str:
    """Rasterize a single page with Poppler, then recognize text with local Tesseract."""
    with tempfile.TemporaryDirectory() as directory:
        pdf = Path(directory) / "chart.pdf"
        pdf.write_bytes(raw)
        prefix = str(Path(directory) / "page")
        subprocess.run(["pdftoppm", "-f", str(number), "-l", str(number), "-singlefile",
                        "-r", "200", "-png", str(pdf), prefix], check=True, capture_output=True, timeout=60)
        output = subprocess.run(["tesseract", prefix + ".png", "stdout"], check=True,
                                capture_output=True, timeout=60)
        text = output.stdout.decode().strip()
        if not text:
            raise ValueError("OCR produced no evidence")
        return text
