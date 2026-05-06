import { useEffect, useState } from 'react';
import { recordEngine } from './recordEngine';

export function useRecordState() {
  const [tick, setTick] = useState(0);
  useEffect(() => recordEngine.subscribe(() => setTick(v => v + 1)), []);
  return {
    isRecording: recordEngine.isRecording,
    isPaused: recordEngine.isPaused,
    permissionState: recordEngine.permissionState,
    recordings: recordEngine.recordings,
    _tick: tick,
  };
}
