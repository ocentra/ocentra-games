import { ContentType } from '@/constants/http';

export function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    'png': ContentType.ImagePng,
    'jpg': ContentType.ImageJpeg,
    'jpeg': ContentType.ImageJpeg,
    'gif': ContentType.ImageGif,
    'webp': ContentType.ImageWebp,
    'svg': ContentType.ImageSvgXml,
    'asset': ContentType.ApplicationJson,
    'json': ContentType.ApplicationJson,
    'woff': ContentType.FontWoff,
    'woff2': ContentType.FontWoff2,
    'ttf': ContentType.FontTtf,
    'otf': ContentType.FontOtf,
    'txt': ContentType.TextPlain,
    'html': ContentType.TextHtml,
    'css': ContentType.TextCss,
    'js': ContentType.ApplicationJavascript,
  };
  return contentTypes[ext || ''] || ContentType.OctetStream;
}
