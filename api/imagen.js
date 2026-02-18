export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { episode, timestamp } = req.query;
    if (!episode || !timestamp) return res.status(400).end();

    try {
        const response = await fetch(`https://frinkiac.com/img/${episode}/${timestamp}.jpg`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EyeOnSpringfield/1.0)',
                'Referer': 'https://frinkiac.com/'
            }
        });
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).end();
    }
}
