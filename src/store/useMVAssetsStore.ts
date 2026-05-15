// MV 素材管理 store：audio / video / image / lyrics / font
// 设计目标：上传 + 列表 + 删除 + 单选激活；具体的渲染接入在各 effect 中读 active asset
// 不进 JSON 的运行时字段（blobUrl、videoEl、parsedLines 等）在导出时被剥除（PR-5 处理）

import { create } from 'zustand';
import { engine } from '../audio/engine';
import { parseLrc, LyricLine, LyricWord } from '../tabs/MV/lyrics/parser';

export type { LyricLine, LyricWord };

export type MVAssetType = 'audio' | 'video' | 'image' | 'lyrics' | 'font';

interface MVAssetBase {
  id: string;
  type: MVAssetType;
  name: string;
  size: number;
  createdAt: number;
}

export interface MVAudioAsset extends MVAssetBase {
  type: 'audio';
  blobUrl: string;
  audioEl: HTMLAudioElement;
  duration?: number;
}

export interface MVVideoAsset extends MVAssetBase {
  type: 'video';
  blobUrl: string;
  videoEl: HTMLVideoElement;
  duration?: number;
  width?: number;
  height?: number;
}

export interface MVImageAsset extends MVAssetBase {
  type: 'image';
  blobUrl: string;
  imageEl: HTMLImageElement;
  width?: number;
  height?: number;
}

export interface MVLyricsAsset extends MVAssetBase {
  type: 'lyrics';
  rawText: string;
  parsedLines?: LyricLine[]; // 由 PR-3 lyrics/parser.ts 填充
  isTranslation: boolean;
}

export interface MVFontAsset extends MVAssetBase {
  type: 'font';
  fontFamily: string;
  loaded: boolean;
}

export type MVAsset =
  | MVAudioAsset
  | MVVideoAsset
  | MVImageAsset
  | MVLyricsAsset
  | MVFontAsset;

export interface MVAssetsState {
  assets: MVAsset[];
  activeAudioId: string | null;
  activeVideoId: string | null;
  activeImageId: string | null;
  activeLyricsId: string | null;
  activeLyricsTranslationId: string | null;
  activeFontId: string | null;
  videoVisible: boolean;
  imageVisible: boolean;
  lyricsVisible: boolean;
  lyricsTranslationVisible: boolean;

  addAudio: (file: File) => Promise<string | null>;
  addVideo: (file: File) => Promise<string | null>;
  addImage: (file: File) => Promise<string | null>;
  addLyrics: (file: File, isTranslation?: boolean) => Promise<string | null>;
  addFont: (file: File) => Promise<string | null>;
  removeAsset: (id: string) => void;
  setActive: (type: MVAssetType, id: string | null, isTranslation?: boolean) => void;
  setAssetVisible: (kind: 'video' | 'image' | 'lyrics' | 'lyricsTranslation', visible: boolean) => void;
  getActive: (type: MVAssetType) => MVAsset | null;
  clear: () => void;
}

