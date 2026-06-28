#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QUIOBA paper_crumple — asset generator
Generates: paper_texture.png, displacement_map.png, normal_map.png,
           paper_noise.png, 33 alpha masks, and alpha_sequence.mov.

Run once before deploying. Requires: Pillow, numpy.
  pip install Pillow numpy
"""
import math, os, subprocess
import numpy as np
from PIL import Image

ROOT   = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "assets")
MASKS  = os.path.join(ASSETS, "masks")
os.makedirs(MASKS, exist_ok=True)

W, H      = 720, 1280
N_MASKS   = 33


# ── Easing ────────────────────────────────────────────────────────────────────

def ease_out_expo(t: float) -> float:
    """Fast start, decelerates exponentially. t ∈ [0,1] → [0,1]."""
    if t <= 0.0: return 0.0
    if t >= 1.0: return 1.0
    return 1.0 - pow(2.0, -10.0 * t)


# ── 2-D noise via sum-of-sines (no scipy dependency) ─────────────────────────

def _noise2d(h, w, scale, octaves, seed):
    rng = np.random.default_rng(seed)
    arr = np.zeros((h, w), dtype=np.float32)
    amp, freq, total = 1.0, scale, 0.0
    xs = np.linspace(0.0, 2 * math.pi, w, dtype=np.float32)
    ys = np.linspace(0.0, 2 * math.pi, h, dtype=np.float32)
    xx, yy = np.meshgrid(xs, ys)
    for _ in range(octaves):
        px, py = rng.uniform(0, 100), rng.uniform(0, 100)
        arr += np.sin(xx * freq + px) * np.cos(yy * freq + py) * amp
        total += amp
        amp  *= 0.55
        freq *= 1.97
    return arr / total  # [-1, 1]


# ── 1. Paper texture ──────────────────────────────────────────────────────────

def gen_paper_texture():
    base  = np.full((H, W, 3), 245, dtype=np.float32)
    grain = _noise2d(H, W, scale=40, octaves=3, seed=1)
    base -= ((grain + 1) * 0.5 * 20)[..., None]
    fibers = _noise2d(H, W, scale=0.9, octaves=2, seed=7)
    base[fibers > 0.62] -= 10
    base[..., 2] -= 9                          # warm tint (reduce blue)
    arr = np.clip(base, 200, 255).astype(np.uint8)
    Image.fromarray(arr, 'RGB').save(os.path.join(ASSETS, "paper_texture.png"))
    print("OK paper_texture.png")


# ── 2. Displacement map ───────────────────────────────────────────────────────

def gen_displacement_map():
    d  = _noise2d(H, W, scale=2.5, octaves=3, seed=13)
    d2 = _noise2d(H, W, scale=8.0, octaves=2, seed=17)
    d  = d * 0.70 + d2 * 0.30
    # Normalize to exact [-1, 1] so the full [0,255] range is used.
    # The filter_complex scales this to ±DX / ±DY pixels via curves.
    peak = max(abs(float(d.max())), abs(float(d.min())), 1e-6)
    d /= peak
    arr = ((d + 1.0) * 0.5 * 255.0).clip(0, 255).astype(np.uint8)
    Image.fromarray(arr, 'L').save(os.path.join(ASSETS, "displacement_map.png"))
    print("OK displacement_map.png")


# ── 3. Normal map (derived from displacement) ─────────────────────────────────

def gen_normal_map():
    d = np.array(Image.open(os.path.join(ASSETS, "displacement_map.png")),
                 dtype=np.float32)
    k = 3.5
    dx = (np.roll(d, -1, axis=1) - np.roll(d, 1, axis=1)) * k / 255.0
    dy = (np.roll(d, -1, axis=0) - np.roll(d, 1, axis=0)) * k / 255.0
    nz = np.ones_like(dx)
    mag = np.sqrt(dx**2 + dy**2 + nz**2)
    r = ((-dx / mag + 1) * 0.5 * 255).clip(0, 255).astype(np.uint8)
    g = ((-dy / mag + 1) * 0.5 * 255).clip(0, 255).astype(np.uint8)
    b = ((nz  / mag + 1) * 0.5 * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(np.stack([r, g, b], axis=2), 'RGB').save(
        os.path.join(ASSETS, "normal_map.png"))
    print("OK normal_map.png")


# ── 4. Paper noise (high-freq grain for edge detail) ─────────────────────────

def gen_paper_noise():
    n = _noise2d(H, W, scale=20, octaves=2, seed=99)
    arr = ((n + 1) * 0.5 * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(arr, 'L').save(os.path.join(ASSETS, "paper_noise.png"))
    print("OK paper_noise.png")


# ── 5. Alpha masks ────────────────────────────────────────────────────────────
#
# mask pixel WHITE (255) = paper still there → clip_a visible (alphamerge opaque)
# mask pixel BLACK (  0) = paper torn away  → clip_b visible (alphamerge transparent)
#
# Tear direction: top → bottom.  Boundary = multi-octave sine columns.
# An "island" of early tear appears at x ∈ [15%, 28%] for visual irregularity.
# easeOutExpo: fast initial tear, lingers on the last shreds.

def gen_alpha_masks():
    xn = np.linspace(0.0, 1.0, W, dtype=np.float32)   # (W,)
    yi = np.arange(H, dtype=np.float32)                 # (H,)

    # Per-column boundary noise (constant across all frames)
    n1 = np.sin(xn * (2*math.pi) * 2.1 + 0.50) * (H * 0.14)
    n2 = np.sin(xn * (2*math.pi) * 7.3 + 1.20) * (H * 0.06)
    n3 = np.sin(xn * (2*math.pi) * 19.7 + 2.80) * (H * 0.025)
    n4 = np.sin(xn * (2*math.pi) * 43.1 + 4.10) * (H * 0.010)
    col_noise = n1 + n2 + n3 + n4   # shape (W,)

    # Island column range
    ix0, ix1 = int(W * 0.15), int(W * 0.28)

    for f in range(N_MASKS):
        t        = f / (N_MASKS - 1)
        progress = ease_out_expo(t)

        # Island: leads the tear by ~0.08 * H, but only activates after delay
        island_factor = max(0.0, progress * 2.0 - 0.30)
        island = np.zeros(W, dtype=np.float32)
        island[ix0:ix1] = H * 0.08 * island_factor

        # Base tear Y: sweeps from -5% to 115% of H → always clears fully
        tear_base = progress * H * 1.15 - H * 0.05

        # Per-column tear Y
        tear_y = tear_base + col_noise + island   # (W,)

        # Vectorised mask: white where y >= tear_y (paper still there)
        mask = (yi[:, None] >= tear_y[None, :]).astype(np.uint8) * 255

        Image.fromarray(mask, 'L').save(
            os.path.join(MASKS, f"alpha_{f:03d}.png"))

    print(f"OK {N_MASKS} alpha masks  ->  {MASKS}/")


# ── 6. Bundle masks into alpha_sequence.mov (lossless, ProRes 4444) ───────────

def bundle_alpha_sequence():
    seq_in  = os.path.join(MASKS,  "alpha_%03d.png")
    seq_out = os.path.join(ASSETS, "alpha_sequence.mov")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", "24",
        "-i", seq_in,
        "-vf", "format=gray",
        "-c:v", "prores_ks", "-profile:v", "4444",
        seq_out,
    ]
    subprocess.run(cmd, check=True)
    print(f"OK alpha_sequence.mov  ({N_MASKS} frames @ 24 fps)")


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    gen_paper_texture()
    gen_displacement_map()
    gen_normal_map()
    gen_paper_noise()
    gen_alpha_masks()
    bundle_alpha_sequence()
    print("\nAll assets ready.")
