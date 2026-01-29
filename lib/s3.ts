import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic = false
): Promise<string> {
  const key = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: 'image/*',
  });

  await s3Client.send(command);
  return key;
}

export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
): Promise<string> {
  if (isPublic) {
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}
