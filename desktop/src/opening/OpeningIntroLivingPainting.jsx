import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { markOpeningIntroSeen } from "./openingIntroSession";
import "./opening-intro-living-painting.css";

const IMAGE_READY_TIMEOUT = 2000;
const GUARDIANS = [
  {
    className: "guardian-a",
    src: "/opening/guardian-yuchi.jpg",
    title: "尉迟恭",
    label: "武门神",
  },
  {
    className: "guardian-b",
    src: "/opening/guardian-qin.jpg",
    title: "秦琼",
    label: "文门神",
  },
];

function waitForImage(image) {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

async function decodeOpeningImages(images) {
  await Promise.all(images.map(async (image) => {
    await waitForImage(image);
    if (!image.naturalWidth || typeof image.decode !== "function") return;
    try {
      await image.decode();
    } catch {
      // The load/error event is enough to start a non-blocking intro fallback.
    }
  }));
}

function buildTimeline(container, finish) {
  const timeline = gsap.timeline({ defaults: { ease: "sine.inOut" } });

  timeline
    .set(".living-paper", { opacity: 1 })
    .to(".paper-crack", { opacity: 1, scaleY: 1, duration: 0.78, stagger: 0.08, ease: "power2.out" }, 0.08)
    .to(".paper-spark", { opacity: 0.68, scale: 1, duration: 1.05, stagger: 0.12 }, 0.18)
    .to(".guardian-spread", { opacity: 1, y: 0, scale: 1, duration: 1.15, ease: "power2.out" }, 0.42)
    .to(".guardian-frame", { opacity: 1, y: 0, rotation: index => [-0.8, 0.8][index], duration: 1.1, stagger: 0.1, ease: "power2.out" }, 0.68)
    .to(".guardian-base", { opacity: 1, filter: "saturate(1) contrast(1.02) brightness(1)", duration: 0.98, ease: "sine.out" }, 0.72)
    .to(".living-title-block", { opacity: 1, x: 0, duration: 0.82, ease: "power2.out" }, 1.18)
    .to(".living-title-line", { scaleY: 1, duration: 0.62 }, 1.56)
    .to(".living-seal", { opacity: 1, scale: 1, rotation: 2, duration: 0.56, ease: "power2.out" }, 1.9)
    .to(".guardian-print-grain", { opacity: 0.46, duration: 1.1 }, 1.95)
    .to(".guardian-atmosphere", { opacity: 1, duration: 1.1, stagger: 0.035 }, 2.05)
    .to(".guardian-paint-layer", { opacity: index => [0.22, 0.18, 0.16, 0.2, 0.18, 0.22, 0.18, 0.16, 0.2, 0.18][index], duration: 1.15, stagger: 0.035 }, 2.18)
    .to(".layer-eyes", { x: index => [1.2, -1][index], y: 0.35, opacity: 0.28, duration: 1.8, yoyo: true, repeat: 2 }, 2.75)
    .to(".layer-beard", { x: index => [-0.8, 0.7][index], y: 1.8, rotation: index => [-0.35, 0.28][index], duration: 2.7, yoyo: true, repeat: 1 }, 2.95)
    .to(".layer-tassel", { x: index => [1.7, -1.4][index], y: 1.3, rotation: index => [0.65, -0.55][index], duration: 2.25, yoyo: true, repeat: 2 }, 2.92)
    .to(".layer-ribbon", { x: index => [-1.8, 1.6][index], y: index => [1.4, -1.2][index], rotation: index => [-0.55, 0.48][index], duration: 3.05, yoyo: true, repeat: 1 }, 3)
    .to(".layer-sleeve", { x: index => [-1.4, 1.2][index], y: index => [1.2, -1][index], rotation: index => [-0.42, 0.36][index], duration: 3.15, yoyo: true, repeat: 1 }, 3.08)
    .to(".atmo-ribbon", { x: index => [-3.2, 3, -2.8, 3.2][index], y: index => [2, -2.2, 1.8, -1.6][index], rotation: index => [-0.28, 0.32, -0.24, 0.28][index], duration: 3.4, yoyo: true, repeat: 1 }, 2.2)
    .to(".atmo-lantern", { y: -3, scale: 1.025, opacity: 0.82, duration: 2.9, yoyo: true, repeat: 1, stagger: 0.16 }, 2.32)
    .to(".atmo-wind", { x: 18, opacity: 0.34, duration: 3.8, yoyo: true, repeat: 1, stagger: 0.14 }, 2.45)
    .to(".guardian-frame", { y: index => [-3.5, 3.5][index], scale: 1.006, duration: 4.2, stagger: 0.06 }, 2.55)
    .to(".guardian-base", { filter: "saturate(1.02) contrast(1.025) brightness(1.015)", duration: 5.2 }, 2.65)
    .to(".guardian-caption > span", { opacity: 1, y: 0, duration: 0.66, stagger: 0.1 }, 3.05)
    .to(".living-paper", { filter: "brightness(1.035) saturate(1.03)", duration: 2.7, yoyo: true, repeat: 1 }, 3.1)
    .to(".living-title-block, .guardian-caption", { x: 10, opacity: 0, duration: 1.15 }, 6.05)
    .to(".guardian-spread", { scale: 1.34, x: "-13vw", y: "-1vh", duration: 1.9, ease: "power2.inOut" }, 6.35)
    .to(".guardian-frame", { opacity: 0.9, duration: 1.05 }, 7.46)
    .to(".guardian-paint-layer", { opacity: 0.12, duration: 0.85 }, 8.04)
    .to(".living-curtain", { opacity: 1, duration: 0.95 }, 8.36)
    .to(".living-final", { opacity: 1, y: 0, duration: 0.86, ease: "power2.out" }, 8.76)
    .to(".living-final-seal", { opacity: 1, scale: 1, rotation: 2, duration: 0.52, ease: "power2.out" }, 9.14)
    .to(container, { opacity: 0, duration: 0.72, onComplete: finish }, 10.22);

  return timeline;
}

export default function OpeningIntroLivingPainting({ startBgm, onComplete }) {
  const containerRef = useRef(null);
  const skipRef = useRef(null);
  const timelineRef = useRef(null);
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
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let readyTimer = null;
    let timelineContext = null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });

    const initialContext = gsap.context(() => {
      gsap.set(".guardian-spread", { opacity: 0, y: 30, scale: 0.96 });
      gsap.set(".guardian-frame", { opacity: 0, y: 42, rotation: 0 });
      gsap.set(".guardian-base", { opacity: 0, scale: 1, filter: "saturate(0.94) contrast(1.01) brightness(0.94)" });
      gsap.set(".guardian-atmosphere, .guardian-print-grain, .guardian-paint-layer, .paper-crack", { opacity: 0 });
      gsap.set(".paper-crack", { scaleY: 0.72, transformOrigin: "center center" });
      gsap.set(".paper-spark", { opacity: 0, scale: 0.72 });
      gsap.set(".living-title-block", { opacity: 0, x: 18 });
      gsap.set(".living-title-line", { scaleY: 0, transformOrigin: "top center" });
      gsap.set(".living-seal", { opacity: 0, scale: 1.16, rotation: 5 });
      gsap.set(".guardian-caption > span", { opacity: 0, y: 16 });
      gsap.set(".living-curtain", { opacity: 0 });
      gsap.set(".living-final", { opacity: 0, y: 22 });
      gsap.set(".living-final-seal", { opacity: 0, scale: 1.18, rotation: 5 });
    }, container);

    const startTimeline = async () => {
      const images = [...container.querySelectorAll("img")];
      const criticalImages = images.filter(image => image.dataset.openingCritical === "true");
      const decoded = decodeOpeningImages(criticalImages);
      const timeout = new Promise((resolve) => {
        readyTimer = window.setTimeout(resolve, IMAGE_READY_TIMEOUT);
      });
      await Promise.race([decoded, timeout]);
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      if (cancelled || finishedRef.current) return;

      await startBgmRef.current?.();
      if (cancelled || finishedRef.current) return;

      container.dataset.animationReady = "true";
      container.dataset.sceneAssetsReady = "true";
      timelineContext = gsap.context(() => {
        timelineRef.current = buildTimeline(container, finish);
      }, container);
    };

    startTimeline();

    return () => {
      cancelled = true;
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      document.body.style.overflow = originalOverflow;
      timelineRef.current = null;
      timelineContext?.revert();
      initialContext.revert();
    };
  }, []);

  const skip = () => {
    if (finishedRef.current) return;
    timelineRef.current?.kill();
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
      className="opening-intro living-intro"
      data-animation-ready="false"
      data-scene-assets-ready="false"
      role="dialog"
      aria-modal="true"
      aria-label="平阳木版年画开屏动画"
      onKeyDown={keepDialogFocus}
    >
      <button ref={skipRef} className="living-skip" type="button" onClick={skip} aria-label="跳过开屏动画">
        跳过
      </button>

      <div className="living-paper" aria-hidden="true" />
      <div className="living-paper-detail" aria-hidden="true">
        <span className="paper-crack crack-vertical" />
        <span className="paper-crack crack-horizontal" />
        <span className="paper-crack crack-corner" />
        <span className="paper-spark spark-one" />
        <span className="paper-spark spark-two" />
        <span className="paper-spark spark-three" />
      </div>
      <div className="living-stage" aria-hidden="true">
        <div className="guardian-spread">
          {GUARDIANS.map((guardian) => (
            <figure key={guardian.src} className={`guardian-frame ${guardian.className}`}>
              <img className="guardian-base" src={guardian.src} alt="" loading="eager" decoding="async" fetchpriority="high" data-opening-critical="true" />
              <span className="guardian-atmosphere atmo-ribbon ribbon-left" />
              <span className="guardian-atmosphere atmo-ribbon ribbon-right" />
              <span className="guardian-atmosphere atmo-lantern lantern-one" />
              <span className="guardian-atmosphere atmo-lantern lantern-two" />
              <span className="guardian-atmosphere atmo-wind wind-one" />
              <span className="guardian-atmosphere atmo-wind wind-two" />
              <span className="guardian-paint-layer layer-eyes" />
              <span className="guardian-paint-layer layer-beard" />
              <span className="guardian-paint-layer layer-tassel" />
              <span className="guardian-paint-layer layer-ribbon" />
              <span className="guardian-paint-layer layer-sleeve" />
              <span className="guardian-print-grain" />
              <figcaption>
                <span>{guardian.label}</span>
                <strong>{guardian.title}</strong>
              </figcaption>
            </figure>
          ))}
          <div className="guardian-caption">
            <span>衣袖轻扬</span>
            <span>飘带入风</span>
            <span>门神对幅醒来</span>
          </div>
        </div>

        <div className="living-title-block">
          <span className="living-kicker">馆藏 · 神祇</span>
          <strong>门神对幅</strong>
          <i className="living-title-line" />
          <small>让静止年画里的衣袖、飘带和灯穗慢慢动起来</small>
          <em className="living-seal">平阳</em>
        </div>
      </div>

      <div className="living-curtain" aria-hidden="true" />
      <div className="living-final" aria-hidden="true">
        <span>山西临汾 · 国家级非物质文化遗产</span>
        <div>
          <strong>平阳木版年画</strong>
          <i className="living-final-seal">平阳</i>
        </div>
        <small>博观集 · 数字馆藏</small>
      </div>
    </div>
  );
}
