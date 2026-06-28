/**
 * QUIOBA — paper_crumple transition
 *
 * Builds an FFmpeg command that composites:
 *   clip_a  ──►  paper tears from top (easeOutExpo)  ──►  clip_b
 *
 * Pure built-in FFmpeg filters: fps, scale, pad, setsar, split, asplit, trim, atrim,
 * setpts, asetpts, displace, tblend, gblur, curves, format, blend, alphamerge,
 * overlay, acrossfade, concat.  No plugins, no GLSL, no OpenGL.
 *
 * @example
 *   import { buildCmd } from './paper_crumple.js';
 *   const { args } = buildCmd({
 *     clip_a:           '/tmp/main.mp4',
 *     clip_b:           '/tmp/outro.mp4',
 *     transition_start: 9.0,
 *     output:           '/tmp/out.mp4',
 *   });
 *   spawnSync('ffmpeg', args, { stdio: 'inherit' });
 *
 * Inputs to FFmpeg:
 *   [0]  clip_a              (outgoing video)
 *   [1]  clip_b              (incoming video — outro screen etc.)
 *   [2]  alpha_sequence.mov  (pre-generated mask video, 33 frames @ 24 fps)
 *   [3]  paper_texture.png   (static, -loop 1)
 *   [4]  displacement_map.png(static, -loop 1)
 */

import { readFileSync }  from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CFG   = JSON.parse(readFileSync(join(__dir, 'config.json'), 'utf-8'));

/**
 * @typedef {Object} PaperCrumpleParams
 * @property {string}  clip_a            — path to outgoing video
 * @property {string}  clip_b            — path to incoming video (starts at t=0)
 * @property {number}  transition_start  — seconds into clip_a where transition begins
 * @property {number}  [duration=1.0]    — transition length in seconds
 * @property {number}  [fps=24]
 * @property {number}  [width=720]
 * @property {number}  [height=1280]
 * @property {string}  output            — output file path
 */

/**
 * Build the FFmpeg args array for the paper_crumple transition.
 * @param {PaperCrumpleParams} p
 * @returns {{ args: string[], filter_complex: string }}
 */
