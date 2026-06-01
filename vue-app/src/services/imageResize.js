/** Limite do arquivo bruto (câmera/galeria) antes da compressão — 8 MB */
export const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024

/** Alvo após compressão (~800 KB em base64) */
export const TARGET_AVATAR_BYTES = 800 * 1024

const BASE64_OVERHEAD = 1.37

/**
 * Redimensiona e comprime imagem para JPEG (compatível com mobile/iOS).
 * @param {File} file
 * @returns {Promise<string>} data URL image/jpeg
 */
export function resizeImageForAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem (JPG, PNG ou WebP).'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const maxSide = 1280
        let { width, height } = img
        const scale = Math.min(1, maxSide / Math.max(width, height, 1))
        width = Math.max(1, Math.round(width * scale))
        height = Math.max(1, Math.round(height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Seu navegador não suporta processamento de imagem.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.88
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        const maxLen = TARGET_AVATAR_BYTES * BASE64_OVERHEAD

        while (dataUrl.length > maxLen && quality > 0.45) {
          quality -= 0.07
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        if (dataUrl.length > maxLen) {
          reject(
            new Error(
              'Imagem ainda muito grande após compressão. Tente outra foto ou um recorte menor.'
            )
          )
          return
        }

        resolve(dataUrl)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Falha ao processar a imagem.'))
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          'Não foi possível ler a imagem. No iPhone, use Fotos ou tire uma nova foto em JPG.'
        )
      )
    }

    img.src = url
  })
}
