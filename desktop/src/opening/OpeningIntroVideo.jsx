import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { markOpeningIntroSeen } from "./openingIntroSession";
import OpeningIntroLivingPainting from "./OpeningIntroLivingPainting";
import "./opening-intro-video.css";

const VIDEO_SOURCE = "/opening/opening-guardian-ai.mp4";
const POSTER_SOURCE = "/opening/opening-guardian-ai-poster.jpg";
const VIDEO_READY_TIMEOUT = 3000;

function waitForVideo(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;

    const done = (ready) => {
      if (settled) return;
      settled = true;
      if (timer !== null) window.clearTimeout(timer);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      resolve(ready);
    };
    const onReady = () => done(true);
    const onError = () => done(false);

    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    timer = window.setTimeout(() => done(video.readyState >= HTMLMediaElement.HAVE_METADATA), VIDEO_READY_TIMEOUT);
  });
}

export default function OpeningIntroVideo({ startBgm, onComplete }) {
  const [fallback, setFallback] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const skipRef = useRef(null);
  const finishedRef = useRef(false);
  const startBgmRef = useRef(startBgm);
  startBgmRef.current = startBgm;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markOpeningIntroSeen();
    onCompleteRef.current?.();
  };

  useLayoutEffect(() => {
    if (fallback) return undefined;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return undefined;

    let cancelled = false;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });

    const context = gsap.context(() => {
      gsap.set(".opening-video-stage", { opacity: 0, scale: 1.015 });
      gsap.set(".opening-video-final", { opacity: 0, y: 20 });
    }, container);

    const start = async () => {
      const ready = await waitForVideo(video);
      if (cancelled || finishedRef.current) return;
      if (!ready) {
        setFallback(true);
        return;
      }

      await startBgmRef.current?.();
      if (cancelled || finishedRef.current) return;

      container.dataset.animationReady = "true";
      container.dataset.sceneAssetsReady = "true";
      container.dataset.videoReady = "true";

      try {
        video.currentTime = 0;
      } catch {
        // Some media engines disallow seeking before full metadata is available.
      }

      try {
        await video.play();
      } catch {
        if (!cancelled && !finishedRef.current) setFallback(true);
        return;
      }

      gsap.timeline({ defaults: { ease: "sine.inOut" } })
        .to(".opening-video-stage", { opacity: 1, scale: 1, duration: 0.72, ease: "power2.out" }, 0)
        .to(".opening-video-final", { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 9.7);
    };

    start();

    return () => {
      cancelled = true;
      document.body.style.overflow = originalOverflow;
      video.pause();
      context.revert();
    };
  }, [fallback]);

  if (fallback) {
    return <OpeningIntroLivingPainting startBgm={startBgm} onComplete={onComplete} />;
  }

  const skip = () => {
    if (finishedRef.current) return;
    videoRef.current?.pause();
    gsap.to(containerRef.current, { opacity: 0, duration: 0.3, ease: "sine.inOut", onComplete: finish });
  };

  const keepDialogFocus = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      skipRef.current?.focus({ preventScroll: true });
    } else if (event.key === "Escape") {
      skip();
    }
  };

  return (
    <div
      ref={containerRef}
      className="opening-intro opening-video-intro"
      data-animation-ready="false"
      data-scene-assets-ready="false"
      data-video-ready="false"
      role="dialog"
      aria-modal="true"
      aria-label="平阳木版年画开屏动画"
      onKeyDown={keepDialogFocus}
    >
      <button ref={skipRef} className="living-skip opening-video-skip" type="button" onClick={skip} aria-label="跳过开屏动画">
        跳过
      </button>

      <div className="opening-video-bg" aria-hidden="true">
        <img src={POSTER_SOURCE} alt="" />
      </div>
      <div className="opening-video-stage" aria-hidden="true">
        <video
          ref={videoRef}
          className="opening-video"
          src={VIDEO_SOURCE}
          poster={POSTER_SOURCE}
          preload="auto"
          muted
          playsInline
          data-opening-critical="true"
          onEnded={() => {
            gsap.to(containerRef.current, { opacity: 0, duration: 0.72, ease: "sine.inOut", onComplete: finish });
          }}
          onError={() => {
            if (!finishedRef.current) setFallback(true);
          }}
        />
      </div>

      <div className="opening-video-vignette" aria-hidden="true" />
      <div className="opening-video-grain" aria-hidden="true" />

      <div className="opening-video-final" aria-hidden="true">
        <span>山西临汾 · 国家级非物质文化遗产</span>
        <strong>平阳木版年画</strong>
        <small>博观集 · 数字馆藏</small>
      </div>
    </div>
  );
}
