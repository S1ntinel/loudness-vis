import { useRef } from 'react';
import { trackEngine } from '../audio/trackEngine';
import { useTrackState } from '../audio/useTrackState';
import TrackItem from './TrackItem';
import s from '../tabs/Record/Record.module.css';

export default function TrackList() {
  const { tracks, playState, playMode, selectedCount } = useTrackState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFiles(fs: FileList | null) {
    if (!fs) return;
    Array.from(fs).forEach(f => trackEngine.addTrackFromFile(f));
  }

  const isMultiPlaying = playMode === 'multi' && playState === 'playing';
  const isMultiPaused  = playMode === 'multi' && playState === 'paused';
  const multiBtnText =
    isMultiPlaying ? '⏸ 暂停'
    : isMultiPaused ? '▶ 继续'
    : `▶ 播放选中${selectedCount > 0 ? ` (${selectedCount})` : ''}`;

  return (
    <>
      <div className={s.listHeader}>
        <button className={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
          + 上传音频
        </button>
        <input
          type="file" accept="audio/*" multiple hidden ref={fileInputRef}
          onChange={e => onFiles(e.target.files)}
        />

        <div className={s.listHeaderSpacer} />

        {tracks.length > 0 && (
          <>
            <button className={s.miniBtn} onClick={() => trackEngine.selectAll()} disabled={selectedCount === tracks.length}>
              全选
            </button>
            <button className={s.miniBtn} onClick={() => trackEngine.invertSelection()} disabled={tracks.length === 0}>
              反选
            </button>
            <button className={s.miniBtn} onClick={() => trackEngine.clearSelection()} disabled={selectedCount === 0}>
              清除
            </button>
            <button
              className={`${s.playMultiBtn} ${isMultiPlaying ? s.playMultiActive : ''}`}
              onClick={() => trackEngine.toggleMulti()}
              disabled={selectedCount === 0 && playMode !== 'multi'}
            >
              {multiBtnText}
            </button>
            {(isMultiPlaying || isMultiPaused) && (
              <button className={s.miniBtn} onClick={() => trackEngine.stopPlayback()}>■ 停止</button>
            )}
          </>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className={s.recEmpty}>暂无轨道（用左侧按钮录制 / 用上方按钮上传音频）</div>
      ) : (
        <div className={s.recList}>
          {tracks.map(t => <TrackItem key={t.id} track={t} />)}
        </div>
      )}
    </>
  );
}
