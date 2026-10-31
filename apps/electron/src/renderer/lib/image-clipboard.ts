import { t } from '@/i18n'

export interface ImageClipboardResult {
  success: boolean
  message?: string
}

type ImageClipboardWriter = (dataUrl: string) => Promise<ImageClipboardResult>
type ImageDataUrlLoader = (src: string) => Promise<string>

async function fetchImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src)
  if (!response.ok) throw new Error(t('misc.clipboard.imageFetchFailed', { status: response.status }))

  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error(t('misc.clipboard.imageConvertFailed')))
    }, { once: true })
    reader.addEventListener('error', () => reject(new Error(t('misc.clipboard.imageConvertFailed'))), { once: true })
    reader.addEventListener('abort', () => reject(new Error(t('misc.clipboard.imageConvertAborted'))), { once: true })
    reader.readAsDataURL(blob)
  })
}

export async function copyImageSourceToClipboard(
  src: string,
  writeImage: ImageClipboardWriter,
  loadDataUrl: ImageDataUrlLoader = fetchImageAsDataUrl,
): Promise<ImageClipboardResult> {
  if (!src) return { success: false, message: t('misc.clipboard.invalidImageData') }

  try {
    const dataUrl = src.startsWith('data:') ? src : await loadDataUrl(src)
    const result = await writeImage(dataUrl)
    return result.success ? result : { success: false, message: result.message ?? t('misc.clipboard.copyFailed') }
  } catch {
    return { success: false, message: t('misc.clipboard.copyFailedHint') }
  }
}