export function buildCmd(p) {
  const {
    clip_a,
    clip_b,
    transition_start,
    duration = CFG.duration_s,
    fps      = CFG.fps,
    width    = CFG.resolution.width,
    height   = CFG.resolution.height,
    output,
  } = p;

  const W = width;
  const H = height;
  const T = parseFloat(transition_start.toFixed(3));   // t_start
  const D = parseFloat(duration.toFixed(3));            // duration
  const E = parseFloat((T + D).toFixed(3));             // t_end

  const {
    displacement_x_max:    DX,
    displacement_y_max:    DY,
    motion_blur_opacity:   MB,
    paper_texture_opacity: PTO,
    shadow_offset_x:       SOX,
    shadow_offset_y:       SOY,
    shadow_blur_sigma:     SBS,
    shadow_curve_floor:    SCF,
  } = CFG.params;

  // Paths to pre-generated assets
  const A = {
    alpha : join(__dir, CFG.assets.alpha_sequence),
    ptex  : join(__dir, CFG.assets.paper_texture),
    disp  : join(__dir, CFG.assets.displacement_map),
  };

  // Scale + pad to exact output size, preserve SAR
  const scalePad =
    `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

  // ── Filter complex ──────────────────────────────────────────────────────────
  const fc = [

    // ── Normalise video inputs ─────────────────────────────────────────────
    // clip_a: two copies — pre-transition and transition window
    `[0:v]fps=${fps},${scalePad},format=yuv420p,split=2[va1][va2]`,

    // clip_b: two copies — transition background and post-transition
    `[1:v]fps=${fps},${scalePad},format=yuv420p,split=2[vb1][vb2]`,

    // Alpha mask sequence: trim to exactly <duration> seconds, then grayscale
    // 33-frame sequence @ 24 fps → 1.375 s; trimmed to D seconds
    // easeOutExpo ensures paper is ~99 % gone at frame 24 of 33 → clean cut
    `[2:v]fps=${fps},scale=${W}:${H},trim=duration=${D},setpts=PTS-STARTPTS,` +
    `format=gray,split=2[msk1][msk2]`,

    // Paper texture: static, loop=1, sized, RGBA
    `[3:v]scale=${W}:${H},format=rgba[ptex]`,

    // Displacement map: static, loop=1, sized, gray.
    // FFmpeg displace filter: pixel_value - 128 = offset in pixels (raw).
    // curves remaps full [0,255] range down to [128-DX, 128+DX] / [128-DY, 128+DY]
    // so the actual displacement stays within ±DX px and ±DY px respectively.
    `[4:v]scale=${W}:${H},format=gray,split=2[disp_raw_x][disp_raw_y]`,
    // curves uses normalized [0,1] coordinates, not [0,255]
    `[disp_raw_x]curves=master='0/${((128-DX)/255).toFixed(4)} 1/${((128+DX)/255).toFixed(4)}'[xd]`,
    `[disp_raw_y]curves=master='0/${((128-DY)/255).toFixed(4)} 1/${((128+DY)/255).toFixed(4)}'[yd]`,

    // ── Pre-transition segment: clip_a from 0 → T ─────────────────────────
    `[va1]trim=end=${T},setpts=PTS-STARTPTS[a_pre]`,

    // ── Transition window: clip_a from T for D seconds ────────────────────
    `[va2]trim=start=${T}:duration=${D},setpts=PTS-STARTPTS[a_trans]`,

    // Displacement (paper wrinkle): xd/yd already scaled to ±DX / ±DY px range
    `[a_trans][xd][yd]displace=edge=smear[a_disp]`,

    // Motion blur: blend each displaced frame with the previous one at MB opacity
    // Only active during displacement → natural during the crumple movement
    `[a_disp]tblend=all_mode=average:all_opacity=${MB}[a_blur]`,

    // Paper texture multiply: adds paper grain/warmth to the outgoing clip
    `[a_blur]format=rgba[a_rgba]`,
    `[a_rgba][ptex]blend=all_mode=multiply:all_opacity=${PTO}[a_tex]`,

    // ── Shadow under paper edge ────────────────────────────────────────────
    // Shift mask by (SOX, SOY) px → shadow falls below/right of paper edge
    `[msk1]pad=${W + SOX}:${H + SOY}:${SOX}:${SOY}:color=white[msk_pad]`,
    `[msk_pad]crop=${W}:${H}:0:0[msk_shift]`,
    // Blur the shifted mask → soft shadow falloff
    `[msk_shift]gblur=sigma=${SBS}[shad_soft]`,
    // Map shadow density to [SCF/255 … 1.0] range to avoid total black
    // (e.g., floor=200 → max darkening ~22 %)
    `[shad_soft]curves=master='0/${SCF} 255/255',format=rgba[shad_rgba]`,

    // ── Background during transition: first D seconds of clip_b ───────────
    `[vb1]trim=duration=${D},setpts=PTS-STARTPTS,format=rgba[b_rgba]`,

    // Apply shadow: multiply background by shadow map (darkens near paper edge)
    `[b_rgba][shad_rgba]blend=all_mode=multiply[b_shad]`,

    // ── Alpha composite: paper (a_tex) over shadowed background ───────────
    // alphamerge: msk2 white=opaque clip_a, black=transparent (show clip_b)
    `[a_tex][msk2]alphamerge[a_alpha]`,
    `[b_shad][a_alpha]overlay=0:0,format=yuv420p[composite]`,

    // ── Post-transition: clip_b from D seconds onward ─────────────────────
    `[vb2]trim=start=${D},setpts=PTS-STARTPTS[b_post]`,

    // ── Final video concat ─────────────────────────────────────────────────
    `[a_pre][composite][b_post]concat=n=3:v=1:a=0[vout]`,

    // ── Audio ──────────────────────────────────────────────────────────────
    // Split both audio streams before trimming (each referenced twice)
    `[0:a]asplit=2[aa0][aa1]`,
    `[1:a]asplit=2[ab0][ab1]`,

    // Pre-transition: clip_a audio up to T
    `[aa0]atrim=end=${T},asetpts=PTS-STARTPTS[aud_pre]`,

    // Transition crossfade: D-second window of both clips
    `[aa1]atrim=start=${T}:duration=${D},asetpts=PTS-STARTPTS[aud_a_x]`,
    `[ab0]atrim=duration=${D},asetpts=PTS-STARTPTS[aud_b_x]`,
    `[aud_a_x][aud_b_x]acrossfade=d=${D}[aud_xfade]`,

    // Post-transition: clip_b audio from D seconds onward
    `[ab1]atrim=start=${D},asetpts=PTS-STARTPTS[aud_post]`,

    // Concat audio
    `[aud_pre][aud_xfade][aud_post]concat=n=3:v=0:a=1[aout]`,

  ].join(';\n');

  // ── FFmpeg args ────────────────────────────────────────────────────────────
  const args = [
    '-y',
    // Input 0: clip_a
    '-i', clip_a,
    // Input 1: clip_b
    '-i', clip_b,
    // Input 2: alpha mask sequence (short video, read normally)
    '-i', A.alpha,
    // Input 3: paper texture (single PNG, looped)
    '-loop', '1', '-i', A.ptex,
    // Input 4: displacement map (single PNG, looped)
    '-loop', '1', '-i', A.disp,
    // Filter graph
    '-filter_complex', fc,
    '-map', '[vout]',
    '-map', '[aout]',
    // Output encoding
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
    '-c:a', 'aac',     '-b:a', '192k',
    // Enable progressive download (important for CF Workers streaming)
    '-movflags', '+faststart',
    output,
  ];

  return { args, filter_complex: fc };
}


/**
 * JSON API handler — for use in a Cloudflare Worker or Express server.
 *
 * POST /api/transitions/paper_crumple
 * Body: { clip_a, clip_b, transition_start, output, duration?, fps?, width?, height? }
 *
 * Returns: { args: string[], filter_complex: string }
 *
 * The caller is responsible for executing FFmpeg with the returned args.
 * In a CF Worker with WASM-FFmpeg: pass args to createFFmpeg().run(...args).
 * In a Node/Bun edge runtime: use spawnSync('ffmpeg', args).
 */
export async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let params;
  try { params = await request.json(); }
  catch { return new Response('Invalid JSON body', { status: 400 }); }

  for (const k of ['clip_a', 'clip_b', 'transition_start', 'output']) {
    if (params[k] == null) {
      return new Response(`Missing required field: ${k}`, { status: 400 });
    }
  }

  try {
    const result = buildCmd(params);
    return Response.json(result);
  } catch (err) {
    return new Response(`Build error: ${err.message}`, { status: 500 });
  }
}
