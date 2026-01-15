"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface FileUploadStatus {
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

function UploadForm() {
  const searchParams = useSearchParams();
  const [eventCode, setEventCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [eventCodeError, setEventCodeError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setEventCode(code);
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setGlobalError(null);

    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);

      // Validate file types
      const invalidFiles = selectedFiles.filter(
        (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/")
      );

      if (invalidFiles.length > 0) {
        setFileError(
          `Invalid file type(s): ${invalidFiles.map((f) => f.name).join(", ")}. Only images and videos are allowed.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validate file count
      if (selectedFiles.length > 50) {
        setFileError("Maximum 50 files can be uploaded at once");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFiles(selectedFiles);
      setUploadStatuses([]);
      setAllComplete(false);

      // Auto-upload immediately after selection
      setTimeout(() => {
        handleUpload(selectedFiles);
      }, 500);
    }
  };

  const handleUpload = async (filesToUpload?: File[]) => {
    const uploadFiles = filesToUpload || files;

    setGlobalError(null);
    setEventCodeError(null);
    setFileError(null);

    if (uploadFiles.length === 0) {
      setFileError("Please select your photos or videos to share");
      return;
    }
    if (!eventCode.trim()) {
      setEventCodeError("No event code provided. Please use URL: ?code=your_code");
      return;
    }

    setUploading(true);
    setAllComplete(false);

    let hasErrors = false;

    const statuses: FileUploadStatus[] = uploadFiles.map((file) => ({
      name: file.name,
      status: "pending",
    }));
    setUploadStatuses(statuses);

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];

      statuses[i].status = "uploading";
      setUploadStatuses([...statuses]);

      try {
        const response = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            eventCode: eventCode.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Server error" }));

          if (response.status === 401) {
            setEventCodeError("Invalid event code");
            throw new Error("Invalid event code");
          }

          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const { url } = await response.json();

        if (!url) {
          throw new Error("No upload URL received from server");
        }

        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => "");
          throw new Error(
            `Upload to R2 failed (${uploadResponse.status}): ${errorText || "Network error or CORS issue"
            }`
          );
        }

        statuses[i].status = "success";
      } catch (error) {
        hasErrors = true;
        statuses[i].status = "error";
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        statuses[i].error = errorMessage;

        // Stop on auth error
        if (error instanceof Error && error.message.includes("Invalid event code")) {
          setUploadStatuses([...statuses]);
          setUploading(false);
          return;
        }
      }

      setUploadStatuses([...statuses]);
    }

    setUploading(false);

    if (hasErrors) {
      const errorCount = statuses.filter((s) => s.status === "error").length;
      const successCount = statuses.filter((s) => s.status === "success").length;
      setGlobalError(
        `Upload completed with ${errorCount} error(s) and ${successCount} successful upload(s)`
      );
    } else {
      setAllComplete(true);
    }
  };

  const handleUploadMore = () => {
    setFiles([]);
    setUploadStatuses([]);
    setAllComplete(false);
    setGlobalError(null);
    setEventCodeError(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden py-6 sm:py-12 px-3 sm:px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black animate-gradient-shift"></div>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)', animation: 'float 6s ease-in-out infinite' }}></div>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.2 }}></div>
      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(251, 191, 36, 0.3) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
      `}</style>
      <div className="max-w-3xl mx-auto bg-gradient-to-b from-gray-950 via-black to-gray-950 border-2 sm:border-4 border-yellow-600 rounded-2xl sm:rounded-3xl shadow-2xl shadow-yellow-600/60 p-4 sm:p-6 md:p-10 animate-fade-in-up relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/5 via-transparent to-yellow-600/5 animate-shimmer"></div>
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 text-2xl sm:text-4xl animate-sparkle text-yellow-500" style={{ animationDelay: '0s' }}>✨</div>
        <div className="absolute top-8 right-8 sm:top-20 sm:right-20 text-xl sm:text-3xl animate-sparkle text-yellow-400" style={{ animationDelay: '0.5s' }}>⭐</div>
        <div className="absolute bottom-8 left-8 sm:bottom-20 sm:left-20 text-xl sm:text-3xl animate-sparkle text-yellow-500" style={{ animationDelay: '1s' }}>🌟</div>
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 text-2xl sm:text-4xl animate-sparkle text-yellow-400" style={{ animationDelay: '1.5s' }}>✨</div>
        <div className="text-center mb-6 sm:mb-10 relative z-10">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-yellow-100 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)] font-elegant mb-4 sm:mb-6">
            60th
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-calligraphy tracking-wide px-2">
            Tess&apos;s Birthday Celebration
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-yellow-100 font-semibold mb-2 sm:mb-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] px-2">
            Capture & Share Your Cherished Moments
          </p>
          <p className="text-base sm:text-lg text-yellow-200 mt-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] px-2">
            Celebrating six decades of joy, love, and unforgettable memories
          </p>
        </div>

        {!allComplete ? (
          <div className="space-y-6">
            {globalError && (
              <div className="p-3 sm:p-5 bg-red-950 border-2 border-red-500 rounded-xl flex items-start gap-2 sm:gap-3 animate-fade-in-up shadow-lg shadow-red-500/30">
                <span className="text-red-300 text-2xl sm:text-3xl animate-pulse">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-semibold text-red-100">
                    {globalError}
                  </p>
                </div>
              </div>
            )}

            {eventCodeError && (
              <div className="p-3 sm:p-5 bg-amber-950 border-2 border-amber-500 rounded-xl flex items-start gap-2 sm:gap-3 animate-fade-in-up shadow-lg shadow-amber-500/30">
                <span className="text-amber-300 text-2xl sm:text-3xl animate-pulse">🔐</span>
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-semibold text-amber-100">
                    {eventCodeError}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <input
                id="files"
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />

              {!uploading && uploadStatuses.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full bg-gradient-to-br from-amber-700/80 via-yellow-600/70 to-amber-700/80 hover:from-amber-600/90 hover:via-yellow-500/80 hover:to-amber-600/90 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-yellow-50 font-bold py-8 sm:py-10 md:py-12 px-4 sm:px-6 md:px-8 rounded-2xl sm:rounded-3xl transition-all duration-700 shadow-2xl shadow-amber-600/40 hover:shadow-amber-500/60 hover:scale-[1.02] sm:hover:scale-[1.03] active:scale-95 transform border-2 sm:border-4 border-amber-600/60 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-shimmer"></div>
                  <div className="flex flex-col items-center gap-3 sm:gap-4 relative z-10">
                    <span className="text-6xl sm:text-7xl md:text-8xl group-hover:scale-110 transition-transform duration-700 animate-float">📸</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] text-center px-2">Upload Your Memories</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-normal opacity-90 group-hover:opacity-100 transition-opacity duration-500 text-center px-2">Click to select photos & videos</span>
                    <span className="text-base sm:text-lg font-normal opacity-80 group-hover:opacity-95 mt-1 sm:mt-2 transition-opacity duration-500 text-center px-2">✨ Automatic upload after selection ✨</span>
                  </div>
                </button>
              ) : uploading ? (
                <div className="w-full bg-gradient-to-br from-amber-100 to-yellow-100 border-2 sm:border-4 border-amber-400 py-8 sm:py-10 md:py-12 px-4 sm:px-6 md:px-8 rounded-2xl sm:rounded-3xl shadow-2xl shadow-amber-500/50 animate-pulse">
                  <div className="flex flex-col items-center gap-4 sm:gap-5">
                    <span className="text-6xl sm:text-7xl md:text-8xl animate-spin" style={{ animationDuration: '3s' }}>✨</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-900 animate-pulse text-center">Uploading...</span>
                    <span className="text-lg sm:text-xl md:text-2xl text-amber-800 font-medium animate-fade-in-up text-center px-2">Your precious memories are being saved</span>
                  </div>
                </div>
              ) : null}

              {fileError && (
                <div className="p-4 sm:p-6 bg-red-100 border-2 border-red-500 rounded-xl shadow-xl shadow-red-400/30 animate-fade-in-up">
                  <p className="text-lg sm:text-xl font-semibold text-red-900 flex items-center justify-center gap-2 sm:gap-3 text-center">
                    <span className="text-2xl sm:text-3xl animate-pulse">❌</span> <span>{fileError}</span>
                  </p>
                </div>
              )}
            </div>

            {uploadStatuses.length > 0 && (
              <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3 animate-fade-in-up">
                <h3 className="text-2xl sm:text-3xl font-bold text-yellow-100 mb-3 sm:mb-4 flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <span className="animate-pulse">📸</span> Upload Progress:
                </h3>
                {uploadStatuses.map((status, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 sm:p-4 bg-white/90 rounded-lg sm:rounded-xl border-2 border-amber-400 shadow-lg hover:border-amber-500 hover:shadow-amber-400/30 transition-all duration-500 hover:scale-[1.02] animate-fade-in-up gap-2"
                    style={{ animationDelay: `${index * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}
                  >
                    <span className="text-sm sm:text-base font-medium text-amber-950 truncate flex-1 min-w-0">
                      {status.name}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${status.status === "success"
                        ? "bg-green-100 text-green-800 border border-green-400"
                        : status.status === "error"
                          ? "bg-red-100 text-red-800 border border-red-400"
                          : status.status === "uploading"
                            ? "bg-amber-200 text-amber-900 border border-amber-500"
                            : "bg-gray-200 text-gray-700 border border-gray-400"
                        }`}
                    >
                      {status.status === "success"
                        ? "✓ Success"
                        : status.status === "error"
                          ? `✗ ${status.error || "Error"}`
                          : status.status === "uploading"
                            ? "Uploading..."
                            : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-6 sm:space-y-8 py-6 sm:py-8 animate-fade-in-up">
            <div className="text-7xl sm:text-8xl md:text-9xl animate-bounce" style={{ animationDuration: '1.2s' }}>✨🎉✨</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-yellow-200 animate-pulse drop-shadow-[0_2px_8px_rgba(251,191,36,0.9)] px-2">
              Successfully Uploaded!
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-yellow-100 font-semibold px-4 animate-fade-in-up drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
              Thank you for contributing to Tess&apos;s 60th birthday celebration! 🎂
            </p>
            <div className="text-5xl sm:text-6xl animate-float">🌟🎂🌟</div>
            <button
              onClick={handleUploadMore}
              className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-amber-950 font-bold py-4 sm:py-5 md:py-6 px-8 sm:px-10 md:px-12 rounded-xl sm:rounded-2xl transition-all duration-700 shadow-2xl shadow-yellow-500/60 hover:shadow-yellow-400/90 hover:scale-[1.05] active:scale-95 transform border-2 border-yellow-300 group animate-fade-in-up" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}
            >
              <span className="flex items-center justify-center gap-2 sm:gap-3 text-lg sm:text-xl">
                <span className="text-2xl sm:text-3xl">➕</span> Upload More Memories
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-200 text-2xl animate-pulse">Loading...</div>
      </div>
    }>
      <UploadForm />
    </Suspense>
  );
}
