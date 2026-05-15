import { MVEffect, RenderContext, AudioData } from './MVEffect';

type ParticleVariant = 'burst' | 'meteor' | 'sakura' | 'rain' | 'firefly';

/** 每种 variant 在 idle（无音频能量）状态下要维持的最少粒子数，避免画面空白。 */
function ambientMin(variant: ParticleVariant): number {
  switch (variant) {
    case 'firefly': return 16;
    case 'sakura':  return 12;
    case 'rain':    return 14;
    case 'meteor':  return 6;
    default:        return 8;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  rotation: number;
  spin: number;
  trail: number;
  drift: number;
}

export class ParticleBurstEffect extends MVEffect {
  readonly type = 'particle-burst';
  readonly name = '粒子爆发';
  readonly description = '音频驱动的粒子爆发效果';

  private particles: Particle[] = [];
  private lastEnergy = 0;

  render(context: RenderContext, audioData: AudioData): void {
    const { ctx, width, height } = context;
    const { frequencyData, sampleRate } = audioData;

    const density = this.getNumberParam('density', 50);
    const speed = this.getNumberParam('speed', 60);
    const baseSize = this.getNumberParam('size', 3);
    const gravity = this.getNumberParam('gravity', 20) * 0.01;
    const variant = this.getStringParam('variant', 'burst') as ParticleVariant;

    const bassEnergy = this.getFrequencyEnergy(frequencyData, 20, 200, sampleRate);
    const midEnergy = this.getFrequencyEnergy(frequencyData, 200, 2000, sampleRate);
    const trebleEnergy = this.getFrequencyEnergy(frequencyData, 2000, 20000, sampleRate);
    const totalEnergy = (bassEnergy + midEnergy + trebleEnergy) / 3;
    const energyDelta = totalEnergy - this.lastEnergy;
    this.lastEnergy = totalEnergy;

    if (energyDelta > 0.025 || totalEnergy > 0.15 || this.particles.length < ambientMin(variant)) {
      const ambientEnergy = Math.max(0.18, totalEnergy);
      const spawnCount = Math.max(4, Math.floor(ambientEnergy * density * (variant === 'firefly' ? 0.6 : 1.5)));
      for (let i = 0; i < spawnCount; i += 1) {
        this.spawnParticle(width, height, ambientEnergy, speed, baseSize, variant);
      }
    }

    if (this.particles.length > 1200) {
      this.particles.splice(0, this.particles.length - 1000);
    }

    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;
      particle.life -= 1;

      switch (variant) {
        case 'meteor':
          particle.vx *= 0.992;
          particle.vy *= 0.992;
          break;
        case 'sakura':
          particle.vx += Math.sin(particle.rotation) * 0.02;
          particle.vy += gravity * 0.4;
          break;
        case 'rain':
          particle.vy += gravity * 1.2;
          break;
        case 'firefly':
          particle.vx += Math.sin((particle.maxLife - particle.life) * 0.08 + particle.drift) * 0.01;
          particle.vy += Math.cos((particle.maxLife - particle.life) * 0.05 + particle.drift) * 0.008;
          break;
        default:
          particle.vy += gravity;
          break;
      }

      const lifeRatio = particle.life / particle.maxLife;
      if (lifeRatio <= 0) return false;

      ctx.save();
      switch (variant) {
        case 'meteor':
          this.drawMeteor(ctx, particle, lifeRatio);
          break;
        case 'sakura':
          this.drawSakura(ctx, particle, lifeRatio);
          break;
        case 'rain':
          this.drawRain(ctx, particle, lifeRatio);
          break;
        case 'firefly':
          this.drawFirefly(ctx, particle, lifeRatio);
          break;
        default:
          this.drawBurst(ctx, particle, lifeRatio);
          break;
      }
      ctx.restore();
      return particle.life > 0;
    });
  }

  private spawnParticle(width: number, height: number, energy: number, speed: number, baseSize: number, variant: ParticleVariant) {
    const hueBase = this.getNumberParam('hue', 210);
    switch (variant) {
      case 'meteor':
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (0.4 + Math.random() * 1.4) * speed * 0.12,
          vy: (-0.2 + Math.random() * 1.2) * speed * 0.08,
          life: 40 + Math.random() * 24,
          maxLife: 64,
          size: baseSize * 0.8,
          hue: hueBase + 10,
          rotation: 0,
          spin: 0,
          trail: 24 + Math.random() * 42,
          drift: Math.random() * Math.PI * 2,
        });
        break;
      case 'sakura':
        this.particles.push({
          x: Math.random() * width,
          y: -20,
          vx: (Math.random() - 0.5) * speed * 0.03,
          vy: (0.3 + Math.random() * 0.4) * speed * 0.03,
          life: 140 + Math.random() * 80,
          maxLife: 220,
          size: baseSize * (0.8 + Math.random() * 1.2),
          hue: 330 + Math.random() * 18,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.08,
          trail: 0,
          drift: Math.random() * Math.PI * 2,
        });
        break;
      case 'rain':
        this.particles.push({
          x: Math.random() * width,
          y: -20,
          vx: (Math.random() - 0.5) * speed * 0.01,
          vy: (1.2 + Math.random() * 0.8) * speed * 0.08,
          life: 36 + Math.random() * 18,
          maxLife: 54,
          size: Math.max(1, baseSize * 0.4),
          hue: 205 + Math.random() * 16,
          rotation: 0,
          spin: 0,
          trail: 18 + Math.random() * 24,
          drift: 0,
        });
        break;
      case 'firefly':
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed * 0.02,
          vy: (Math.random() - 0.5) * speed * 0.02,
          life: 180 + Math.random() * 120,
          maxLife: 280,
          size: baseSize * (0.5 + Math.random()),
          hue: 55 + Math.random() * 25,
          rotation: 0,
          spin: 0,
          trail: 0,
          drift: Math.random() * Math.PI * 2,
        });
        break;
      default:
        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() * 0.5 + 0.5) * speed * energy;
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 60 + Math.random() * 60,
          maxLife: 120,
          size: baseSize * (0.5 + Math.random()) * (1 + energy),
          hue: hueBase + Math.random() * 60 - 30,
          rotation: 0,
          spin: 0,
          trail: 0,
          drift: 0,
        });
        break;
    }
  }

  private drawBurst(ctx: CanvasRenderingContext2D, particle: Particle, lifeRatio: number) {
    const alpha = lifeRatio * 0.9;
    const size = Math.max(1.5, particle.size * lifeRatio);
    ctx.fillStyle = this.getHSL(particle.hue, 85, 68, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = this.getStringParam('glowColor', this.getHSL(particle.hue, 85, 68, alpha * 0.6));
    ctx.shadowBlur = Math.max(1, size * 3);
    ctx.fill();
  }

  private drawMeteor(ctx: CanvasRenderingContext2D, particle: Particle, lifeRatio: number) {
    const gradient = ctx.createLinearGradient(particle.x, particle.y, particle.x - particle.trail, particle.y - particle.trail * 0.45);
    gradient.addColorStop(0, this.getHSL(particle.hue, 90, 70, lifeRatio));
    gradient.addColorStop(1, this.getHSL(particle.hue, 90, 70, 0));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1.2, particle.size * lifeRatio);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x - particle.trail, particle.y - particle.trail * 0.45);
    ctx.shadowColor = this.getStringParam('glowColor', this.getHSL(particle.hue, 90, 70, lifeRatio * 0.5));
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  private drawSakura(ctx: CanvasRenderingContext2D, particle: Particle, lifeRatio: number) {
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = this.getHSL(particle.hue, 75, 82, lifeRatio * 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size * 1.3, particle.size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.getHSL(particle.hue - 6, 82, 92, lifeRatio * 0.55);
    ctx.beginPath();
    ctx.ellipse(-particle.size * 0.2, -particle.size * 0.1, particle.size * 0.45, particle.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRain(ctx: CanvasRenderingContext2D, particle: Particle, lifeRatio: number) {
    ctx.strokeStyle = this.getHSL(particle.hue, 80, 70, lifeRatio * 0.7);
    ctx.lineWidth = particle.size;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x + particle.vx * 1.5, particle.y + particle.trail);
    ctx.stroke();
  }

  private drawFirefly(ctx: CanvasRenderingContext2D, particle: Particle, lifeRatio: number) {
    const pulse = 0.55 + Math.sin((particle.maxLife - particle.life) * 0.15 + particle.drift) * 0.35;
    const alpha = lifeRatio * pulse;
    ctx.fillStyle = this.getHSL(particle.hue, 95, 70, alpha);
    ctx.shadowColor = this.getHSL(particle.hue, 95, 70, alpha * 0.8);
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(1, particle.size * pulse), 0, Math.PI * 2);
    ctx.fill();
  }
}
