import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const IMAGE_MULTIPART_LIMITS = {
  fieldNameSize: 100,
  fieldSize: 8 * 1024,
  fields: 3,
  files: 1,
  // Busboy emits partsLimit upon reaching the configured value; 4 fields are valid here (3 + 1).
  parts: 5,
} as const;

export function singleImageUploadInterceptor(maxFileBytes: number) {
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { ...IMAGE_MULTIPART_LIMITS, fileSize: maxFileBytes },
  });
}
