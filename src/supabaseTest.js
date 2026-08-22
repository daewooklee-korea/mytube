import { supabase } from './supabase'

export async function testSupabaseUpload(file) {
  const fileName = `test-${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('Videos')
    .upload(fileName, file)

  if (error) {
    console.error('업로드 오류:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  const { data: publicData } = supabase.storage
    .from('Videos')
    .getPublicUrl(fileName)

  console.log('업로드 성공:', data)
  console.log('영상 주소:', publicData.publicUrl)

  return {
    success: true,
    url: publicData.publicUrl,
  }
}