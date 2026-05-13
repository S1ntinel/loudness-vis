// PCM 16-bit WAV 编码：AudioBuffer → Blob
export function audioBufferToWav(buf: AudioBuffer): Blob {
  const numCh = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const length = buf.length * numCh * 2 + 44;
  const ab = new ArrayBuffer(length);
  const view = new DataView(ab);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeStr(view, 8, 'WAVE');
  // fmt chunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);             // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  // data chunk
  writeStr(view, 36, 'data');
  view.setUint32(40, buf.length * numCh * 2, true);

  // PCM samples（交错）
  let off = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));
  for (let i = 0; i < buf.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

function writeStr(view: DataView, off: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
}

/** webm/opus blob → wav blob（用 ctx.decodeAudioData 解码再编码） */
export async function blobToWav(blob: Blob, ctx: AudioContext): Promise<Blob> {
  const arr = await blob.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr);
  return audioBufferToWav(buf);
}
