import { MVEffect, RenderContext, AudioData } from './MVEffect';

export class BackgroundGradientEffect extends MVEffect {
  readonly type = 'background-gradient';
  readonly name = '动态背景';
  readonly description = '随音频变化的动态渐变背景';
  
  private hueOffset: number = 0;
  
  render(context: RenderContext, audioData: AudioData): void {
    const { ctx, width, height, time } = context;
    const { frequencyData, sampleRate } = audioData;
    
    const style = this.getNumberParam('style', 0);
    const speed = this.getNumberParam('speed', 10) * 0.001;
    const audioReactive = this.getBooleanParam('audioReactive', true);
    
    // 计算整体能量
    const bassEnergy = this.getFrequencyEnergy(frequencyData, 20, 200, sampleRate);
    const midEnergy = this.getFrequencyEnergy(frequencyData, 200, 2000, sampleRate);
    const totalEnergy = audioReactive ? (bassEnergy + midEnergy) / 2 : 0.12;
    
    this.hueOffset += speed + totalEnergy * 0.02;
    
    const baseHue = this.getNumberParam('hue', 210) + this.hueOffset * 10;
    const saturation = this.getNumberParam('saturation', 70);
    const brightness = Math.max(10, this.getNumberParam('brightness', 24) + totalEnergy * 30);
    
    switch (style) {
      case 0: // 径向渐变
        this.renderRadialGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy);
        break;
      case 1: // 线性渐变
        this.renderLinearGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy);
        break;
      case 2: // 网格渐变
        this.renderGridGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy);
        break;
      case 3: // 波浪渐变
        this.renderWaveGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy, time);
        break;
      case 4: // 星空渐变
        this.renderStarGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy, time);
        break;
      default:
        this.renderRadialGradient(ctx, width, height, baseHue, saturation, brightness, totalEnergy);
    }
  }
  
  private renderRadialGradient(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    hue: number, saturation: number, brightness: number,
    energy: number
  ) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    
     gradient.addColorStop(0, this.getStringParam('primaryColor', this.getHSL(hue, saturation, brightness + 20)));
     gradient.addColorStop(0.55, this.getStringParam('secondaryColor', this.getHSL(hue + 30, saturation, brightness)));
     gradient.addColorStop(1, this.getStringParam('backgroundColor', this.getHSL(hue + 60, saturation, Math.max(5, brightness - 20))));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  private renderLinearGradient(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    hue: number, saturation: number, brightness: number,
    energy: number
  ) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    
     gradient.addColorStop(0, this.getStringParam('backgroundColor', this.getHSL(hue, saturation, brightness)));
     gradient.addColorStop(0.5, this.getStringParam('primaryColor', this.getHSL(hue + 40, saturation, brightness + 10)));
     gradient.addColorStop(1, this.getStringParam('secondaryColor', this.getHSL(hue + 80, saturation, Math.max(5, brightness - 10))));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  private renderGridGradient(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    hue: number, saturation: number, brightness: number,
    energy: number
  ) {
    // 绘制网格渐变
    const gridSize = 50 + energy * 30;
    
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        const dist = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2));
        const maxDist = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
        const t = dist / maxDist;
        
        const cellHue = hue + t * 60 + (x / width) * 30;
        const cellBrightness = brightness + (1 - t) * 20 + energy * 20;
        
         ctx.fillStyle = this.getHSL(cellHue, saturation, cellBrightness, 0.72);
        ctx.fillRect(x, y, gridSize - 2, gridSize - 2);
      }
    }
  }
  
  private renderWaveGradient(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    hue: number, saturation: number, brightness: number,
    energy: number, time: number
  ) {
    for (let y = 0; y < height; y += 4) {
      const wave = Math.sin(y * 0.01 + time * 2) * 0.5 + 0.5;
      const rowHue = hue + wave * 60 + (y / height) * 40;
      const rowBrightness = brightness + wave * 20 + energy * 15;
      
       ctx.fillStyle = this.getHSL(rowHue, saturation, rowBrightness);
      ctx.fillRect(0, y, width, 4);
    }
  }
  
  private renderStarGradient(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    hue: number, saturation: number, brightness: number,
    energy: number, time: number
  ) {
    // 深色背景
     ctx.fillStyle = this.getStringParam('backgroundColor', this.getHSL(hue, saturation, Math.max(5, brightness - 30)));
    ctx.fillRect(0, 0, width, height);
    
    // 绘制星星
    const starCount = 50 + Math.floor(energy * 100);
    for (let i = 0; i < starCount; i++) {
      const x = (Math.sin(i * 137.5 + time * 0.1) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 73.3 + time * 0.15) * 0.5 + 0.5) * height;
      const size = 1 + Math.sin(i + time) * 1 + energy * 2;
      const alpha = 0.3 + Math.sin(i * 2 + time * 2) * 0.3 + energy * 0.4;
      
      ctx.fillStyle = this.getHSL(hue + i * 2, saturation, brightness + 40, alpha);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
