import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

function getR2Client() {
    if (cachedClient) {
        return cachedClient;
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error("Missing R2 credentials in environment variables");
    }

    cachedClient = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    return cachedClient;
}

export const r2Client = new Proxy({} as S3Client, {
    get(target, prop) {
        const client = getR2Client();
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    }
});

export function sanitizeFilename(filename: string): string {
    const maxLength = 120;
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return sanitized.slice(0, maxLength);
}
