import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Uploads an image-picker asset as JPEG to {bucket}/{userId}/{id}.jpg
// and returns its public URL.
async function uploadImage(
  asset: ImagePicker.ImagePickerAsset,
  bucket: string,
  userId: string,
): Promise<{ publicUrl: string; path: string }> {
  const base64 =
    asset.base64 ??
    (await readAsStringAsync(asset.uri, { encoding: EncodingType.Base64 }));
  if (!base64) throw new Error('이미지를 읽지 못했어요');

  const path = `${userId}/${randomId()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function uploadPostImage(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  const { publicUrl } = await uploadImage(asset, 'post-images', userId);
  return publicUrl;
}

export async function uploadAvatarImage(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  const { publicUrl } = await uploadImage(asset, 'avatars', userId);
  return publicUrl;
}

export async function uploadCrewLogo(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  // 크루 로고도 avatars 버킷 사용 (별도 버킷 안 만들고 재활용).
  // 업로더 user_id 폴더 아래 저장 → RLS 정책 그대로 사용.
  const { publicUrl } = await uploadImage(asset, 'avatars', userId);
  return publicUrl;
}

export async function uploadGymLogoSuggestion(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  const { publicUrl } = await uploadImage(asset, 'gym-logos', userId);
  return publicUrl;
}

// Best-effort delete of an avatar by its public URL.
// Errors are swallowed — orphaned files are harmless and we never block the UX.
export async function deleteAvatarByUrl(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  // Public URL shape:
  //   https://<project>.supabase.co/storage/v1/object/public/avatars/<userId>/<file>
  const marker = '/storage/v1/object/public/avatars/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  await supabase.storage.from('avatars').remove([path]);
}
