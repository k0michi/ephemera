export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
export type VideoCodec = 'h264' | 'vp8' | 'vp9' | 'av1' | 'h265';
export type VideoType = 'video/mp4' | 'video/webm' | 'video/quicktime';

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
}