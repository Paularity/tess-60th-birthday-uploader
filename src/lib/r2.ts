import { S3Client } from "@aws-sdk/client-s3";

function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error("Missing R2 credentials in environment variables");
    }

    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

export const r2Client = getR2Client();

export function sanitizeFilename(filename: string): string {
    const maxLength = 120;
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return sanitized.slice(0, maxLength);
}
