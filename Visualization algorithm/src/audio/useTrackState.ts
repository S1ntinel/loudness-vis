import { useEffect, useState } from 'react';
import { trackEngine } from './trackEngine';

export function useTrackState() {
  const [tick, setTick] = useState(0);
  useEffect(() => trackEngine.subscribe(() => setTick(v => v + 1)), []);
  return {
    isRecording: trackEngine.isRecording,
    isPaused: trackEngine.isPaused,
    permissionState: trackEngine.permissionState,
    tracks: trackEngine.tracks,
    playState: trackEngine.playState,
    playMode: trackEngine.playCtx?.mode || null,
    playingIds: trackEngine.playCtx?.trackIds || [],
    selectedCount: trackEngine.getSelectedCount(),
    recordingLabel: trackEngine.currentRecordingLabel,
    _tick: tick,
  };
}

