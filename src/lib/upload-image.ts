import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const BUCKET = 'post-images';

function randomId(): string {
  // Short opaque id (timestamp + random), enough to avoid collisions per-user.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Reads an image picker asset, uploads it as JPEG under {userId}/{id}.jpg,
// and returns the public URL.
export async function uploadPostImage(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  const base64 =
    asset.base64 ??
    (await readAsStringAsync(asset.uri, { encoding: EncodingType.Base64 }));
  if (!base64) throw new Error('이미지를 읽지 못했어요');

  const path = `${userId}/${randomId()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
