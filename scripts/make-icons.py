"""Erzeugt die App-Symbole (PNG) ohne Zusatzpakete: Teller auf terrakottafarbenem Grund.

Aufruf: python3 scripts/make-icons.py
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (196, 85, 45)
PLATE = (255, 255, 255)
RIM = (240, 226, 214)


def png(size: int, plate_radius: float) -> bytes:
    rows = []
    c = (size - 1) / 2
    r_out = size * plate_radius
    r_in = r_out * 0.72
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
            if d <= r_in:
                px = PLATE
            elif d <= r_out:
                px = RIM
            else:
                px = BG
            row += bytes(px)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


OUT.mkdir(parents=True, exist_ok=True)
for name, size, radius in [
    ("icon-192.png", 192, 0.36),
    ("icon-512.png", 512, 0.36),
    ("icon-maskable-512.png", 512, 0.28),
    ("apple-touch-icon.png", 180, 0.36),
    ("favicon.png", 64, 0.40),
]:
    (OUT / name).write_bytes(png(size, radius))
    print("geschrieben:", name)
