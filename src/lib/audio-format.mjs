// Keep file extensions consistent with the container produced by MediaRecorder.
// Safari commonly records MP4, while Chromium commonly records WebM.
const extensions = {
  'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'video/mp4': 'mp4',
  'audio/webm': 'webm', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/ogg': 'ogg', 'application/ogg': 'ogg',
  'audio/flac': 'flac', 'audio/x-flac': 'flac',
};

export function audioFileExtension(contentType) {
  const mime = String(contentType || 'audio/webm').split(';')[0].trim().toLowerCase();
  return extensions[mime] || 'webm';
}