const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'];
const VIDEO_EXT = ['mp4', 'webm', 'mov'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
const LYRICS_EXT = ['lrc', 't.lrc', 'txt'];
const FONT_EXT = ['ttf', 'otf', 'woff', 'woff2'];

function makeId(): string {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function classifyByExt(name: string): MVAssetType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.t.lrc')) return 'lyrics';
  const ext = getExt(lower);
  if (AUDIO_EXT.includes(ext)) return 'audio';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (LYRICS_EXT.includes(ext)) return 'lyrics';
  if (FONT_EXT.includes(ext)) return 'font';
  return null;
}

export const useMVAssetsStore = create<MVAssetsState>((set, get) => ({
  assets: [],
  activeAudioId: null,
  activeVideoId: null,
  activeImageId: null,
  activeLyricsId: null,
  activeLyricsTranslationId: null,
  activeFontId: null,
  videoVisible: true,
  imageVisible: true,
  lyricsVisible: true,
  lyricsTranslationVisible: true,

  addAudio: async (file) => {
    const blobUrl = URL.createObjectURL(file);
    const audioEl = new Audio(blobUrl);
    audioEl.preload = 'metadata';
    try {
      await new Promise<void>((resolve, reject) => {
        audioEl.onloadedmetadata = () => resolve();
        audioEl.onerror = () => reject(new Error('音频解码失败'));
      });
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      window.alert(`音频加载失败：${err instanceof Error ? err.message : String(err)}（部分容器如 .flac 浏览器不支持，请先转 wav/mp3）`);
      return null;
    }
    const id = makeId();
    const asset: MVAudioAsset = {
      id, type: 'audio', name: file.name, size: file.size, createdAt: Date.now(),
      blobUrl, audioEl, duration: audioEl.duration,
    };
    set(state => ({
      assets: [...state.assets.filter(a => a.type !== 'audio'), asset],
      activeAudioId: id,
    }));
    return id;
  },

  addVideo: async (file) => {
    const blobUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = blobUrl;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);
    try {
      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error('视频解码失败'));
      });
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      videoEl.remove();
      window.alert(`视频加载失败：${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
    const id = makeId();
    const asset: MVVideoAsset = {
      id, type: 'video', name: file.name, size: file.size, createdAt: Date.now(),
      blobUrl, videoEl, duration: videoEl.duration,
      width: videoEl.videoWidth, height: videoEl.videoHeight,
    };
    set(state => ({
      assets: [...state.assets, asset],
      activeVideoId: state.activeVideoId ?? id,
    }));
    return id;
  },

  addImage: async (file) => {
    const blobUrl = URL.createObjectURL(file);
    const imageEl = new Image();
    imageEl.src = blobUrl;
    try {
      await imageEl.decode();
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      window.alert(`图片加载失败：${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
    const id = makeId();
    const asset: MVImageAsset = {
      id, type: 'image', name: file.name, size: file.size, createdAt: Date.now(),
      blobUrl, imageEl, width: imageEl.naturalWidth, height: imageEl.naturalHeight,
    };
    set(state => ({
      assets: [...state.assets, asset],
      activeImageId: state.activeImageId ?? id,
    }));
    return id;
  },

  addLyrics: async (file, isTranslation = false) => {
    const text = await file.text();
    const id = makeId();
    const inferTranslation = file.name.toLowerCase().endsWith('.t.lrc') || isTranslation;
    let parsedLines: LyricLine[] | undefined;
    try {
      parsedLines = parseLrc(text);
    } catch (err) {
      console.warn('LRC 解析失败', err);
    }
    const asset: MVLyricsAsset = {
      id, type: 'lyrics', name: file.name, size: file.size, createdAt: Date.now(),
      rawText: text, isTranslation: inferTranslation, parsedLines,
    };
    set(state => ({
      assets: [...state.assets, asset],
      activeLyricsId: !inferTranslation && state.activeLyricsId === null ? id : state.activeLyricsId,
      activeLyricsTranslationId: inferTranslation && state.activeLyricsTranslationId === null ? id : state.activeLyricsTranslationId,
    }));
    return id;
  },

  addFont: async (file) => {
    // 用文件名（去扩展名）作为 fontFamily；PR-4 实际调 FontFace API 注册
    const family = file.name.replace(/\.(ttf|otf|woff2?|woff)$/i, '').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    const id = makeId();
    let loaded = false;
    try {
      const arr = await file.arrayBuffer();
      const ff = new FontFace(family, arr);
      await ff.load();
      (document as Document & { fonts: FontFaceSet }).fonts.add(ff);
      loaded = true;
    } catch (err) {
      window.alert(`字体加载失败：${err instanceof Error ? err.message : String(err)}`);
    }
    const asset: MVFontAsset = {
      id, type: 'font', name: file.name, size: file.size, createdAt: Date.now(),
      fontFamily: family, loaded,
    };
    set(state => ({
      assets: [...state.assets, asset],
      activeFontId: loaded && state.activeFontId === null ? id : state.activeFontId,
    }));
    return id;
  },

  removeAsset: (id) => {
    const state = get();
    const asset = state.assets.find(a => a.id === id);
    if (!asset) return;
    // 清理运行时资源
    if (asset.type === 'video') {
      asset.videoEl.pause();
      asset.videoEl.remove();
      URL.revokeObjectURL(asset.blobUrl);
    } else if (asset.type === 'audio') {
      asset.audioEl.pause();
      asset.audioEl.remove();
      URL.revokeObjectURL(asset.blobUrl);
    } else if (asset.type === 'image') {
      URL.revokeObjectURL(asset.blobUrl);
    }
    set(s => ({
      assets: s.assets.filter(a => a.id !== id),
      activeAudioId: s.activeAudioId === id ? null : s.activeAudioId,
      activeVideoId: s.activeVideoId === id ? null : s.activeVideoId,
      activeImageId: s.activeImageId === id ? null : s.activeImageId,
      activeLyricsId: s.activeLyricsId === id ? null : s.activeLyricsId,
      activeLyricsTranslationId: s.activeLyricsTranslationId === id ? null : s.activeLyricsTranslationId,
      activeFontId: s.activeFontId === id ? null : s.activeFontId,
    }));
  },

  setActive: (type, id, isTranslation) => {
    set(state => {
      const key = type === 'audio' ? 'activeAudioId'
        : type === 'video' ? 'activeVideoId'
        : type === 'image' ? 'activeImageId'
        : type === 'lyrics' ? (isTranslation ? 'activeLyricsTranslationId' : 'activeLyricsId')
        : type === 'font' ? 'activeFontId'
        : null;
      if (!key) return state;
      return { ...state, [key]: id };
    });
  },

  setAssetVisible: (kind, visible) => {
    if (kind === 'video') set({ videoVisible: visible });
    else if (kind === 'image') set({ imageVisible: visible });
    else if (kind === 'lyrics') set({ lyricsVisible: visible });
    else set({ lyricsTranslationVisible: visible });
  },

  getActive: (type) => {
    const state = get();
    const id = type === 'audio' ? state.activeAudioId
      : type === 'video' ? state.activeVideoId
      : type === 'image' ? state.activeImageId
      : type === 'lyrics' ? state.activeLyricsId
      : type === 'font' ? state.activeFontId
      : null;
    return id ? state.assets.find(a => a.id === id) ?? null : null;
  },

  clear: () => {
    const state = get();
    state.assets.forEach(a => {
      if (a.type === 'video') { a.videoEl.pause(); a.videoEl.remove(); URL.revokeObjectURL(a.blobUrl); }
      else if (a.type === 'audio') { a.audioEl.pause(); a.audioEl.remove(); URL.revokeObjectURL(a.blobUrl); }
      else if (a.type === 'image') { URL.revokeObjectURL(a.blobUrl); }
    });
    set({
      assets: [],
      activeAudioId: null,
      activeVideoId: null,
      activeImageId: null,
      activeLyricsId: null,
      activeLyricsTranslationId: null,
      activeFontId: null,
      videoVisible: true,
      imageVisible: true,
      lyricsVisible: true,
      lyricsTranslationVisible: true,
    });
  },
}));
