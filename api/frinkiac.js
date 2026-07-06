const MAX_INTENTOS = 20;
const TS_MIN = 80_000;
const TS_MAX = 1_300_000;
const FETCH_TIMEOUT_MS = 3500;

async function fetchConTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    const { episode, score } = req.query;
    if (!episode) return res.status(400).json({ error: 'Falta episode' });

    const pts = parseInt(score) || 0;
    const maxTemp = pts >= 150 ? 17 : pts >= 100 ? 15 : pts >= 50 ? 12 : 8;
    const minTexto = pts >= 150 ? 0 : pts >= 100 ? 5 : pts >= 50 ? 10 : 20;

    let frame = null;
    let titulo_en = null;
    const t0 = Date.now();
    let intentosUsados = 0;
    let motivoDescartes = { fetchFail: 0, tsFuera: 0, tempAlta: 0, textoCorto: 0, timeout: 0 };

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
        intentosUsados = intento + 1;
        try {
            const randomRes = await fetchConTimeout(`https://frinkiac.com/api/random?e=${episode}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                    'Referer': 'https://frinkiac.com/'
                }
            });
            if (!randomRes.ok) { motivoDescartes.fetchFail++; continue; }

            const randomData = await randomRes.json();
            const ts = randomData.Frame.Timestamp;
            if (ts < TS_MIN || ts > TS_MAX) { motivoDescartes.tsFuera++; continue; }

            const match = randomData.Frame.Episode.match(/^S(\d+)E/);
            if (!match) { motivoDescartes.fetchFail++; continue; }

            const numTemp = parseInt(match[1], 10);
            if (numTemp > maxTemp) { motivoDescartes.tempAlta++; continue; }

            const captionRes = await fetchConTimeout(`https://frinkiac.com/api/caption?e=${randomData.Frame.Episode}&t=${ts}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                    'Referer': 'https://frinkiac.com/'
                }
            });
            if (!captionRes.ok) { motivoDescartes.fetchFail++; continue; }

            const captionData = await captionRes.json();
            titulo_en = captionData?.Episode?.Title || null;
            const textoVisible = (captionData?.Subtitles || [])
                .map(s => s.Content || '')
                .join(' ')
                .replace(/♪/g, '')
                .trim();
            if (textoVisible.length < minTexto) { motivoDescartes.textoCorto++; continue; }

            frame = randomData.Frame;
            break;
        } catch (e) {
            if (e.name === 'AbortError') motivoDescartes.timeout++;
            else motivoDescartes.fetchFail++;
            continue;
        }
    }

    const tiempoTotalMs = Date.now() - t0;
    console.log(JSON.stringify({
        evento: 'frinkiac_busqueda',
        episode, score: pts, intentosUsados, tiempoTotalMs,
        exito: !!frame, motivoDescartes
    }));

    if (!frame) return res.status(500).json({ error: 'No se encontró un frame válido' });

    return res.status(200).json({
        Frame: frame,
        titulo_en: titulo_en
    });
}
