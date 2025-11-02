import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

type Encoding = 'utf8' | 'base64';

export async function readAsStringAsync(uri: string, options: { encoding: Encoding }): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`No se pudo descargar el archivo: ${response.status}`);
    }
    if (options.encoding === 'base64') {
      const blob = await response.blob();
      return await blobToBase64(blob);
    }
    return await response.text();
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: options.encoding === 'base64'
      ? FileSystem.EncodingType.Base64
      : FileSystem.EncodingType.UTF8,
  } as FileSystem.ReadingOptions);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const len = bytes.length;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}
