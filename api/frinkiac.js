export default async function handler(req, res) {
    // Permitir CORS desde cualquier origen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { episode } = req.query;
    if (!episode) {
        return res.status(400).json({ error: 'Falta el parámetro episode' });
    }

    try {
        const response = await fetch(`https://frinkiac.com/api/random?e=${episode}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                'Referer': 'https://frinkiac.com/'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Frinkiac no respondió' });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
