const MAX_INTENTOS = 8;
const TS_MIN = 90_000;
const TS_MAX = 1_200_000;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    const { episode } = req.query;
    if (!episode) return res.status(400).json({ error: 'Falta episode' });

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

            // Filtro 1: ignorar intro y créditos finales
            if (ts < TS_MIN || ts > TS_MAX) continue;

            // Filtro 2: ignorar frames sin diálogo
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

            if (textoVisible.length === 0) continue;

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
