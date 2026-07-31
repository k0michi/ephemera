export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
export type VideoCodec = 'h264' | 'vp8' | 'vp9' | 'av1' | 'h265';
export type VideoType = 'video/mp4' | 'video/webm' | 'video/quicktime';

export type AttachmentCategory = 'image' | 'video';

export type ImageAttachmentVariant = '256' | '512' | '1024' | '2048';

export type VideoAttachmentVariant = '360' | '720' | '1080';

export type AttachmentVariant = ImageAttachmentVariant | VideoAttachmentVariant | 'index';

export type AttachmentVariantPartExtension = 'm3u8' | 'ts' | 'aac';

const kPartMimeTypes: Record<AttachmentVariantPartExtension, string> = {
  'm3u8': 'application/vnd.apple.mpegurl',
  'ts': 'video/mp2t',
  'aac': 'audio/aac',
};

export default class AttachmentUtil {
  static getExtension(type: ImageType | VideoType): string {
    const mimeMap: Record<ImageType | VideoType, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov'
    };

    return mimeMap[type];
  }

  static getKindFromMimeType(mimeType: string): AttachmentCategory {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
  }

  static getVariants(kind: AttachmentCategory): AttachmentVariant[] {
    if (kind === 'image') {
      return ['256', '512', '1024', '2048'];
    } else if (kind === 'video') {
      return ['360', '720', '1080', 'index'];
    } else {
      throw new Error(`Unsupported attachment category: ${kind}`);
    }
  }

  static isVariantInCategory(kind: AttachmentCategory, variant: AttachmentVariant): boolean {
    return (this.getVariants(kind) as string[]).includes(variant);
  }

  static isVariant(value: string): value is AttachmentVariant {
    return (this.getVariants('image') as string[]).includes(value)
      || (this.getVariants('video') as string[]).includes(value);
  }

  static getVariantPartMimeType(ext: string): string | undefined {
    return (kPartMimeTypes as Record<string, string>)[ext];
  }
}