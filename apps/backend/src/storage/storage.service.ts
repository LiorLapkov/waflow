import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import type { AppEnv } from '../config/env';

/**
 * Media storage in MinIO (S3-compatible).
 * Rule: files are NOT in Postgres — only the key + metadata.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
    this.s3 = new S3Client({
      endpoint: config.get('MINIO_ENDPOINT', { infer: true }),
      region: config.get('MINIO_REGION', { infer: true }),
      forcePathStyle: true, // required for MinIO
      credentials: {
        accessKeyId: config.get('MINIO_ROOT_USER', { infer: true }),
        secretAccessKey: config.get('MINIO_ROOT_PASSWORD', { infer: true }),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Ensure the bucket exists (in case minio-init did not finish).
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} created`);
      } catch (err) {
        this.logger.warn(`Failed to create bucket ${this.bucket}: ${(err as Error).message}`);
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Object stream for proxied download through the backend (with auth). */
  async getStream(key: string): Promise<{ stream: Readable; contentType: string }> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      stream: res.Body as Readable,
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  }
}
