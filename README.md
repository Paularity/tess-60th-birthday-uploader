# Tess's 60th Birthday Uploader

A Next.js application for guests to upload photos and videos to Cloudflare R2 using presigned URLs.

## Features

- Guest upload interface with event code protection
- Multiple file upload support (images and videos)
- Direct upload to Cloudflare R2 using presigned URLs
- Files organized by date: `tess60/YYYY-MM-DD/<uuid>-<filename>`
- Mobile-friendly interface with upload progress tracking

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env.local` and fill in your Cloudflare R2 credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `R2_ACCOUNT_ID` - Your Cloudflare account ID
   - `R2_ACCESS_KEY_ID` - R2 access key ID
   - `R2_SECRET_ACCESS_KEY` - R2 secret access key
   - `R2_BUCKET` - Your R2 bucket name (e.g., `tess-60th-birthday`)
   - `UPLOAD_SECRET` - Secret code guests must enter to upload

3. **Configure R2 CORS:**
   
   In your Cloudflare R2 bucket settings, add CORS rules to allow uploads:
   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

- `src/lib/r2.ts` - S3Client configuration for Cloudflare R2
- `src/app/api/upload-url/route.ts` - API route to generate presigned URLs
- `app/page.tsx` - Frontend upload interface

## Deployment

Deploy to Vercel or any Node.js hosting platform. Make sure to set all environment variables in your hosting platform's configuration.

## Security

- R2 credentials are never exposed to the client
- Event code validation prevents unauthorized uploads
- Only image/* and video/* file types are accepted
- Presigned URLs expire after 60 seconds


