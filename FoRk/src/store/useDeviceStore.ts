import { create } from 'zustand';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

export interface DeviceState {
  devices: AudioDevice[];
  selectedInput: string | null;
  selectedOutput: string | null;
  inputLevel: number;
  isMonitoring: boolean;
  sampleRate: number;
  channelCount: number;
  
  setDevices: (devices: AudioDevice[]) => void;
  setSelectedInput: (id: string | null) => void;
  setSelectedOutput: (id: string | null) => void;
  setInputLevel: (level: number) => void;
  setIsMonitoring: (monitoring: boolean) => void;
  setAudioContextInfo: (sampleRate: number, channelCount: number) => void;
  refreshDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedInput: null,
  selectedOutput: null,
  inputLevel: -Infinity,
  isMonitoring: false,
  sampleRate: 48000,
  channelCount: 2,

  setDevices: (devices) => set({ devices }),
  setSelectedInput: (id) => set({ selectedInput: id }),
  setSelectedOutput: (id) => set({ selectedOutput: id }),
  setInputLevel: (level) => set({ inputLevel: level }),
  setIsMonitoring: (monitoring) => set({ isMonitoring: monitoring }),
  setAudioContextInfo: (sampleRate, channelCount) => set({ sampleRate, channelCount }),

  refreshDevices: async () => {
    try {
      // 请求权限以获取设备标签
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      
      const devices: AudioDevice[] = deviceList
        .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'audioinput' ? '麦克风' : '扬声器'} (${d.deviceId.slice(0, 8)}...)`,
          kind: d.kind as 'audioinput' | 'audiooutput',
          groupId: d.groupId,
        }));

      set({ devices });

      // 如果没有选中设备，选择第一个
      const { selectedInput, selectedOutput } = get();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      
      if (!selectedInput && inputs.length > 0) {
        set({ selectedInput: inputs[0].deviceId });
      }
      if (!selectedOutput && outputs.length > 0) {
        set({ selectedOutput: outputs[0].deviceId });
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  },
}));
