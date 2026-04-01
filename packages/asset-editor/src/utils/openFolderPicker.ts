import { open } from '@tauri-apps/plugin-dialog'
import { getResourcesDir } from '@/adapters/assets/TauriAssetAdapter'

export async function openFolderPicker(options?: {
  defaultPath?: string
}): Promise<string | null> {
  const defaultPath = options?.defaultPath ?? await getResourcesDir()
  const defaultPathNative = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().startsWith('win')
    ? defaultPath.replace(/\//g, '\\')
    : defaultPath
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: defaultPathNative,
  })
  if (typeof selected !== 'string') return null
  return selected
}

export function absolutePathToResourcesRelative(
  absolutePath: string,
  resourcesDir: string
): string {
  const normalizedAbs = absolutePath.replace(/\\/g, '/').replace(/\/$/, '')
  const normalizedRes = resourcesDir.replace(/\\/g, '/').replace(/\/$/, '')
  if (normalizedAbs.startsWith(normalizedRes + '/')) {
    return 'Resources/' + normalizedAbs.slice(normalizedRes.length + 1)
  }
  if (normalizedAbs === normalizedRes) {
    return 'Resources'
  }
  return absolutePath
}
