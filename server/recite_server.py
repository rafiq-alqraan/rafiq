"""خادم التسميع لتطبيق ربيع القرآن (يعمل على Modal).

Runs the same Quran recitation model the app already uses on the phone
(mostafanewir70/quran-recitation-ctc-onnx, wav2vec2 CTC), but at full precision
and without the ~240 MB download. It only returns the model's per-frame scores
(logits); the app keeps doing the word-by-word alignment itself, exactly as it
does on the phone today.

API
  GET  /health          -> {"ok": true, "vocab": V}
  GET  /vocab           -> the model's vocab.json
  POST /ctc?skip=N      body: raw 16 kHz mono float32 little-endian PCM
                        -> body: float32 logits [frames-N, V], headers X-Frames, X-Vocab

Cost guards: CPU only, at most MAX_CONTAINERS containers, the container shuts down
after IDLE_SECONDS without requests, and a request may carry at most MAX_SECONDS of sound.
"""
import json
import os

import modal

MODEL = "mostafanewir70/quran-recitation-ctc-onnx"
MODEL_DIR = "/model"
ONNX_CANDIDATES = ["model.onnx", "model_fp16.onnx", "model_quantized.onnx", "model_q4.onnx"]

SR = 16000
MAX_SECONDS = 20
MAX_CONTAINERS = 2
IDLE_SECONDS = 120

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


def prepare(raw: bytes, normalize: bool):
    """bytes of float32 PCM -> model input [1, n] float32."""
    import numpy as np

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


@app.function(cpu=2.0, memory=2048, scaledown_window=IDLE_SECONDS, max_containers=MAX_CONTAINERS, timeout=60)
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
    opts.intra_op_num_threads = 2
    sess = ort.InferenceSession(pick_onnx(), opts, providers=["CPUExecutionProvider"])

    api = FastAPI()
    api.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
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
        if not raw or len(raw) % 4:
            raise HTTPException(400, "body must be float32 PCM")
        if len(raw) > SR * MAX_SECONDS * 4:
            raise HTTPException(413, f"at most {MAX_SECONDS} s of sound per request")
        t0 = time.perf_counter()
        out = run_ctc(sess, prepare(raw, normalize), skip)
        ms = round((time.perf_counter() - t0) * 1000)
        return Response(
            out.tobytes(),
            media_type="application/octet-stream",
            headers={"X-Frames": str(out.shape[0]), "X-Vocab": str(out.shape[1] if out.ndim == 2 else 0), "X-Ms": str(ms)},
        )

    return api
