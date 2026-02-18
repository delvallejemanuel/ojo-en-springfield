export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { episode } = req.query;
    if (!episode) return res.status(400).json({ error: 'Falta episode' });

    try {
        // 1. Obtener frame aleatorio del episodio
        const randomRes = await fetch(`https://frinkiac.com/api/random?e=${episode}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                'Referer': 'https://frinkiac.com/'
            }
        });
        if (!randomRes.ok) throw new Error(`Frinkiac random: ${randomRes.status}`);
        const randomData = await randomRes.json();

        const ep = randomData.Frame.Episode;
        const ts = randomData.Frame.Timestamp;

        // 2. Obtener caption/título del episodio
        const captionRes = await fetch(`https://frinkiac.com/api/caption?e=${ep}&t=${ts}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                'Referer': 'https://frinkiac.com/'
            }
        });

        let titulo_en = null;
        if (captionRes.ok) {
            const captionData = await captionRes.json();
            titulo_en = captionData?.Episode?.Title || null;
        }

        return res.status(200).json({
            Frame: randomData.Frame,
            titulo_en: titulo_en
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
