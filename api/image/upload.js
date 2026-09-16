import { put } from '@vercel/blob';

const MAX_UPLOAD_BYTES = 3.2 * 1024 * 1024;
const DEFAULT_UPLOAD_SECRET = 'night-9f2a1c';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const expectedSecret = process.env.UPLOAD_SECRET || DEFAULT_UPLOAD_SECRET;
    if (req.headers['x-upload-secret'] !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'Blob storage is not configured on the server. Connect Vercel Blob to this project.' });
    }

    const { filename, contentType, dataBase64 } = req.body || {};

    if (!filename || !contentType || !dataBase64) {
        return res.status(400).json({ error: 'Missing filename, contentType or dataBase64.' });
    }

    if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image uploads are allowed.' });
    }

    let buffer;
    try {
        buffer = Buffer.from(dataBase64, 'base64');
    } catch (e) {
        return res.status(400).json({ error: 'Invalid file data.' });
    }

    if (!buffer.length) {
        return res.status(400).json({ error: 'Empty file.' });
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
        return res.status(413).json({ error: 'File too large. Maximum ~3MB per upload.' });
    }

    try {
        const blob = await put(`images/${filename}`, buffer, {
            access: 'public',
            contentType,
            addRandomSuffix: true
        });

        return res.status(200).json({ url: blob.url });
    } catch (error) {
        return res.status(502).json({ error: 'Failed to store image.' });
    }
}
