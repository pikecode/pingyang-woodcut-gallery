import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { markOpeningIntroSeen } from "./openingIntroSession";
import OpeningIntroLivingPainting from "./OpeningIntroLivingPainting";
import OpeningIntroPanorama from "./OpeningIntroPanorama";
import "./opening-intro-video.css";

const VIDEO_SOURCE = "/opening/opening-guardian-ai.mp4";
const POSTER_SOURCE = "/opening/opening-guardian-ai-poster.jpg";
const END_FRAME_SOURCE = "/opening/opening-guardian-ai-end.jpg";
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
  const [phase, setPhase] = useState("video");
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
    if (phase !== "video") return undefined;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return undefined;

    let cancelled = false;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });

    const context = gsap.context(() => {
      gsap.set(".opening-video-stage", { opacity: 0, scale: 1.015 });
    }, container);

    const start = async () => {
      const ready = await waitForVideo(video);
      if (cancelled || finishedRef.current) return;
      if (!ready) {
        setPhase("fallback");
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
        if (!cancelled && !finishedRef.current) setPhase("fallback");
        return;
      }

      gsap.timeline({ defaults: { ease: "sine.inOut" } })
        .to(".opening-video-stage", { opacity: 1, scale: 1, duration: 0.72, ease: "power2.out" }, 0);
    };

    start();

    return () => {
      cancelled = true;
      document.body.style.overflow = originalOverflow;
      video.pause();
      context.revert();
    };
  }, [phase]);

  if (phase === "fallback") {
    return <OpeningIntroLivingPainting startBgm={startBgm} onComplete={onComplete} />;
  }

  if (phase === "panorama") {
    return (
      <OpeningIntroPanorama
        startBgm={async () => {}}
        onComplete={onComplete}
        handoffFromVideo
        handoffFrameSrc={END_FRAME_SOURCE}
      />
    );
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
    <>
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
              if (!finishedRef.current) setPhase("panorama");
            }}
            onError={() => {
              if (!finishedRef.current) setPhase("fallback");
            }}
          />
        </div>

        <div className="opening-video-vignette" aria-hidden="true" />
        <div className="opening-video-grain" aria-hidden="true" />
      </div>

    </>
  );
}
