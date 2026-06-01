/** Tamanho máximo do payload base64 armazenado (~2 MB de string, foto já comprimida) */
export const AVATAR_MAX_BASE64_LENGTH = 2 * 1024 * 1024

/** Limite do body JSON da API (upload de perfil com foto) */
export const API_JSON_BODY_LIMIT = '12mb'

export function validateAvatarBase64(avatarData) {
  if (!avatarData) return null
  const raw = String(avatarData).trim()
  if (!raw) return null
  if (!raw.startsWith('data:image/')) {
    return 'Formato de imagem inválido. Envie JPG ou PNG.'
  }
  if (raw.length > AVATAR_MAX_BASE64_LENGTH) {
    return `Imagem muito grande após envio (máx. ~${Math.round(AVATAR_MAX_BASE64_LENGTH / 1024 / 1024)} MB). A foto é comprimida automaticamente no app.`
  }
  return null
}
