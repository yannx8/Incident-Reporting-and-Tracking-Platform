import { S3Client, S3ClientConfig, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

/**
 * S3-compatible ObjectStorage wrapper providing binary file management,
 * upload commands, signed download URLs, and deletion handlers.
 */
export class ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: StorageConfig) {
    const clientConfig: S3ClientConfig = {
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? !!config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };
    if (config.endpoint !== undefined) {
      clientConfig.endpoint = config.endpoint;
    }
    this.client = new S3Client(clientConfig);
    this.bucket = config.bucket;
  }

  /**
   * Uploads a binary buffer to object storage under a unique key.
   * 
   * @param storageKey Path key in the bucket.
   * @param body Binary file buffer.
   * @param contentType MIME type of the uploaded file.
   */
  async upload(storageKey: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }));
  }

  /**
   * Generates a temporary presigned URL for secure direct client downloads.
   * 
   * @param storageKey Path key in the bucket.
   * @param expiresIn Time-to-live in seconds (default: 3600).
   * @returns Signed URL string.
   */
  async getSignedDownloadUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Permanently removes an object key from storage bucket.
   * 
   * @param storageKey Path key to delete.
   */
  async delete(storageKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

let instance: ObjectStorage | null = null;

/**
 * Returns the singleton ObjectStorage client instance initialized from process environment.
 * 
 * @returns Configured ObjectStorage instance.
 */
export function getObjectStorage(): ObjectStorage {
  if (!instance) {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const region = process.env.AWS_REGION ?? process.env.STORAGE_REGION ?? 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? process.env.STORAGE_ACCESS_KEY ?? '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.STORAGE_SECRET_KEY ?? '';
    const bucket = process.env.STORAGE_BUCKET ?? 'incident-attachments';
    const forcePathStyle = process.env.STORAGE_FORCE_PATH_STYLE === 'true';

    instance = new ObjectStorage({
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      forcePathStyle,
      ...(endpoint !== undefined ? { endpoint } : {}),
    });
  }
  return instance;
}