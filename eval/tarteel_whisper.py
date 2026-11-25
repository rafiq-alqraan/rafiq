"""Run Tarteel's open model (tarteel-ai/whisper-base-ar-quran) on the same test as the app's checker:
8 everyayah reciters x Al-Fatiha 2-7 + Al-Ikhlas, sped up x1/1.5/2/2.5 (same WSOLA as the in-browser test),
and 9 probes where one word of the text is deliberately wrong. Scoring: the transcript is aligned to the
expected words; a word is accepted when a transcript word matches it closely (letters only)."""
import io, json, re, sys, time, urllib.request
import numpy as np, librosa, torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration

AYAT = {2:[1,2,"ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ"],3:[1,3,"ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"],4:[1,4,"مَٰلِكِ يَوۡمِ ٱلدِّينِ"],5:[1,5,"إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ"],6:[1,6,"ٱهۡدِنَا ٱلصِّرَٰطَ ٱلۡمُسۡتَقِيمَ"],7:[1,7,"صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ ٱلۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا ٱلضَّآلِّينَ"],6222:[112,1,"قُلۡ هُوَ ٱللَّهُ أَحَدٌ"],6223:[112,2,"ٱللَّهُ ٱلصَّمَدُ"],6224:[112,3,"لَمۡ يَلِدۡ وَلَمۡ يُولَدۡ"],6225:[112,4,"وَلَمۡ يَكُن لَّهُۥ كُفُوًا أَحَدُۢ"]}
WRONG = {2:[3,'ٱلنَّاسِ'],4:[2,'ٱلۡقِيَٰمَةِ'],5:[1,'نَسۡأَلُ'],6:[2,'ٱلۡمُبِينَ'],7:[3,'عَلَيۡنَا'],6222:[3,'وَاحِدٌ'],6223:[1,'ٱلۡحَيُّ'],6224:[1,'يَلِجۡ'],6225:[3,'مِثۡلًا']}
RECS = ['Husary_128kbps','Saood_ash-Shuraym_128kbps','Abdurrahmaan_As-Sudais_192kbps','Salah_Al_Budair_128kbps','Yasser_Ad-Dussary_128kbps','Abdullah_Matroud_128kbps','Nasser_Alqatami_128kbps','Maher_AlMuaiqly_64kbps']
SPEEDS = [1, 1.5, 2, 2.5]

def norm(w):
    w = w.replace('ٰ', 'ا')  # dagger alef -> alef
    w = re.sub('[ٱأإآ]', 'ا', w).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    w = re.sub('[^ء-ي]', '', w)
    return w.replace('اا', 'ا')

def sim(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b).ratio()

def matched(expected, heard, th=0.75):
    """global alignment of expected words to heard words; returns which expected words found a close match"""
    E = [norm(x) for x in expected]; H = [norm(x) for x in heard if norm(x)]
    n, m = len(E), len(H)
    S = np.zeros((n + 1, m + 1)); B = np.zeros((n + 1, m + 1), int)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = sim(E[i-1], H[j-1]); d = S[i-1, j-1] + (s if s >= th else -0.5)
            opts = [d, S[i-1, j], S[i, j-1]]; k = int(np.argmax(opts)); S[i, j] = opts[k]; B[i, j] = k
    ok = [False] * n; i, j = n, m
    while i > 0 and j > 0:
        k = B[i, j]
        if k == 0:
            ok[i-1] = sim(E[i-1], H[j-1]) >= th; i -= 1; j -= 1
        elif k == 1: i -= 1
        else: j -= 1
    return ok

def wsola(x, rate):  # same algorithm as the browser test
    N, H, tol = 480, 240, 160
    out = np.zeros(int(np.ceil(len(x) / rate)) + N, np.float32); win = (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N) / N)).astype(np.float32)
    prev = 0; o = 0; k = 0
    while o + N < len(out):
        ia = round(o * rate)
        if ia + N + tol >= len(x): break
        best = ia
        if k > 0:
            ref = x[prev + H: prev + H + H:2]; lo = max(0, ia - tol)
            cands = np.arange(lo, ia + tol + 1, 2)
            seg = np.stack([x[c:c + H:2] for c in cands]); best = int(cands[np.argmax(seg @ ref)])
        out[o:o + N] += x[best:best + N] * win; prev = best; o += H; k += 1
    return out

def main():
    proc = WhisperProcessor.from_pretrained('tarteel-ai/whisper-base-ar-quran')
    model = WhisperForConditionalGeneration.from_pretrained('tarteel-ai/whisper-base-ar-quran').eval()
    torch.set_num_threads(4)
    R = {s: dict(ok=0, tot=0, caught=0, wrong=0, ms=0, n=0) for s in SPEEDS}; samples = []
    for r in RECS:
        for aid, (su, ay, text) in AYAT.items():
            url = f'https://everyayah.com/data/{r}/{su:03d}{ay:03d}.mp3'
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'eval'}), timeout=60).read()
            pcm, _ = librosa.load(io.BytesIO(raw), sr=16000, mono=True)
            for sp in SPEEDS:
                x = pcm if sp == 1 else wsola(pcm.astype(np.float32), sp)
                t0 = time.perf_counter()
                feats = proc(x, sampling_rate=16000, return_tensors='pt').input_features
                with torch.no_grad():
                    ids = model.generate(feats, max_new_tokens=128)
                hyp = proc.batch_decode(ids, skip_special_tokens=True)[0]
                R[sp]['ms'] += (time.perf_counter() - t0) * 1000; R[sp]['n'] += 1
                words = text.split(); heard = hyp.split()
                ok = matched(words, heard); R[sp]['ok'] += sum(ok); R[sp]['tot'] += len(words)
                if aid in WRONG:
                    wi, ww = WRONG[aid]; alt = list(words); alt[wi] = ww
                    R[sp]['wrong'] += 1; R[sp]['caught'] += 0 if matched(alt, heard)[wi] else 1
                if len(samples) < 12 or not all(ok): samples.append(f'{r.split("_")[0]} {su}:{ay} x{sp}: {hyp}')
            print(r, aid, flush=True)
    print('RESULT_JSON ' + json.dumps({str(k): v for k, v in R.items()}))
    for s in SPEEDS:
        v = R[s]; print(f'x{s}: correct accepted {100*v["ok"]/v["tot"]:.1f}%  wrong caught {100*v["caught"]/v["wrong"]:.1f}%  avg {v["ms"]/v["n"]:.0f} ms/ayah')
    print('SAMPLES'); print('\n'.join(samples[:80]))

if __name__ == '__main__':
    main()
