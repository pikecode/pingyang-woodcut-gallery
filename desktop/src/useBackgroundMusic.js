import { useCallback, useEffect, useRef, useState } from "react";

const BGM_SOURCE = "/audio/bgm.mp3";
const BGM_VOLUME = 0.38;

export default function useBackgroundMusic() {
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  const cancelFade = useCallback(() => {
    const fade = fadeRef.current;
    if (!fade) return;
    cancelAnimationFrame(fade.frame);
    fadeRef.current = null;
    fade.resolve(false);
  }, []);

  const fadeTo = useCallback((audio, targetVolume, duration) => {
    cancelFade();
    const fromVolume = audio.volume;
    if (duration <= 0 || fromVolume === targetVolume) {
      audio.volume = targetVolume;
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const fade = { frame: 0, resolve };
      fadeRef.current = fade;

      const update = (now) => {
        if (fadeRef.current !== fade) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 0.5 - Math.cos(Math.PI * progress) / 2;
        audio.volume = fromVolume + (targetVolume - fromVolume) * eased;

        if (progress < 1) {
          fade.frame = requestAnimationFrame(update);
          return;
        }

        fadeRef.current = null;
        resolve(true);
      };

      fade.frame = requestAnimationFrame(update);
    });
  }, [cancelFade]);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(BGM_SOURCE);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;
    setStarted(true);
    return audio;
  }, []);

  const startForOpening = useCallback(async () => {
    const existingAudio = audioRef.current;
    const audio = ensureAudio();

    if (existingAudio && audio.volume > 0.01) {
      await fadeTo(audio, 0, 220);
    } else {
      cancelFade();
      audio.volume = 0;
    }

    try {
      audio.currentTime = 0;
    } catch {
      // Some media engines only allow seeking after metadata is available.
    }

    if (mutedRef.current) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {});
    void fadeTo(audio, BGM_VOLUME, 1500);
  }, [cancelFade, ensureAudio, fadeTo]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);

    if (nextMuted) {
      void fadeTo(audio, 0, 320).then((completed) => {
        if (completed && mutedRef.current) audio.pause();
      });
      return;
    }

    audio.play().catch(() => {});
    void fadeTo(audio, BGM_VOLUME, 900);
  }, [fadeTo]);

  useEffect(() => () => {
    cancelFade();
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioRef.current = null;
  }, [cancelFade]);

  return { muted, started, startForOpening, toggle };
}
