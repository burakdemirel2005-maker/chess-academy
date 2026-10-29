export type ChessSoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameEnd'
  | 'success'
  | 'error';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public play(type: ChessSoundType): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'move': {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.065);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }
        case 'capture': {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(85, now + 0.09);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.095);
          break;
        }
        case 'check': {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880, now + 0.07); // A5
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.23);
          break;
        }
        case 'castle': {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.setValueAtTime(320, now + 0.07);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.17);
          break;
        }
        case 'promote':
        case 'success': {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.33);
          break;
        }
        case 'error': {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(165, now + 0.1);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.23);
          break;
        }
        case 'gameEnd': {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554.37, now + 0.1);
          osc.frequency.setValueAtTime(659.25, now + 0.2);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.46);
          break;
        }
      }
    } catch {
      // Ignore audio errors when autoplay blocked
    }
  }
}

export const soundService = new SoundService();
