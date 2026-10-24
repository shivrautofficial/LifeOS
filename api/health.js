/**
 * Vercel Serverless Function — Health & Telemetry Endpoint
 * Returns API status, platform metadata, and timestamp.
 */
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    service: 'LifeOS API',
    platform: 'Vercel',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
