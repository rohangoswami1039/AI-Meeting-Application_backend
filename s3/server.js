const express = require('express');
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const port = process.env.PORT || 3000;

const s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: "AKIAXYN4QWK6E474E2FX",
        secretAccessKey: "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"
    },
});

async function getObjectURL(key) {
    const command = new GetObjectCommand({
        Bucket: 'audio-test77',
        Key: key,
    });
    const url = await getSignedUrl(s3Client, command);
    return url;
}

app.get('/get-object-url/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const url = await getObjectURL(key);
        res.json({ url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
