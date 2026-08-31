import { Client as MinioClient } from "minio";

// Configuration
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "192.168.112.6";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "31380", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "Password@123";
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "embeddings";

// Initialize Minio Client
export const minioClient = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

/**
 * Saves a buffer or stream directly to MinIO
 * @param {string} userId - Target user ID
 * @param {string} speakerName - e.g. "Doctor"
 * @param {number|string} sampleIndex - Sample number (1 to 10)
 * @param {Buffer} buffer - File or .npy buffer
 * @param {string} contentType - e.g. "application/x-numpy" or "audio/wav"
 */
export async function saveToMinIO(
  userId,
  speakerName = "Doctor",
  sampleIndex = 1,
  buffer,
  contentType = "application/x-numpy"
) {
  try {
    // 1. Ensure bucket exists
    const bucketExists = await minioClient
      .bucketExists(MINIO_BUCKET_NAME)
      .catch(() => false);
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET_NAME, "");
    }

    // 2. Object key pattern: embeddings/{user_id}/{speaker_name}/sample_{sample_index}.npy
    const objectKey = `embeddings/${userId}/${speakerName}/sample_${sampleIndex}.npy`;

    // 3. Upload object
    await minioClient.putObject(
      MINIO_BUCKET_NAME,
      objectKey,
      buffer,
      buffer.length,
      {
        "Content-Type": contentType,
        user_id: String(userId),
        speaker_name: String(speakerName),
        sample_index: String(sampleIndex),
      }
    );

    const objectUrl = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET_NAME}/${objectKey}`;
    return { success: true, objectKey, objectUrl };
  } catch (err) {
    console.error("MinIO Upload Error:", err);
    throw err;
  }
}
