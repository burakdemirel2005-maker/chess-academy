import { invoke } from '@tauri-apps/api/core';

export interface RuntimePlatformInfo {
  platform: string;
  arch: string;
  version: string;
  isDesktop: boolean;
}

export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    '__TAURI_INTERNALS__' in window ||
      '__TAURI__' in window ||
      navigator.userAgent.includes('Tauri')
  );
}

export async function getRuntimePlatformInfo(): Promise<RuntimePlatformInfo> {
  if (isTauriDesktop()) {
    try {
      const info = await invoke<{
        platform: string;
        arch: string;
        version: string;
        is_desktop: boolean;
      }>('get_platform_info');
      return {
        platform: info.platform,
        arch: info.arch,
        version: info.version,
        isDesktop: info.is_desktop,
      };
    } catch {
      return {
        platform: 'macos',
        arch: 'aarch64',
        version: '1.0.0',
        isDesktop: true,
      };
    }
  }

  return {
    platform: 'web',
    arch: 'wasm32',
    version: '1.0.0',
    isDesktop: false,
  };
}

export async function saveNativeDesktopBackup(jsonPayload: string): Promise<boolean> {
  if (!isTauriDesktop()) return false;
  try {
    return await invoke<boolean>('write_local_backup', { payload: jsonPayload });
  } catch {
    return false;
  }
}

export async function loadNativeDesktopBackup(): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  try {
    const data = await invoke<string>('read_local_backup');
    return data && data !== '{}' ? data : null;
  } catch {
    return null;
  }
}
