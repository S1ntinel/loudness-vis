import { ChangeEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVAssetsStore, MVAssetType, MVAsset } from '../../../store/useMVAssetsStore';
import s from './AssetPanel.module.css';

const ACCEPT: Record<MVAssetType, string> = {
  audio: '.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,audio/*',
  video: '.mp4,.webm,.mov,video/*',
  image: '.png,.jpg,.jpeg,.webp,.avif,image/*',
  lyrics: '.lrc,.txt',
  font: '.ttf,.otf,.woff,.woff2',
};

const GROUP_LABEL_KEYS: Record<MVAssetType, string> = {
  audio: 'mv.audio',
  video: 'mv.videoBg',
  image: 'mv.image',
  lyrics: 'mv.lyrics',
  font: 'mv.font',
};

const GROUP_HINT_KEYS: Record<MVAssetType, string> = {
  audio: 'mv.audioHint',
  video: 'mv.videoBgHint',
  image: 'mv.imageHint',
  lyrics: 'mv.lyricsHint',
  font: 'mv.fontHint',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

interface AssetGroupProps {
  type: MVAssetType;
}

function AssetGroup({ type }: AssetGroupProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    assets,
    activeAudioId, activeVideoId, activeImageId,
    activeLyricsId, activeLyricsTranslationId, activeFontId,
    addAudio, addVideo, addImage, addLyrics, addFont,
    removeAsset, setActive,
  } = useMVAssetsStore();

  const items = assets.filter(a => a.type === type);

  async function handleAdd(file: File) {
    if (type === 'audio') await addAudio(file);
    else if (type === 'video') await addVideo(file);
    else if (type === 'image') await addImage(file);
    else if (type === 'lyrics') {
      const isTr = file.name.toLowerCase().endsWith('.t.lrc');
      await addLyrics(file, isTr);
    }
    else if (type === 'font') await addFont(file);
  }

  async function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await handleAdd(file);
    }
    event.target.value = '';
  }

  function isActive(asset: MVAsset, role?: 'lyrics-main' | 'lyrics-tr'): boolean {
    if (asset.type === 'audio') return asset.id === activeAudioId;
    if (asset.type === 'video') return asset.id === activeVideoId;
    if (asset.type === 'image') return asset.id === activeImageId;
    if (asset.type === 'lyrics') {
      if (role === 'lyrics-tr') return asset.id === activeLyricsTranslationId;
      return asset.id === activeLyricsId;
    }
    if (asset.type === 'font') return asset.id === activeFontId;
    return false;
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    Array.from(files).forEach(file => handleAdd(file));
  }

  return (
    <div
      className={s.group}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className={s.groupHeader}>
        <span className={s.groupTitle}>{t(GROUP_LABEL_KEYS[type])}</span>
        <button className={s.addBtn} onClick={() => inputRef.current?.click()}>
          {t('mv.addBtn')}
        </button>
      </div>
      <div className={s.groupHint}>{t(GROUP_HINT_KEYS[type])}</div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        multiple={type !== 'audio'}
        className={s.hiddenInput}
        onChange={onFileInput}
      />

      {items.length === 0 ? (
        <div className={s.empty}>{t('mv.uploadHint')}</div>
      ) : (
        <ul className={s.list}>
          {items.map(asset => (
            <li key={asset.id} className={s.item}>
              <div className={s.itemMain}>
                <div className={s.itemName} title={asset.name}>{asset.name}</div>
                <div className={s.itemMeta}>
                  {formatSize(asset.size)}
                  {asset.type === 'video' && asset.width
                    ? ` · ${asset.width}×${asset.height}`
                    : ''}
                  {asset.type === 'image' && asset.width
                    ? ` · ${asset.width}×${asset.height}`
                    : ''}
                  {asset.type === 'font' && !asset.loaded
                    ? ` · ${t('mv.loadFail')}`
                    : ''}
                  {asset.type === 'lyrics' && asset.isTranslation
                    ? ` · ${t('mv.translation')}`
                    : ''}
                </div>
              </div>
              <div className={s.itemActions}>
                {type === 'lyrics' && asset.type === 'lyrics' ? (
                  <>
                    <label className={s.radioLabel} title={t('mv.mainLyric')}>
                      <input
                        type="radio"
                        name="active-lyrics-main"
                        checked={isActive(asset, 'lyrics-main')}
                        onChange={() => setActive('lyrics', asset.id, false)}
                      />
                      <span>{t('mv.mainLyric')}</span>
                    </label>
                    <label className={s.radioLabel} title={t('mv.trLyric')}>
                      <input
                        type="radio"
                        name="active-lyrics-tr"
                        checked={isActive(asset, 'lyrics-tr')}
                        onChange={() => setActive('lyrics', asset.id, true)}
                      />
                      <span>{t('mv.trLyric')}</span>
                    </label>
                  </>
                ) : (
                  <label className={s.radioLabel} title={t('mv.current')}>
                    <input
                      type="radio"
                      name={`active-${type}`}
                      checked={isActive(asset)}
                      onChange={() => setActive(type, asset.id)}
                    />
                    <span>{t('mv.current')}</span>
                  </label>
                )}
                <button
                  className={s.removeBtn}
                  onClick={() => removeAsset(asset.id)}
                  title={t('common.close')}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AssetPanel() {
  const { t } = useTranslation();
  return (
    <div className={s.panel}>
      <h3 className={s.title}>{t('mv.assetLibrary')}</h3>
      <AssetGroup type="audio" />
      <AssetGroup type="video" />
      <AssetGroup type="image" />
      <AssetGroup type="lyrics" />
      <AssetGroup type="font" />
    </div>
  );
}
