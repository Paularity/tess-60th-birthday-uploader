import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, sanitizeFilename } from "@/src/lib/r2";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

interface UploadUrlRequest {
    fileName: string;
    contentType: string;
    eventCode: string;
}

export async function POST(request: NextRequest) {
    try {
        let body: UploadUrlRequest;

        try {
            body = await request.json();
        } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { fileName, contentType, eventCode } = body;

        if (!fileName || !contentType || !eventCode) {
            return NextResponse.json(
                { error: "Missing required fields: fileName, contentType, eventCode" },
                { status: 400 }
            );
        }

        const uploadSecret = process.env.UPLOAD_SECRET;
        if (!uploadSecret) {
            console.error("UPLOAD_SECRET not configured");
            return NextResponse.json(
                { error: "Server configuration error: UPLOAD_SECRET not set" },
                { status: 500 }
            );
        }

        if (eventCode.trim() !== uploadSecret.trim()) {
            console.warn("Invalid event code attempt");
            return NextResponse.json(
                { error: "Invalid event code" },
                { status: 401 }
            );
        }

        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
            return NextResponse.json(
                { error: "Only image and video files are allowed" },
                { status: 400 }
            );
        }

        const bucket = process.env.R2_BUCKET;
        if (!bucket) {
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const now = new Date();
        const dateFolder = now.toISOString().split("T")[0];
        const uuid = randomUUID();
        const safeFileName = sanitizeFilename(fileName);
        const key = `tess60/${dateFolder}/${uuid}-${safeFileName}`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });

        let url: string;
        try {
            url = await getSignedUrl(r2Client, command, {
                expiresIn: 60,
            });
        } catch (signError) {
            console.error("Error generating signed URL:", signError);
            return NextResponse.json(
                { error: "Failed to generate upload URL. Check R2 credentials." },
                { status: 500 }
            );
        }

        if (!url) {
            console.error("Generated URL is empty");
            return NextResponse.json(
                { error: "Failed to generate valid upload URL" },
                { status: 500 }
            );
        }

        console.log(`Generated presigned URL for: ${key}`);
        return NextResponse.json({ url, key });
    } catch (error) {
        console.error("Unexpected error in upload-url route:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to generate upload URL: ${errorMessage}` },
            { status: 500 }
        );
    }
}
