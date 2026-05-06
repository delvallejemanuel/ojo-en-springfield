const MAX_INTENTOS = 25;
const TS_MIN = 85_000;
const TS_MAX = 1_250_000;

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

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
        try {
            const randomRes = await fetch(`https://frinkiac.com/api/random?e=${episode}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                    'Referer': 'https://frinkiac.com/'
                }
            });
            if (!randomRes.ok) continue;

            const randomData = await randomRes.json();
            const ts = randomData.Frame.Timestamp;

            if (ts < TS_MIN || ts > TS_MAX) continue;

            const match = randomData.Frame.Episode.match(/^S(\d+)E/);
            if (!match) continue;
            const numTemp = parseInt(match[1], 10);
            if (numTemp > maxTemp) continue;

            const captionRes = await fetch(`https://frinkiac.com/api/caption?e=${randomData.Frame.Episode}&t=${ts}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                    'Referer': 'https://frinkiac.com/'
                }
            });
            if (!captionRes.ok) continue;

            const captionData = await captionRes.json();
            titulo_en = captionData?.Episode?.Title || null;

            const textoVisible = (captionData?.Subtitles || [])
                .map(s => s.Content || '')
                .join(' ')
                .replace(/♪/g, '')
                .trim();

            if (textoVisible.length < minTexto) continue;

            frame = randomData.Frame;
            break;
        } catch (e) {
            continue;
        }
    }

    if (!frame) return res.status(500).json({ error: 'No se encontró un frame válido' });

    return res.status(200).json({
        Frame: frame,
        titulo_en: titulo_en
    });
}
