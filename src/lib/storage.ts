interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private region: string;

  constructor(config?: StorageConfig) {
    this.endpoint = config?.endpoint || process.env.STORAGE_ENDPOINT || "";
    this.accessKeyId =
      config?.accessKey || process.env.STORAGE_ACCESS_KEY || "";
    this.secretAccessKey =
      config?.secretKey || process.env.STORAGE_SECRET_KEY || "";
    this.bucket = process.env.STORAGE_BUCKET || "";
    this.region = config?.region || process.env.STORAGE_REGION || "auto";
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer | Uint8Array;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    const uploadBucket = bucket || this.bucket;
    if (!uploadBucket) {
      throw new Error("Bucket is required");
    }

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        "Storage configuration missing: accessKeyId or secretAccessKey is not set"
      );
    }

    const bodyArray = new Uint8Array(body);

    const url = `${this.endpoint}/${uploadBucket}/${key}`;

    const { AwsClient } = await import("aws4fetch");

    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: this.region,
      service: "s3",
    });

    const headers: Record<string, string> = {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": bodyArray.length.toString(),
    };

    const request = new Request(url, {
      method: "PUT",
      headers,
      body: bodyArray as any, // Cast to any to avoid library type mismatch between Buffer and BodyInit
    });

    const response = await client.fetch(request);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return {
      location: url,
      bucket: uploadBucket,
      key,
      filename: key.split("/").pop(),
      url: process.env.STORAGE_DOMAIN
        ? `${process.env.STORAGE_DOMAIN}/${key}`
        : url,
    };
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const maxAttempts = Math.max(
      1,
      Number(process.env.STORAGE_DOWNLOAD_RETRIES || "3")
    );
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No body in response");
        }

        const arrayBuffer = await response.arrayBuffer();
        const body = new Uint8Array(arrayBuffer);

        return this.uploadFile({
          body,
          key,
          bucket,
          contentType,
          disposition,
        });
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, 300 * attempt)
          );
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Download failed");
  }
}
