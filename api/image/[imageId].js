function parseDataImageUrl(dataUrl) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return null;
    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], 'base64')
    };
}

function isAllowedProtocol(source) {
    try {
        const parsed = new URL(source);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
        return false;
    }
}

export default async function handler(req, res) {
    const srcParam = req.query.src;
    const source = Array.isArray(srcParam) ? srcParam[0] : srcParam;

    if (!source) {
        return res.status(400).json({ error: 'Missing src query parameter.' });
    }

    if (source.startsWith('data:image/')) {
        const parsedData = parseDataImageUrl(source);
        if (!parsedData) {
            return res.status(400).json({ error: 'Invalid data image URL.' });
        }

        res.setHeader('Content-Type', parsedData.mimeType);
        res.setHeader('Content-Length', parsedData.buffer.length.toString());
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(200).send(parsedData.buffer);
    }

    if (!isAllowedProtocol(source)) {
        return res.status(400).json({ error: 'Only http/https image URLs are allowed.' });
    }

    try {
        const upstream = await fetch(source);
        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: 'Unable to fetch source image.' });
        }

        const contentType = upstream.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
            return res.status(415).json({ error: 'Source URL is not an image.' });
        }

        const imageBuffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', contentType.split(';')[0]);
        res.setHeader('Content-Length', imageBuffer.length.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(imageBuffer);
    } catch (error) {
        return res.status(502).json({ error: 'Failed to proxy image source.' });
    }
}
