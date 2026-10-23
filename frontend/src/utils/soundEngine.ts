/**
 * AuraCare Sound & Voice Engine
 * Pure Web Audio API Synthesizer + Web Speech API (TTS & SpeechRecognition)
 * Zero external audio dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechVolumeLevel: number = 0;
  private animFrameId: number | null = null;
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private getAudioContext(): AudioContext | null {
    if (this.isMuted) return null;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      return null;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Alexa+ Wake Word Chime: Subtle gentle harmonic chime
   */
  public playWakeWordChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.26);
  }

  /**
   * MCP Tool Execution Blip: Very subtle soft tick
   */
  public playToolBlip(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Dose Logged Success Chord: Soft warm major triad
   */
  public playSuccessChord(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.05;
      const duration = 0.35;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  }

  /**
   * Alert Notification: Soft gentle notification tone (harsh siren removed)
   */
  public playAlertSiren(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Speak Alexa+ response out loud using Web Speech API with audio reactivity
   */
  public speak(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ): void {
    if (this.isMuted || !('speechSynthesis' in window)) {
      callbacks?.onStart?.();
      // Simulate speech duration if muted or unsupported
      const estDuration = Math.max(1200, text.length * 55);
      setTimeout(() => {
        callbacks?.onEnd?.();
      }, estDuration);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.name.includes('Samantha') ||
            v.name.includes('Google US English') ||
            v.name.includes('Zira') ||
            v.name.includes('Natural') ||
            v.name.includes('Female')) &&
          v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.pitch = 1.05;
      utterance.rate = 1.02;
      utterance.volume = 1.0;

      // Reactivity simulation loop for 3D orb
      const startReactivity = () => {
        let t = 0;
        const tick = () => {
          t += 0.15;
          // Organic speech modulation wave between 0.3 and 0.95
          this.speechVolumeLevel = 0.4 + 0.5 * Math.abs(Math.sin(t) * Math.cos(t * 1.7));
          this.animFrameId = requestAnimationFrame(tick);
        };
        this.animFrameId = requestAnimationFrame(tick);
      };

      const stopReactivity = () => {
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        this.speechVolumeLevel = 0;
      };

      utterance.onstart = () => {
        startReactivity();
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        stopReactivity();
        this.currentUtterance = null;
        callbacks?.onEnd?.();
      };

      utterance.onerror = () => {
        stopReactivity();
        this.currentUtterance = null;
        callbacks?.onError?.();
        callbacks?.onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      callbacks?.onEnd?.();
    }
  }

  public stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.speechVolumeLevel = 0;
    this.currentUtterance = null;
  }

  public getSpeechReactivityLevel(): number {
    return this.speechVolumeLevel;
  }

  /**
   * Browser Microphone voice recognition
   */
  public startSpeechRecognition(
    onResult: (transcript: string) => void,
    onStatusChange: (isListening: boolean) => void,
    onError?: (err: any) => void
  ): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser.');
      return false;
    }

    try {
      if (this.recognition) {
        this.recognition.stop();
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.playWakeWordChime();
        onStatusChange(true);
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        this.isListening = false;
        onStatusChange(false);
        onError?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onStatusChange(false);
      };

      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      this.isListening = false;
      onStatusChange(false);
      return false;
    }
  }

  public stopSpeechRecognition(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const soundEngine = new SoundEngine();
