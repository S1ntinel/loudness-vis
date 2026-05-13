import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEngine } from '../audio/trackEngine';
import { useTrackState } from '../audio/useTrackState';
import TrackItem from './TrackItem';
import s from '../tabs/Record/Record.module.css';

export default function TrackList() {
  const { t } = useTranslation();
  const { tracks, playState, playMode, selectedCount } = useTrackState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFiles(fs: FileList | null) {
    if (!fs) return;
    Array.from(fs).forEach(f => trackEngine.addTrackFromFile(f));
  }

  const isMultiPlaying = playMode === 'multi' && playState === 'playing';
  const isMultiPaused  = playMode === 'multi' && playState === 'paused';
  const multiBtnText =
    isMultiPlaying ? t('record.pauseBtn')
    : isMultiPaused ? t('record.resumeBtn')
    : `${t('record.playSelectedSimple')}${selectedCount > 0 ? ` (${selectedCount})` : ''}`;

  return (
    <>
      <div className={s.listHeader}>
        <button className={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
          {t('record.uploadAudio')}
        </button>
        <input
          type="file" accept="audio/*" multiple hidden ref={fileInputRef}
          onChange={e => onFiles(e.target.files)}
        />

        <div className={s.listHeaderSpacer} />

        {tracks.length > 0 && (
          <>
            <button className={s.miniBtn} onClick={() => trackEngine.selectAll()} disabled={selectedCount === tracks.length}>
              {t('record.selectAll')}
            </button>
            <button className={s.miniBtn} onClick={() => trackEngine.invertSelection()} disabled={tracks.length === 0}>
              {t('record.invertSelect')}
            </button>
            <button className={s.miniBtn} onClick={() => trackEngine.clearSelection()} disabled={selectedCount === 0}>
              {t('record.clearSelect')}
            </button>
            <button
              className={`${s.playMultiBtn} ${isMultiPlaying ? s.playMultiActive : ''}`}
              onClick={() => trackEngine.toggleMulti()}
              disabled={selectedCount === 0 && playMode !== 'multi'}
            >
              {multiBtnText}
            </button>
            {(isMultiPlaying || isMultiPaused) && (
              <button className={s.miniBtn} onClick={() => trackEngine.stopPlayback()}>{t('record.stopBtn')}</button>
            )}
          </>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className={s.recEmpty}>{t('record.emptyTracks')}</div>
      ) : (
        <div className={s.recList}>
          {tracks.map(track => <TrackItem key={track.id} track={track} />)}
        </div>
      )}
    </>
  );
}
