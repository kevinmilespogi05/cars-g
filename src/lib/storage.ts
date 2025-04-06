import { supabase } from './supabase';

export async function uploadImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from('report-images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('report-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  const uploadPromises = files.map(file => uploadImage(file));
  return Promise.all(uploadPromises);
} 