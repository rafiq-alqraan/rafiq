"""خادم التسميع لتطبيق ربيع القرآن (يعمل على Modal).

Runs the same Quran recitation model the app already uses on the phone
(mostafanewir70/quran-recitation-ctc-onnx, wav2vec2 CTC), but at full precision
and without the ~240 MB download. It only returns the model's per-frame scores
(logits); the app keeps doing the word-by-word alignment itself, exactly as it
does on the phone today.

API
  GET  /health          -> {"ok": true, "vocab": V}
  GET  /vocab           -> the model's vocab.json
  POST /ctc?skip=N      body: raw 16 kHz mono PCM, float32 little-endian (or int16 with header X-Format: s16)
                        -> body: float32 logits [frames-N, V], headers X-Frames, X-Vocab

Cost guards: CPU only, at most MAX_CONTAINERS containers, the container shuts down
after IDLE_SECONDS without requests, and a request may carry at most MAX_SECONDS of sound.
"""
import json
import os
import re
import shutil
import time
import urllib.parse
import uuid

import modal

MODEL = "mostafanewir70/quran-recitation-ctc-onnx"
MODEL_DIR = "/model"
ONNX_CANDIDATES = ["model.onnx", "model_fp16.onnx", "model_quantized.onnx", "model_q4.onnx"]

SR = 16000
MAX_SECONDS = 20
MAX_CONTAINERS = 2
IDLE_SECONDS = 120

# recordings kept only for people who turned on "help improve the checker" in the app
VOICES = modal.Volume.from_name("rafiq-voices", create_if_missing=True)
VOICES_DIR = "/voices"
MAX_SAVE_BYTES = 6 * 1024 * 1024
SAVE_TYPES = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a"}

ALLOWED_ORIGINS = [
    "https://rafiq-alqraan.github.io",
    "https://raw.githack.com",
    "https://rawcdn.githack.com",
]


def download_model():
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL, local_dir=MODEL_DIR, allow_patterns=["*.json", "onnx/model.onnx*", "onnx/model_*.onnx*"])


image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("onnxruntime>=1.20", "numpy<2.3", "fastapi[standard]", "huggingface_hub")
    .run_function(download_model)
)

app = modal.App("rafiq-recite", image=image)


def pick_onnx(model_dir=MODEL_DIR):
    for name in ONNX_CANDIDATES:
        p = os.path.join(model_dir, "onnx", name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError("no onnx model found in " + model_dir)


def prepare(raw: bytes, normalize: bool, fmt: str = "f32"):
    """bytes of PCM (float32, or int16 when fmt == "s16") -> model input [1, n] float32."""
    import numpy as np

    if fmt == "s16":
        a = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    else:
        a = np.frombuffer(raw, dtype="<f4").astype(np.float32)
    if normalize:
        a = (a - a.mean()) / np.sqrt(a.var() + 1e-7)
    return a[None, :]


def run_ctc(sess, x, skip: int):
    """Run the model and drop the first `skip` frames (context the app already scored)."""
    import numpy as np

    name = sess.get_inputs()[0].name
    logits = sess.run(None, {name: x})[0][0]  # [frames, V]
    skip = max(0, min(int(skip), logits.shape[0]))
    return np.ascontiguousarray(logits[skip:], dtype="<f4")


@app.function(cpu=4.0, memory=2048, scaledown_window=IDLE_SECONDS, max_containers=MAX_CONTAINERS, timeout=60, volumes={VOICES_DIR: VOICES})
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    import onnxruntime as ort
    from fastapi import FastAPI, HTTPException, Request, Response
    from fastapi.middleware.cors import CORSMiddleware

    with open(os.path.join(MODEL_DIR, "preprocessor_config.json")) as f:
        normalize = bool(json.load(f).get("do_normalize", True))
    with open(os.path.join(MODEL_DIR, "vocab.json")) as f:
        vocab = json.load(f)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    sess = ort.InferenceSession(pick_onnx(), opts, providers=["CPUExecutionProvider"])

    api = FastAPI()
    api.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Format", "X-Meta"],
        expose_headers=["X-Frames", "X-Vocab", "X-Ms"],
        max_age=86400,
    )

    def check_origin(req: Request):
        o = req.headers.get("origin")
        if o and o not in ALLOWED_ORIGINS:
            raise HTTPException(403, "origin not allowed")

    @api.get("/health")
    def health():
        return {"ok": True, "vocab": len(vocab)}

    @api.get("/vocab")
    def get_vocab():
        return vocab

    @api.post("/ctc")
    async def ctc(req: Request, skip: int = 0):
        import time

        check_origin(req)
        raw = await req.body()
        fmt = "s16" if req.headers.get("x-format") == "s16" else "f32"
        width = 2 if fmt == "s16" else 4
        if not raw or len(raw) % width:
            raise HTTPException(400, "body must be float32 or int16 PCM")
        if len(raw) > SR * MAX_SECONDS * width:
            raise HTTPException(413, f"at most {MAX_SECONDS} s of sound per request")
        t0 = time.perf_counter()
        out = run_ctc(sess, prepare(raw, normalize, fmt), skip)
        ms = round((time.perf_counter() - t0) * 1000)
        return Response(
            out.tobytes(),
            media_type="application/octet-stream",
            headers={"X-Frames": str(out.shape[0]), "X-Vocab": str(out.shape[1] if out.ndim == 2 else 0), "X-Ms": str(ms)},
        )

    def voice_id(v: str):
        if not v or not re.fullmatch(r"[a-f0-9]{16,32}", v):
            raise HTTPException(400, "bad id")
        return v

    @api.post("/save")
    async def save(req: Request, v: str = ""):
        """keep one recitation, only sent by people who agreed; no name or account, just a random id"""
        check_origin(req)
        v = voice_id(v)
        ext = SAVE_TYPES.get((req.headers.get("content-type") or "").split(";")[0].strip())
        if not ext:
            raise HTTPException(415, "audio only")
        raw = await req.body()
        if not raw or len(raw) > MAX_SAVE_BYTES:
            raise HTTPException(413, "too big")
        try:
            meta = json.loads(urllib.parse.unquote(req.headers.get("x-meta") or "{}"))
            meta = {k: meta[k] for k in ("key", "from", "ver", "sec", "words") if k in meta}
        except Exception:
            meta = {}
        meta["at"] = int(time.time())
        d = os.path.join(VOICES_DIR, v)
        os.makedirs(d, exist_ok=True)
        name = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:8]
        with open(os.path.join(d, name + "." + ext), "wb") as f:
            f.write(raw)
        with open(os.path.join(d, name + ".json"), "w") as f:
            json.dump(meta, f, ensure_ascii=False)
        VOICES.commit()
        return {"ok": True}

    @api.post("/forget")
    async def forget(req: Request, v: str = ""):
        """delete every recording kept for this id (the person turned the option off)"""
        check_origin(req)
        v = voice_id(v)
        VOICES.reload()
        shutil.rmtree(os.path.join(VOICES_DIR, v), ignore_errors=True)
        VOICES.commit()
        return {"ok": True}

    return api
