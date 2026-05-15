// MV 项目导入/导出 v2
//
// 三种存储模式：
// - path: JSON 只记录文件名，导入时需手动重选素材（兼容老 v1）
// - inline: 小素材 base64 内嵌到 JSON（自包含）；> 1MB 报错
// - zip: 用 jszip 打包成 .mvproj.zip，含 project.json + assets/ 目录
//
// 导入时根据扩展名自动判断（.zip → zip 模式，.json → 解析 version）。

import JSZip from 'jszip';
import { useMVStore } from '../../store/useMVStore';
import {
  useMVAssetsStore,
  MVAsset,
} from '../../store/useMVAssetsStore';
import {
  MVAssetRef,
  MVAssetRefMode,
  MVProjectFileV2,
  AnyMVProjectFile,
} from './mvProject';

const INLINE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

interface AssetSlotEntry {
  key: keyof NonNullable<MVProjectFileV2['assets']>;
  asset: MVAsset;
  fileBlob?: Blob; // mode=zip 时填入
}

function collectActiveAssets(): AssetSlotEntry[] {
  const s = useMVAssetsStore.getState();
  const out: AssetSlotEntry[] = [];
  const pushIfActive = (
    key: keyof NonNullable<MVProjectFileV2['assets']>,
    id: string | null,
  ) => {
    if (!id) return;
    const asset = s.assets.find(a => a.id === id);
    if (asset) out.push({ key, asset });
  };
  pushIfActive('audio', s.activeAudioId);
  pushIfActive('video', s.activeVideoId);
  pushIfActive('image', s.activeImageId);
  pushIfActive('lyrics', s.activeLyricsId);
  pushIfActive('lyricsTranslation', s.activeLyricsTranslationId);
  pushIfActive('font', s.activeFontId);
  return out;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** 把 MVAsset 转回 Blob（用于导出时打包） */
async function assetToBlob(asset: MVAsset): Promise<Blob | null> {
  if (asset.type === 'video' || asset.type === 'image') {
    const r = await fetch(asset.blobUrl);
    return await r.blob();
  }
  if (asset.type === 'lyrics') {
    return new Blob([asset.rawText], { type: 'text/plain' });
  }
  if (asset.type === 'audio') {
    // 音频已经被 engine 持有为 AudioBuffer，原始文件不保留。
    // 导出 zip / inline 模式时报错，提示用户改用 path 模式。
    return null;
  }
  if (asset.type === 'font') {
    // 同上，字体已注册到 document.fonts，原始 arrayBuffer 没保留。
    return null;
  }
  return null;
}

function buildBaseConfig(): Omit<MVProjectFileV2, 'assets'> {
  const store = useMVStore.getState();
  return {
    version: '2.0',
    name: `${store.text.songTitle.trim() || 'Untitled'} - ${store.text.artistName.trim() || 'Unknown'}`,
    theme: store.currentThemeId,
    preset: store.currentTemplateId,
    text: { ...store.text },
    effects: {
      dynamicBackground: { ...store.dynamicBackground },
      spectrum: {
        style: store.currentSpectrumStyle,
        barCount: store.spectrumSettings.barCount,
        sensitivity: store.global.sensitivity,
        smoothing: store.global.smoothing,
        glow: store.global.glow,
        mirror: store.currentSpectrumStyle === 'mirrorBar',
        radius: store.spectrumSettings.radius,
        barWidth: store.spectrumSettings.barWidth,
        offsetX: store.spectrumSettings.offsetX,
        offsetY: store.spectrumSettings.offsetY,
        scale: store.spectrumSettings.scale,
        colorA: store.spectrumSettings.colorA,
        colorB: store.spectrumSettings.colorB,
        glowColor: store.spectrumSettings.glowColor,
        opacity: store.global.opacity,
      },
    },
    // 录制预设在 RecordPanel 内部 state，未持久化到 store；导出时默认 'archive'
    exportPreset: 'archive',
  };
}

async function buildAssetRef(
  entry: AssetSlotEntry,
  mode: MVAssetRefMode,
  zipBucket?: JSZip,
): Promise<MVAssetRef | null> {
  const { asset } = entry;
  const sub = asset.type === 'lyrics' ? 'lyrics'
    : asset.type === 'audio' ? 'audio'
    : asset.type === 'video' ? 'video'
    : asset.type === 'image' ? 'image'
    : 'font';

  if (mode === 'path') {
    return {
      name: asset.name, size: asset.size, mode: 'path', data: asset.name,
      isTranslation: asset.type === 'lyrics' ? asset.isTranslation : undefined,
    };
  }
  if (mode === 'inline') {
    if (asset.size > INLINE_MAX_BYTES) {
      throw new Error(`素材 ${asset.name} 超过 1MB，无法用 inline 模式导出，请改用 zip 模式或 path 模式`);
    }
    const blob = await assetToBlob(asset);
    if (!blob) {
      throw new Error(`${asset.type} 素材（${asset.name}）原始数据已被消费，inline 模式不可用；请改用 path 模式或重新加载后导出`);
    }
    return {
      name: asset.name, size: asset.size, mode: 'inline', data: await blobToBase64(blob),
      isTranslation: asset.type === 'lyrics' ? asset.isTranslation : undefined,
    };
  }
  // zip
  if (!zipBucket) throw new Error('zip 模式必须传入 zipBucket');
  const blob = await assetToBlob(asset);
  if (!blob) {
    // 音频/字体无法重新取出原始字节 — 退化为 path 模式
    return {
      name: asset.name, size: asset.size, mode: 'path', data: asset.name,
      isTranslation: asset.type === 'lyrics' ? asset.isTranslation : undefined,
    };
  }
  const relPath = `assets/${sub}/${asset.name}`;
  zipBucket.file(relPath, blob);
  return {
    name: asset.name, size: asset.size, mode: 'zip', data: relPath,
    isTranslation: asset.type === 'lyrics' ? asset.isTranslation : undefined,
  };
}

/** 导出项目。返回 { blob, suggestedName }。 */
export async function exportProjectFile(mode: MVAssetRefMode): Promise<{ blob: Blob; suggestedName: string }> {
  const config = buildBaseConfig();
  const entries = collectActiveAssets();
  const assets: NonNullable<MVProjectFileV2['assets']> = {};

  if (mode === 'zip') {
    const zip = new JSZip();
    for (const entry of entries) {
      const ref = await buildAssetRef(entry, 'zip', zip);
      if (ref) assets[entry.key] = ref;
    }
    const final: MVProjectFileV2 = { ...config, assets };
    zip.file('project.json', JSON.stringify(final, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    return { blob, suggestedName: `${sanitizeFile(config.name)}.mvproj.zip` };
  }

  for (const entry of entries) {
    const ref = await buildAssetRef(entry, mode);
    if (ref) assets[entry.key] = ref;
  }
  const final: MVProjectFileV2 = { ...config, assets };
  const blob = new Blob([JSON.stringify(final, null, 2)], { type: 'application/json' });
  return { blob, suggestedName: `${sanitizeFile(config.name)}.mvproj.json` };
}

function sanitizeFile(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '-');
}

/** 导入项目文件。自动识别 .zip / .json，恢复 store + 素材。 */
export async function importProjectFile(file: File): Promise<void> {
  const lowerName = file.name.toLowerCase();
  let projectJson: AnyMVProjectFile;
  let zip: JSZip | null = null;

  if (lowerName.endsWith('.zip') || lowerName.endsWith('.mvproj.zip')) {
    zip = await JSZip.loadAsync(file);
    const projFile = zip.file('project.json');
    if (!projFile) throw new Error('zip 包内未找到 project.json');
    projectJson = JSON.parse(await projFile.async('string')) as AnyMVProjectFile;
  } else {
    const text = await file.text();
    projectJson = JSON.parse(text) as AnyMVProjectFile;
  }

  // v1 兼容：转成 v2 形状（无 assets 字段）
  if (projectJson.version === '1.0') {
    useMVStore.getState().importProject(projectJson);
    useMVAssetsStore.getState().clear();
    return;
  }

  if (projectJson.version !== '2.0') {
    throw new Error(`不支持的项目版本：${(projectJson as { version?: unknown }).version}`);
  }

  // 先应用基础配置（复用 v1 importProject 但补 export.format）
  useMVStore.getState().importProject({
    version: '1.0',
    name: projectJson.name,
    resolution: '1920x1080',
    fps: 60,
    theme: projectJson.theme,
    preset: projectJson.preset,
    text: projectJson.text,
    effects: projectJson.effects,
    export: { format: 'webm-vp9', fps: 60, quality: 'high' },
  });

  // 恢复素材
  useMVAssetsStore.getState().clear();
  const assets = projectJson.assets;
  if (!assets) return;

  for (const [key, ref] of Object.entries(assets)) {
    if (!ref) continue;
    await restoreAsset(key as keyof typeof assets, ref, zip);
  }
}

async function restoreAsset(
  key: keyof NonNullable<MVProjectFileV2['assets']>,
  ref: MVAssetRef,
  zip: JSZip | null,
): Promise<void> {
  const store = useMVAssetsStore.getState();

  let blob: Blob | null = null;
  if (ref.mode === 'inline') {
    // 用 data URL 路线避免 TS 对 Uint8Array.buffer 的 SharedArrayBuffer 类型推导
    const dataUrl = `data:application/octet-stream;base64,${ref.data}`;
    blob = await (await fetch(dataUrl)).blob();
  } else if (ref.mode === 'zip' && zip) {
    const f = zip.file(ref.data);
    if (f) blob = await f.async('blob');
  }
  // path 模式：跳过，由用户手动重选

  if (!blob) {
    console.warn(`素材 ${ref.name} 无法自动恢复（mode=${ref.mode}），跳过`);
    return;
  }

  const file = new File([blob], ref.name);
  if (key === 'audio') await store.addAudio(file);
  else if (key === 'video') await store.addVideo(file);
  else if (key === 'image') await store.addImage(file);
  else if (key === 'lyrics') await store.addLyrics(file, false);
  else if (key === 'lyricsTranslation') await store.addLyrics(file, true);
  else if (key === 'font') await store.addFont(file);
}
