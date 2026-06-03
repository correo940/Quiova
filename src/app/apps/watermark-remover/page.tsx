'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Upload, Undo2, Download, MousePointer2, Brush,
  AlertCircle, Video, Image as ImageIcon, ChevronLeft,
  Sparkles, Square, Wand2
} from 'lucide-react'
import Link from 'next/link'

interface Point { x: number; y: number }
interface StrokePoint { dx: number; dy: number; sx: number; sy: number }
interface Stroke { points: StrokePoint[]; bs: number; op: number; hd: number }

function fitToDisplay(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / w, maxH / h, 1)
  return { dw: Math.round(w * scale), dh: Math.round(h * scale) }
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, unit = '', onChange, color = '#818cf8'
}: {
  label: string; value: number; min: number; max: number
  unit?: string; onChange: (v: number) => void; color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: '#1e293b', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0
          }}
        />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WatermarkRemoverPage() {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef    = useRef<HTMLCanvasElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const rafRef        = useRef<number>(0)

  // Tool settings
  const [brushSize, setBrushSize] = useState(30)
  const [opacity,   setOpacity]   = useState(85)
  const [hardness,  setHardness]  = useState(70)

  // App state
  const [mediaType,    setMediaType]    = useState<'none' | 'image' | 'video'>('none')
  const [hasSource,    setHasSource]    = useState(false)
  const [canUndo,      setCanUndo]      = useState(false)
  const [isAlt,        setIsAlt]        = useState(false)
  const [status,       setStatus]       = useState('Sube una imagen o video para comenzar')
  const [videoTime,    setVideoTime]    = useState(0)
  const [videoDur,     setVideoDur]     = useState(0)
  const [isExporting,  setIsExporting]  = useState(false)
  const [displaySize,  setDisplaySize]  = useState({ dw: 800, dh: 450 })
  const [toolMode,     setToolMode]     = useState<'clone' | 'heal' | 'rect'>('heal')
  const [hasRect,      setHasRect]      = useState(false)

  // Mutable refs
  const sourceRef    = useRef<Point | null>(null)
  const offsetRef    = useRef<Point | null>(null)
  const firstPtRef   = useRef(true)
  const paintingRef  = useRef(false)
  const historyRef   = useRef<ImageData[]>([])
  const strokesRef   = useRef<Stroke[]>([])
  const curStrokeRef = useRef<StrokePoint[]>([])
  const bsRef        = useRef(30)
  const opRef        = useRef(85)
  const hdRef        = useRef(70)
  const isAltRef     = useRef(false)
  const toolModeRef  = useRef<'clone' | 'heal' | 'rect'>('heal')
  const rectStartRef = useRef<Point | null>(null)
  const rectEndRef   = useRef<Point | null>(null)
  const rectDrawing  = useRef(false)

  useEffect(() => { bsRef.current = brushSize      }, [brushSize])
  useEffect(() => { opRef.current = opacity        }, [opacity])
  useEffect(() => { hdRef.current = hardness       }, [hardness])
  useEffect(() => { toolModeRef.current = toolMode }, [toolMode])

  // ── Clone stamp core ────────────────────────────────────────────────────────
  const applyStamp = useCallback((
    ctx: CanvasRenderingContext2D,
    dx: number, dy: number, sx: number, sy: number,
    size: number, opa: number, hd: number
  ) => {
    const r  = size / 2
    const cw = ctx.canvas.width, ch = ctx.canvas.height

    const x0d = Math.max(0, Math.floor(dx - r)), y0d = Math.max(0, Math.floor(dy - r))
    const x1d = Math.min(cw, Math.ceil(dx + r)), y1d = Math.min(ch, Math.ceil(dy + r))
    const x0s = Math.max(0, Math.floor(sx - r)), y0s = Math.max(0, Math.floor(sy - r))
    const x1s = Math.min(cw, Math.ceil(sx + r)), y1s = Math.min(ch, Math.ceil(sy + r))

    const pw = Math.min(x1d - x0d, x1s - x0s)
    const ph = Math.min(y1d - y0d, y1s - y0s)
    if (pw <= 0 || ph <= 0) return

    const srcData = ctx.getImageData(x0s, y0s, pw, ph)
    const dstData = ctx.getImageData(x0d, y0d, pw, ph)
    const hardR   = hd / 100
    const alphaR  = opa / 100

    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const cx   = (x0d + px - dx) / r
        const cy   = (y0d + py - dy) / r
        const dist = Math.sqrt(cx * cx + cy * cy)
        if (dist > 1) continue

        let a: number
        if (dist <= hardR) {
          a = alphaR
        } else {
          const t = (dist - hardR) / (1 - hardR + 1e-6)
          a = alphaR * (1 - t * t)
        }

        const i = (py * pw + px) * 4
        dstData.data[i]   = (dstData.data[i]   + (srcData.data[i]   - dstData.data[i])   * a) | 0
        dstData.data[i+1] = (dstData.data[i+1] + (srcData.data[i+1] - dstData.data[i+1]) * a) | 0
        dstData.data[i+2] = (dstData.data[i+2] + (srcData.data[i+2] - dstData.data[i+2]) * a) | 0
      }
    }
    ctx.putImageData(dstData, x0d, y0d)
  }, [])

  // ── Healing brush — copies texture but adapts color to destination ──────────
  const applyHeal = useCallback((
    ctx: CanvasRenderingContext2D,
    dx: number, dy: number, sx: number, sy: number,
    size: number, opa: number, hd: number
  ) => {
    const r  = size / 2
    const cw = ctx.canvas.width, ch = ctx.canvas.height
    const x0d = Math.max(0, Math.floor(dx - r)), y0d = Math.max(0, Math.floor(dy - r))
    const x1d = Math.min(cw, Math.ceil(dx + r)), y1d = Math.min(ch, Math.ceil(dy + r))
    const x0s = Math.max(0, Math.floor(sx - r)), y0s = Math.max(0, Math.floor(sy - r))
    const x1s = Math.min(cw, Math.ceil(sx + r)), y1s = Math.min(ch, Math.ceil(sy + r))
    const pw  = Math.min(x1d - x0d, x1s - x0s), ph = Math.min(y1d - y0d, y1s - y0s)
    if (pw <= 0 || ph <= 0) return

    const srcData = ctx.getImageData(x0s, y0s, pw, ph)
    const dstData = ctx.getImageData(x0d, y0d, pw, ph)

    // Compute mean color of source and destination within the brush
    let sR=0,sG=0,sB=0, dR=0,dG=0,dB=0, cnt=0
    const hardR = hd / 100, alphaR = opa / 100
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const cx=(x0d+px-dx)/r, cy=(y0d+py-dy)/r
        if (Math.sqrt(cx*cx+cy*cy) > 1) continue
        const i=(py*pw+px)*4
        sR+=srcData.data[i]; sG+=srcData.data[i+1]; sB+=srcData.data[i+2]
        dR+=dstData.data[i]; dG+=dstData.data[i+1]; dB+=dstData.data[i+2]
        cnt++
      }
    }
    if (!cnt) return
    sR/=cnt; sG/=cnt; sB/=cnt; dR/=cnt; dG/=cnt; dB/=cnt

    // Apply: transfer texture from source but shift color toward destination
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const cx=(x0d+px-dx)/r, cy=(y0d+py-dy)/r
        const dist=Math.sqrt(cx*cx+cy*cy)
        if (dist > 1) continue
        const a = dist<=hardR ? alphaR : alphaR*(1-((dist-hardR)/(1-hardR+1e-6))**2)
        const i=(py*pw+px)*4
        // healed = src_texture + color_correction
        const hR=Math.max(0,Math.min(255,srcData.data[i]  -sR+dR))
        const hG=Math.max(0,Math.min(255,srcData.data[i+1]-sG+dG))
        const hB=Math.max(0,Math.min(255,srcData.data[i+2]-sB+dB))
        dstData.data[i]  =(dstData.data[i]  +(hR-dstData.data[i]  )*a)|0
        dstData.data[i+1]=(dstData.data[i+1]+(hG-dstData.data[i+1])*a)|0
        dstData.data[i+2]=(dstData.data[i+2]+(hB-dstData.data[i+2])*a)|0
      }
    }
    ctx.putImageData(dstData, x0d, y0d)
  }, [])

  // ── Inpaint rectangle — fill from surrounding pixels (priority-diffusion) ───
  const inpaintRect = useCallback((canvas: HTMLCanvasElement, rx: number, ry: number, rw: number, rh: number) => {
    const CW=canvas.width, CH=canvas.height
    rx=Math.max(0,Math.round(rx)); ry=Math.max(0,Math.round(ry))
    rw=Math.min(CW-rx,Math.round(rw)); rh=Math.min(CH-ry,Math.round(rh))
    if (rw<=0||rh<=0) return

    const ctx=canvas.getContext('2d')!
    const imgData=ctx.getImageData(0,0,CW,CH)
    const d=new Float32Array(imgData.data)
    const mask=new Uint8Array(CW*CH)

    for (let py=ry; py<ry+rh; py++)
      for (let px=rx; px<rx+rw; px++)
        mask[py*CW+px]=1

    const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]

    // Multiple passes until all mask pixels are filled
    let remaining = rw * rh
    for (let pass=0; pass<rw*rh*3 && remaining>0; pass++) {
      let filled=false
      for (let py=ry; py<ry+rh; py++) {
        for (let px=rx; px<rx+rw; px++) {
          if (!mask[py*CW+px]) continue
          let r=0,g=0,b=0,cnt=0
          for (const [dx,dy] of dirs) {
            const nx=px+dx, ny=py+dy
            if (nx<0||nx>=CW||ny<0||ny>=CH||mask[ny*CW+nx]) continue
            const i=(ny*CW+nx)*4
            r+=d[i]; g+=d[i+1]; b+=d[i+2]; cnt++
          }
          if (cnt>=2) {
            const i=(py*CW+px)*4
            d[i]=r/cnt; d[i+1]=g/cnt; d[i+2]=b/cnt
            mask[py*CW+px]=0; remaining--; filled=true
          }
        }
      }
      if (!filled) {
        // Lower bar to 1 neighbor
        for (let py=ry; py<ry+rh; py++) {
          for (let px=rx; px<rx+rw; px++) {
            if (!mask[py*CW+px]) continue
            let r=0,g=0,b=0,cnt=0
            for (const [dx,dy] of dirs) {
              const nx=px+dx, ny=py+dy
              if (nx<0||nx>=CW||ny<0||ny>=CH||mask[ny*CW+nx]) continue
              const i=(ny*CW+nx)*4; r+=d[i]; g+=d[i+1]; b+=d[i+2]; cnt++
            }
            if (cnt>0) {
              const i=(py*CW+px)*4
              d[i]=r/cnt; d[i+1]=g/cnt; d[i+2]=b/cnt
              mask[py*CW+px]=0; remaining--; filled=true
            }
          }
        }
      }
      if (!filled) break
    }

    for (let i=0;i<d.length;i++) imgData.data[i]=Math.round(d[i])
    ctx.putImageData(imgData,0,0)
  }, [])

  const replayStrokes = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const s of strokesRef.current)
      for (const p of s.points)
        applyStamp(ctx, p.dx, p.dy, p.sx, p.sy, s.bs, s.op, s.hd)
  }, [applyStamp])

  // ── Coordinate mapping ──────────────────────────────────────────────────────
  const toCanvasXY = useCallback((e: React.MouseEvent): Point => {
    const canvas = mainCanvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * canvas.width  / rect.width,
      y: (e.clientY - rect.top)  * canvas.height / rect.height
    }
  }, [])

  // ── Overlay cursor ──────────────────────────────────────────────────────────
  const drawOverlay = useCallback((mx: number, my: number) => {
    const ov = overlayRef.current
    if (!ov) return
    const ctx = ov.getContext('2d')!
    ctx.clearRect(0, 0, ov.width, ov.height)

    const scale = ov.width / (ov.getBoundingClientRect().width || ov.width)
    const lw    = Math.max(1, 1.5 * scale)
    const mode  = toolModeRef.current

    if (mode === 'rect') {
      // Rect mode: show crosshair cursor
      const cs = 10 * scale
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(mx - cs, my); ctx.lineTo(mx + cs, my)
      ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my + cs)
      ctx.stroke()
      // Draw rect while dragging
      if (rectDrawing.current && rectStartRef.current) {
        const rs = rectStartRef.current
        const rw = mx - rs.x, rh = my - rs.y
        ctx.save()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = lw
        ctx.setLineDash([6 * scale, 3 * scale])
        ctx.strokeRect(rs.x, rs.y, rw, rh)
        ctx.fillStyle = 'rgba(245,158,11,0.08)'
        ctx.fillRect(rs.x, rs.y, rw, rh)
        ctx.restore()
      } else if (rectStartRef.current && rectEndRef.current) {
        // Show confirmed rect
        const rs = rectStartRef.current, re = rectEndRef.current
        ctx.save()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = lw
        ctx.setLineDash([6 * scale, 3 * scale])
        ctx.strokeRect(rs.x, rs.y, re.x - rs.x, re.y - rs.y)
        ctx.restore()
      }
      return
    }

    const r = bsRef.current / 2

    // Brush ring
    ctx.beginPath()
    ctx.arc(mx, my, r, 0, Math.PI * 2)
    ctx.strokeStyle = isAltRef.current ? '#f87171' : mode === 'heal' ? '#a78bfa' : 'rgba(255,255,255,0.85)'
    ctx.lineWidth   = lw
    ctx.stroke()

    // Center cross
    const cs = Math.min(r * 0.45, 7 * scale)
    ctx.beginPath()
    ctx.moveTo(mx - cs, my); ctx.lineTo(mx + cs, my)
    ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my + cs)
    ctx.stroke()

    const src = sourceRef.current
    if (!src) return

    let svx = src.x, svy = src.y
    if (paintingRef.current && offsetRef.current) {
      svx = mx + offsetRef.current.x
      svy = my + offsetRef.current.y
    }

    // Source ring (dashed teal)
    ctx.save()
    ctx.beginPath()
    ctx.arc(svx, svy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#34d399'
    ctx.setLineDash([5 * scale, 3 * scale])
    ctx.lineWidth   = lw
    ctx.stroke()
    ctx.restore()

    // Source crosshair
    const ss = 10 * scale
    ctx.strokeStyle = '#34d399'
    ctx.lineWidth   = lw
    ctx.beginPath()
    ctx.moveTo(svx - ss, svy); ctx.lineTo(svx + ss, svy)
    ctx.moveTo(svx, svy - ss); ctx.lineTo(svx, svy + ss)
    ctx.stroke()
  }, [])

  // ── History ─────────────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    const c = mainCanvasRef.current; if (!c) return
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
    historyRef.current.push(data)
    if (historyRef.current.length > 20) historyRef.current.shift()
    setCanUndo(true)
  }, [])

  const handleUndo = useCallback(() => {
    const c = mainCanvasRef.current
    if (!c || historyRef.current.length === 0) return
    c.getContext('2d')!.putImageData(historyRef.current.pop()!, 0, 0)
    strokesRef.current.pop()
    setCanUndo(historyRef.current.length > 0)
  }, [])

  // ── Setup canvas size ───────────────────────────────────────────────────────
  const setupCanvases = useCallback((w: number, h: number) => {
    const mc = mainCanvasRef.current!
    const ov = overlayRef.current!
    mc.width = w; mc.height = h
    ov.width = w; ov.height = h

    const container = containerRef.current
    const maxW = container ? container.clientWidth  - 40 : window.innerWidth  - 320
    const maxH = container ? container.clientHeight - 40 : window.innerHeight - 80
    setDisplaySize(fitToDisplay(w, h, maxW, maxH))

    historyRef.current   = []
    strokesRef.current   = []
    sourceRef.current    = null
    offsetRef.current    = null
    setHasSource(false)
    setCanUndo(false)
  }, [])

  // ── Load image ──────────────────────────────────────────────────────────────
  const loadImage = useCallback((file: File) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      setupCanvases(img.width, img.height)
      mainCanvasRef.current!.getContext('2d')!.drawImage(img, 0, 0)
      setMediaType('image')
      setStatus(`${img.width} × ${img.height}px — Alt+clic para fijar origen`)
    }
    img.src = url
  }, [setupCanvases])

  // ── Load video ──────────────────────────────────────────────────────────────
  const loadVideo = useCallback((file: File) => {
    const video = videoRef.current!
    const url   = URL.createObjectURL(file)
    video.src   = url

    video.onloadedmetadata = () => {
      setVideoDur(video.duration)
      setupCanvases(video.videoWidth, video.videoHeight)
    }

    video.onseeked = () => {
      const ctx = mainCanvasRef.current!.getContext('2d')!
      ctx.drawImage(video, 0, 0, mainCanvasRef.current!.width, mainCanvasRef.current!.height)
      replayStrokes(ctx)
      setVideoTime(video.currentTime)
    }

    video.onloadeddata = () => {
      video.currentTime = 0
      setMediaType('video')
      setStatus(`${video.videoWidth} × ${video.videoHeight}px — Navega los fotogramas y aplica el tampón`)
    }
  }, [setupCanvases, replayStrokes])

  // ── File input ──────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.type.startsWith('image/'))      loadImage(file)
    else if (file.type.startsWith('video/')) loadVideo(file)
    e.target.value = ''
  }, [loadImage, loadVideo])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]; if (!file) return
    if (file.type.startsWith('image/'))      loadImage(file)
    else if (file.type.startsWith('video/')) loadVideo(file)
  }, [loadImage, loadVideo])

  // ── Apply inpaint for the current rect selection ────────────────────────────
  const handleInpaintRect = useCallback(() => {
    const rs = rectStartRef.current, re = rectEndRef.current
    const canvas = mainCanvasRef.current
    if (!rs || !re || !canvas) return
    saveHistory()
    const rx = Math.min(rs.x, re.x), ry = Math.min(rs.y, re.y)
    const rw = Math.abs(re.x - rs.x),  rh = Math.abs(re.y - rs.y)
    if (rw < 4 || rh < 4) return
    inpaintRect(canvas, rx, ry, rw, rh)
    rectStartRef.current = null; rectEndRef.current = null
    setHasRect(false)
    // Clear overlay
    const ov = overlayRef.current
    if (ov) ov.getContext('2d')!.clearRect(0, 0, ov.width, ov.height)
    setStatus('Relleno aplicado — Ctrl+Z para deshacer')
  }, [saveHistory, inpaintRect])

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pt   = toCanvasXY(e)
    const mode = toolModeRef.current

    if (mode === 'rect') {
      rectStartRef.current = pt
      rectEndRef.current   = null
      rectDrawing.current  = true
      setHasRect(false)
      return
    }

    if (e.altKey) {
      sourceRef.current  = pt
      offsetRef.current  = null
      firstPtRef.current = true
      setHasSource(true)
      drawOverlay(pt.x, pt.y)
      setStatus('Origen fijado — clic y arrastra para sanar')
      return
    }

    if (!sourceRef.current) {
      setStatus('⚠ Alt+clic primero para fijar el punto de origen')
      return
    }

    saveHistory()
    paintingRef.current  = true
    firstPtRef.current   = true
    curStrokeRef.current = []
  }, [toCanvasXY, drawOverlay, saveHistory])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt   = toCanvasXY(e)
    const mode = toolModeRef.current

    if (mode === 'rect') {
      if (rectDrawing.current) rectEndRef.current = pt
      drawOverlay(pt.x, pt.y)
      return
    }

    drawOverlay(pt.x, pt.y)
    if (!paintingRef.current || !sourceRef.current) return

    if (firstPtRef.current) {
      offsetRef.current  = { x: sourceRef.current.x - pt.x, y: sourceRef.current.y - pt.y }
      firstPtRef.current = false
    }

    const off = offsetRef.current!
    const sx  = pt.x + off.x, sy = pt.y + off.y
    const ctx = mainCanvasRef.current!.getContext('2d')!

    if (mode === 'heal') {
      applyHeal(ctx, pt.x, pt.y, sx, sy, bsRef.current, opRef.current, hdRef.current)
    } else {
      applyStamp(ctx, pt.x, pt.y, sx, sy, bsRef.current, opRef.current, hdRef.current)
    }
    curStrokeRef.current.push({ dx: pt.x, dy: pt.y, sx, sy })
  }, [toCanvasXY, drawOverlay, applyStamp, applyHeal])

  const commitStroke = useCallback(() => {
    if (toolModeRef.current === 'rect') {
      if (rectDrawing.current && rectStartRef.current && rectEndRef.current) {
        rectDrawing.current = false
        setHasRect(true)
      } else {
        rectDrawing.current = false
      }
      return
    }
    if (paintingRef.current && curStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...curStrokeRef.current],
        bs: bsRef.current, op: opRef.current, hd: hdRef.current
      })
    }
    paintingRef.current  = false
    curStrokeRef.current = []
  }, [])

  const handleMouseUp    = useCallback(() => commitStroke(), [commitStroke])
  const handleMouseLeave = useCallback(() => {
    if (toolModeRef.current !== 'rect') {
      const ov = overlayRef.current
      if (ov) ov.getContext('2d')!.clearRect(0, 0, ov.width, ov.height)
    }
    commitStroke()
  }, [commitStroke])

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Alt') { isAltRef.current = true; setIsAlt(true) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo() }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') { isAltRef.current = false; setIsAlt(false) }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [handleUndo])

  // ── Download image ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const c = mainCanvasRef.current; if (!c) return
    const a = document.createElement('a')
    a.href     = c.toDataURL('image/png')
    a.download = 'sin-marca-de-agua.png'
    a.click()
  }, [])

  // ── Export video ────────────────────────────────────────────────────────────
  const handleExportVideo = useCallback(async () => {
    const video  = videoRef.current
    const canvas = mainCanvasRef.current
    if (!video || !canvas) return

    setIsExporting(true)
    setStatus('Exportando video...')

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    const stream   = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: Blob[] = []

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'sin-marca-de-agua.webm'; a.click()
      URL.revokeObjectURL(url)
      setIsExporting(false)
      setStatus('¡Video exportado correctamente!')
    }

    const ctx = canvas.getContext('2d')!

    const renderLoop = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      replayStrokes(ctx)
      if (!video.ended && !video.paused) {
        rafRef.current = requestAnimationFrame(renderLoop)
      } else {
        recorder.stop()
      }
    }

    video.onended = () => { cancelAnimationFrame(rafRef.current); recorder.stop() }

    recorder.start()
    video.currentTime = 0
    video.play().then(() => { rafRef.current = requestAnimationFrame(renderLoop) })
  }, [replayStrokes])

  const handleVideoScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current; if (!video) return
    video.currentTime = parseFloat(e.target.value)
  }, [])

  // ── Apply strokes to all video frames ───────────────────────────────────────
  const handleApplyAll = useCallback(() => {
    setStatus('Las ediciones se aplican automáticamente a todos los fotogramas al exportar')
    setTimeout(() => setStatus(`Fotograma ${videoTime.toFixed(2)}s — ediciones activas en toda la exportación`), 2000)
  }, [videoTime])

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const sidebarW = 260

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden',
      background: '#0f172a', color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW, height: '100%',
        background: '#1e293b', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
          <Link href="/apps" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 12, marginBottom: 12 }}>
            <ChevronLeft size={14} /> Volver a Apps
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Brush size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Clone Stamp</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Eliminar marcas de agua</div>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
          <label
            htmlFor="wm-file-input"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '10px 0',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: 8, color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', boxSizing: 'border-box'
            }}
          >
            <Upload size={14} /> Subir archivo
          </label>
          <p style={{ fontSize: 10, color: '#475569', textAlign: 'center', margin: '8px 0 0' }}>
            Imágenes (PNG, JPG, WEBP) · Videos (MP4, WEBM, MOV)
          </p>
          <input
            id="wm-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Tool selector */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Herramienta
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { id: 'heal',  icon: Sparkles, label: 'Pincel Sanador',    desc: 'Fusión natural adaptando color', color: '#a78bfa' },
              { id: 'clone', icon: Brush,    label: 'Tampón de Clonar',  desc: 'Copia exacta del área origen',   color: '#6366f1' },
              { id: 'rect',  icon: Square,   label: 'Selección + Relleno', desc: 'Dibuja un rect. y auto-rellena', color: '#f59e0b' },
            ] as const).map(({ id, icon: Icon, label, desc, color }) => (
              <button key={id} onClick={() => setToolMode(id)} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7,
                border: `1px solid ${toolMode === id ? color : '#334155'}`,
                background: toolMode === id ? `${color}18` : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%'
              }}>
                <Icon size={14} color={toolMode === id ? color : '#64748b'} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: toolMode === id ? color : '#cbd5e1' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Inpaint action button — only shown when rect is drawn */}
          {toolMode === 'rect' && hasRect && (
            <button onClick={handleInpaintRect} style={{
              marginTop: 8, width: '100%', padding: '9px 0',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              border: 'none', borderRadius: 7, color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <Wand2 size={14} /> Rellenar selección
            </button>
          )}
          {toolMode === 'rect' && !hasRect && (
            <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#475569', textAlign: 'center' }}>
              Arrastra sobre la marca de agua para seleccionarla
            </p>
          )}
        </div>

        {/* Tool settings */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            {toolMode === 'rect' ? 'Información' : 'Ajustes del pincel'}
          </div>
          {toolMode === 'rect' ? (
            <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              1. Arrastra para seleccionar la marca<br/>
              2. Haz clic en <strong style={{ color: '#f59e0b' }}>Rellenar selección</strong><br/>
              3. La zona se rellena con los píxeles vecinos automáticamente
            </p>
          ) : (
            <>
              <Slider label="Tamaño" value={brushSize} min={5} max={200} unit="px" onChange={setBrushSize} color="#6366f1" />
              <Slider label="Opacidad" value={opacity}   min={1} max={100} unit="%" onChange={setOpacity}   color="#8b5cf6" />
              <Slider label="Dureza"   value={hardness}  min={0} max={100} unit="%" onChange={setHardness}  color="#06b6d4" />
            </>
          )}
        </div>

        {/* Brush preview */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Vista previa
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80, background: '#0f172a', borderRadius: 8 }}>
            <div style={{
              borderRadius: '50%',
              width: Math.min(brushSize * 0.4, 70),
              height: Math.min(brushSize * 0.4, 70),
              border: '2px solid rgba(99,102,241,0.9)',
              opacity: opacity / 100,
              background: `radial-gradient(circle, rgba(99,102,241,${opacity/100}) ${hardness}%, rgba(99,102,241,0) 100%)`,
              transition: 'all 0.1s'
            }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleUndo} disabled={!canUndo}
            style={{
              padding: '9px 0', borderRadius: 7, border: '1px solid #334155',
              background: canUndo ? '#1e293b' : '#0f172a',
              color: canUndo ? '#e2e8f0' : '#475569',
              fontSize: 13, fontWeight: 500, cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Undo2 size={14} /> Deshacer <span style={{ fontSize: 10, color: '#64748b' }}>Ctrl+Z</span>
          </button>

          {mediaType === 'image' && (
            <button
              onClick={handleDownload} disabled={mediaType !== 'image'}
              style={{
                padding: '9px 0', borderRadius: 7, border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <Download size={14} /> Descargar PNG
            </button>
          )}

          {mediaType === 'video' && (
            <>
              <button
                onClick={handleApplyAll}
                style={{
                  padding: '9px 0', borderRadius: 7, border: '1px solid #334155',
                  background: '#1e293b', color: '#e2e8f0',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                ✓ Aplicar a todos los fotogramas
              </button>
              <button
                onClick={handleExportVideo} disabled={isExporting}
                style={{
                  padding: '9px 0', borderRadius: 7, border: 'none',
                  background: isExporting ? '#374151' : 'linear-gradient(135deg, #059669, #047857)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                {isExporting ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Exportando...</>
                ) : (
                  <><Download size={14} /> Exportar video</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div style={{ padding: '14px 16px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Cómo usar
          </div>
          {[
            { icon: '1', color: '#6366f1', text: 'Sube la imagen o video que quieres editar' },
            { icon: '2', color: '#8b5cf6', text: 'Alt+clic en una zona limpia para fijar el origen del clon' },
            { icon: '3', color: '#06b6d4', text: 'Clic y arrastra sobre la marca de agua para pintarla con los píxeles del origen' },
            { icon: '4', color: '#10b981', text: 'Ajusta tamaño, opacidad y dureza para una fusión natural' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: step.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0, marginTop: 1
              }}>
                {step.icon}
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>{step.text}</p>
            </div>
          ))}

          <div style={{ marginTop: 14, padding: '10px 12px', background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertCircle size={12} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                El indicador <span style={{ color: '#34d399' }}>verde</span> sigue el punto de origen mientras pistas. Mantén presionado Alt para refijar el origen en cualquier momento.
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid #334155',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: mediaType === 'none' ? '#475569' : hasSource ? '#10b981' : '#f59e0b',
            boxShadow: mediaType !== 'none' ? `0 0 6px ${hasSource ? '#10b981' : '#f59e0b'}` : 'none'
          }} />
          <div style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
            {isAlt
              ? <span style={{ color: '#f87171' }}>Alt → clic para fijar origen</span>
              : hasSource
                ? <span style={{ color: '#34d399' }}>Origen fijado — listo para clonar</span>
                : status.substring(0, 60)}
          </div>
        </div>
      </aside>

      {/* ── Canvas area ── */}
      <main
        ref={containerRef}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          background: 'radial-gradient(ellipse at 50% 50%, #1e293b 0%, #0f172a 70%)'
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Drop zone — shown when no media loaded */}
        {mediaType === 'none' && (
          <label
            htmlFor="wm-file-input"
            style={{
              width: 400, height: 280, border: '2px dashed #334155',
              borderRadius: 16, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
              cursor: 'pointer', transition: 'border-color 0.2s',
              background: '#1e293b22'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Upload size={28} color="#6366f1" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Arrastra o haz clic para subir</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>Imágenes: PNG, JPG, WEBP, GIF · Videos: MP4, WEBM, MOV</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[ImageIcon, Video].map((Icon, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, background: '#334155',
                  fontSize: 11, color: '#94a3b8'
                }}>
                  <Icon size={12} /> {i === 0 ? 'Imagen' : 'Video'}
                </div>
              ))}
            </div>
          </label>
        )}

        {/* Canvas wrapper — always in DOM so refs are available; hidden until media loads */}
        <div style={{ display: mediaType === 'none' ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Status bar */}
            <div style={{
              padding: '5px 14px', borderRadius: 20,
              background: '#1e293b', border: '1px solid #334155',
              fontSize: 11.5, color: '#94a3b8',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              {mediaType === 'image' ? <ImageIcon size={11} /> : <Video size={11} />}
              <span>{status}</span>
              {hasSource && <span style={{ color: '#34d399' }}>● Origen fijado</span>}
            </div>

            {/* Canvas stack — always rendered */}
            <div style={{
              position: 'relative',
              width: displaySize.dw, height: displaySize.dh,
              borderRadius: 4, overflow: 'hidden',
              boxShadow: '0 0 0 1px #334155, 0 20px 60px rgba(0,0,0,0.6)'
            }}>
              <canvas
                ref={mainCanvasRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
              <canvas
                ref={overlayRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onContextMenu={e => e.preventDefault()}
              />
            </div>

            {/* Video controls */}
            {mediaType === 'video' && (
              <div style={{
                width: displaySize.dw, padding: '10px 14px',
                background: '#1e293b', borderRadius: 8,
                border: '1px solid #334155',
                display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                  <span>Fotograma: {videoTime.toFixed(2)}s</span>
                  <span>Duración: {videoDur.toFixed(2)}s</span>
                </div>
                <div style={{ position: 'relative', height: 4, background: '#0f172a', borderRadius: 2 }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${videoDur > 0 ? (videoTime / videoDur) * 100 : 0}%`,
                    background: '#6366f1', borderRadius: 2
                  }} />
                  <input
                    type="range" min={0} max={videoDur} step={1/30} value={videoTime}
                    onChange={handleVideoScrub}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: 10.5, color: '#475569', textAlign: 'center' }}>
                  Navega al fotograma con la marca de agua y aplica el tampón de clonar. Las ediciones se aplican a todos los fotogramas al exportar.
                </p>
              </div>
            )}
          </div>

        {/* Keyboard shortcut hints */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          display: 'flex', gap: 8
        }}>
          {[
            { key: 'Alt+clic', label: 'Fijar origen' },
            { key: 'Clic+arrastrar', label: 'Clonar' },
            { key: 'Ctrl+Z', label: 'Deshacer' },
          ].map(({ key, label }) => (
            <div key={key} style={{
              padding: '4px 8px', borderRadius: 5,
              background: '#1e293b', border: '1px solid #334155',
              fontSize: 10, color: '#64748b',
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <kbd style={{ background: '#0f172a', padding: '1px 5px', borderRadius: 3, color: '#94a3b8', fontSize: 10 }}>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Hidden video element */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  )
}
