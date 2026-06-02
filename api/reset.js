const JSONBIN_KEY = '$2a$10$OYxEVve02oNpJtLc6AlEDeClX5rw0Yd2u6pfl5IdZ1DxjQCXRqF/q';
const MENSUAL_ID  = '69faeb4736566621a82ec956';
const HISTORICO_ID = '6a1e2a3ef5f4af5e29aaa779';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_KEY,
};

export default async function handler(req, res) {
  // Solo permitir GET (desde el cron de Vercel) o POST con clave secreta
  if (req.method === 'POST') {
    const { secret } = req.body || {};
    if (secret !== process.env.RESET_SECRET) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  }

  try {
    // 1. Leer el ranking mensual actual
    const mensualRes = await fetch(
      `https://api.jsonbin.io/v3/b/${MENSUAL_ID}/latest`,
      { headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' } }
    );
    if (!mensualRes.ok) throw new Error('Error leyendo bin mensual');
    const mensualData = await mensualRes.json();
    const entradas = Array.isArray(mensualData) ? mensualData : [];
    const validas = entradas.filter(e => e && typeof e.name === 'string' && typeof e.score === 'number' && e.score > 0);

    if (validas.length > 0) {
      // 2. Tomar el #1
      const campeon = validas[0];

      // 3. Leer el histórico actual
      const histRes = await fetch(
        `https://api.jsonbin.io/v3/b/${HISTORICO_ID}/latest`,
        { headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' } }
      );
      if (!histRes.ok) throw new Error('Error leyendo bin histórico');
      const histData = await histRes.json();
      const historico = Array.isArray(histData)
        ? histData.filter(e => e && e.name && e.score && !e.init)
        : [];

      // 4. Agregar el campeón con el mes/año
      const ahora = new Date();
      const mes = ahora.toLocaleString('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
      historico.push({ name: campeon.name, score: campeon.score, mes });

      // 5. Guardar histórico actualizado
      const putHistRes = await fetch(
        `https://api.jsonbin.io/v3/b/${HISTORICO_ID}`,
        { method: 'PUT', headers: HEADERS, body: JSON.stringify(historico) }
      );
      if (!putHistRes.ok) throw new Error('Error guardando histórico');
    }

    // 6. Limpiar el ranking mensual
    const putMensualRes = await fetch(
      `https://api.jsonbin.io/v3/b/${MENSUAL_ID}`,
      { method: 'PUT', headers: HEADERS, body: JSON.stringify([]) }
    );
    if (!putMensualRes.ok) throw new Error('Error limpiando bin mensual');

    return res.status(200).json({ ok: true, mensaje: 'Reset completado' });

  } catch (e) {
    console.error('Error en reset:', e);
    return res.status(500).json({ error: e.message });
  }
}
