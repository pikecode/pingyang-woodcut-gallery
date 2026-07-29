import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { markOpeningIntroSeen } from "./openingIntroSession";
import "./opening-intro-panorama.css";

const INITIAL_CLIP = "polygon(43% 7%, 60% 3%, 67% 20%, 64% 39%, 72% 57%, 64% 93%, 44% 97%, 35% 79%, 38% 55%, 31% 31%)";
const FULL_CLIP = "polygon(0% 0%, 50% 0%, 100% 0%, 100% 34%, 100% 67%, 100% 100%, 67% 100%, 34% 100%, 0% 100%, 0% 50%)";
const CLOSING_CLIP = "polygon(42% 5%, 61% 2%, 69% 18%, 65% 41%, 73% 60%, 63% 95%, 43% 98%, 34% 78%, 38% 55%, 30% 29%)";
const IMAGE_READY_TIMEOUT = 2000;
const TIMING = {
  paper: 0,
  impression: 0.3,
  register: 1.25,
  longScroll: 2.35,
  panoramaTwo: 4.15,
  panoramaThree: 5.95,
  closePanorama: 7.65,
  folios: 8.25,
  finale: 8.6,
  exit: 10.15,
};

const FOLIOS = [
  { slug: "py-014", title: "水漫金山", theme: "戏曲", color: "is-yellow" },
  { slug: "py-030", title: "踏雪寻梅", theme: "故事", color: "is-blue" },
  { slug: "py-099", title: "秦琼敬德", theme: "门神", color: "is-red" },
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
      // A load/error event is the fallback signal when decode is unavailable or rejects.
    }
  }));
}

function addTimelineLabels(timeline) {
  Object.entries(TIMING).forEach(([label, position]) => timeline.addLabel(label, position));
}

function addPrintmakingPrelude(timeline) {
  timeline
    .to(".ink-art-wrap", { opacity: 1, duration: 0.46, ease: "sine.out" }, "paper")
    .to(".ink-line", { opacity: 0.18, duration: 0.34, ease: "sine.out" }, "paper")
    .to(".ink-pressure", { opacity: 0.62, x: "50vw", duration: 1.04, ease: "power1.inOut" }, "impression")
    .to(".ink-line", { opacity: 0.96, clipPath: "inset(0% 0% 0% 0%)", duration: 1.04, ease: "power1.inOut" }, "impression")
    .to(".ink-pressure", { opacity: 0, duration: 0.28, ease: "sine.out" }, "impression+=0.92")
    .to(".ink-plate-yellow", { opacity: 0.58, duration: 0.22, ease: "sine.out" }, "register")
    .to(".ink-plate-yellow", { x: 0, y: 0, duration: 0.42 }, "register+=0.16")
    .to(".ink-plate-blue", { opacity: 0.54, duration: 0.22, ease: "sine.out" }, "register+=0.18")
    .to(".ink-plate-blue", { x: 0, y: 0, duration: 0.42 }, "register+=0.34")
    .to(".ink-plate-red", { opacity: 0.56, duration: 0.22, ease: "sine.out" }, "register+=0.36")
    .to(".ink-plate-red", { x: 0, y: 0, duration: 0.42 }, "register+=0.52")
    .to(".ink-line", { opacity: 1, duration: 0.38 }, "register+=0.52")
    .to(".ink-meta-kicker, .ink-meta-title, .ink-meta-origin", {
      opacity: 1,
      y: 0,
      duration: 0.42,
      stagger: 0.07,
      ease: "sine.out",
    }, "register+=0.28")
    .to(".ink-meta-rule", { scaleY: 1, duration: 0.44, ease: "sine.out" }, "register+=0.42")
    .to(".ink-meta-seal", { opacity: 1, scale: 1, rotation: 2, duration: 0.38, ease: "power2.out" }, "register+=0.68")
    .to(".panorama-viewport", { opacity: 1, clipPath: FULL_CLIP, duration: 1.18 }, "longScroll")
    .to(".ink-art-wrap", {
      x: "-14vw",
      y: "-1vh",
      scale: 0.678,
      clipPath: "polygon(7% 0%, 100% 4%, 95% 100%, 0% 92%)",
      duration: 1.18,
      ease: "sine.inOut",
    }, "longScroll")
    .to(".ink-meta", { opacity: 0, x: 16, duration: 0.42, ease: "sine.inOut" }, "longScroll+=0.04")
    .to(".ink-art-wrap", { backgroundColor: "rgba(239, 238, 229, 0)", duration: 0.56 }, "longScroll+=0.14")
    .to(".ink-line, .ink-plate", { opacity: 0, duration: 0.32, ease: "sine.inOut" }, "longScroll+=0.8")
    .to(".ink-art-wrap", { "--ghost-opacity": 0, duration: 0.32 }, "longScroll+=0.8");
}

function addFirstScene(timeline) {
  timeline
    .to(".scene-one .art-water", { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.38, ease: "sine.out" }, "longScroll+=1")
    .to(".scene-one .art-romance, .scene-one .art-tower", { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.72, stagger: 0.1, ease: "sine.out" }, "longScroll+=0.9")
    .to(".scene-one .shape-one", { xPercent: 3.2, yPercent: -2.4, scale: 0.97, duration: 2.65 }, "longScroll")
    .to(".scene-one .shape-two", { xPercent: -3, yPercent: 2.5, scale: 1.04, duration: 2.65 }, "longScroll")
    .to(".scene-one .scene-caption > span", { opacity: 1, y: 0, duration: 0.46, ease: "sine.out" }, "longScroll+=0.62")
    .to(".scene-one .caption-char", { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.42, ease: "sine.out" }, "longScroll+=0.73")
    .to(".scene-one .art-water", { x: -18, y: -8, rotation: -0.65, duration: 0.62 }, "longScroll+=1.18")
    .to(".scene-one .art-romance", { x: 12, y: 8, duration: 0.72 }, "longScroll+=1.08")
    .to(".scene-one .art-tower", { x: -7, y: -5, rotation: 0.5, duration: 0.72 }, "longScroll+=1.08");
}

function addSecondScene(timeline) {
  timeline
    .to(".panorama-track", { xPercent: -33.3333, duration: 1.32 }, "panoramaTwo")
    .to(".scene-one .scene-art", { xPercent: -4, scale: 0.99, opacity: 0.46, duration: 1.12 }, "panoramaTwo")
    .to(".scene-one .scene-caption, .scene-one .caption-char", { opacity: 0, x: -18, duration: 0.58 }, "panoramaTwo+=0.1")
    .to(".scene-two .scene-art", { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 1.08, stagger: 0.09, ease: "sine.out" }, "panoramaTwo+=0.16")
    .to(".scene-two .shape-one", { xPercent: -3.2, yPercent: 2.5, scale: 1.04, duration: 2.75 }, "panoramaTwo")
    .to(".scene-two .shape-two", { xPercent: 3.1, yPercent: -2.4, scale: 0.96, duration: 2.75 }, "panoramaTwo")
    .to(".scene-two .scene-caption > span", { opacity: 1, y: 0, duration: 0.46, ease: "sine.out" }, "panoramaTwo+=0.58")
    .to(".scene-two .caption-char", { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.42, ease: "sine.out" }, "panoramaTwo+=0.68")
    .to(".scene-two .art-plum", { x: 17, y: -8, rotation: 0.65, duration: 1.5 }, "panoramaTwo+=0.72")
    .to(".scene-two .art-river", { x: -13, y: 8, duration: 1.5 }, "panoramaTwo+=0.72")
    .to(".scene-two .art-auspicious", { x: 14, y: -7, rotation: -0.5, duration: 1.5 }, "panoramaTwo+=0.72");
}

function addThirdScene(timeline) {
  timeline
    .to(".panorama-track", { xPercent: -66.6667, duration: 1.32 }, "panoramaThree")
    .to(".scene-two .scene-art", { xPercent: -4, scale: 0.99, opacity: 0.48, duration: 1.12 }, "panoramaThree")
    .to(".scene-two .scene-caption, .scene-two .caption-char", { opacity: 0, x: -18, duration: 0.58 }, "panoramaThree+=0.1")
    .to(".scene-three .scene-art", { opacity: 1, x: 0, scale: 1, rotation: 0, duration: 1.08, stagger: 0.09, ease: "sine.out" }, "panoramaThree+=0.16")
    .to(".scene-three .shape-one", { yPercent: -3, scale: 1.04, duration: 2.4 }, "panoramaThree")
    .to(".scene-three .shape-two", { xPercent: 3, scale: 0.97, duration: 2.4 }, "panoramaThree")
    .to(".scene-three .scene-caption > span", { opacity: 1, y: 0, duration: 0.46, ease: "sine.out" }, "panoramaThree+=0.58")
    .to(".scene-three .caption-char", { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.42, ease: "sine.out" }, "panoramaThree+=0.68")
    .to(".scene-three .scene-art", { x: index => [-11, 7, 11][index], y: index => [-5, 6, -5][index], duration: 1.42 }, "panoramaThree+=0.78");
}

function addFinale(timeline, container, finish) {
  timeline
    .to(".panorama-viewport", { clipPath: CLOSING_CLIP, duration: 1.1 }, "closePanorama")
    .to(".panorama-track", { scale: 0.86, opacity: 0.32, duration: 1.1, transformOrigin: "center center" }, "closePanorama")
    .to(".scene-three .scene-caption, .scene-three .caption-char", { opacity: 0, y: -14, duration: 0.58 }, "closePanorama+=0.12")
    .to(".panorama-curtain", { opacity: 1, duration: 0.8 }, "closePanorama+=0.35")
    .to(".panorama-viewport", { opacity: 0, duration: 0.5 }, "closePanorama+=0.72")
    .to(".panorama-folio-deck", { opacity: 1, duration: 0.42, ease: "sine.out" }, "folios")
    .to(".panorama-folio", {
      opacity: 1,
      y: 0,
      rotation: index => [-10, 0, 10][index],
      duration: 0.8,
      stagger: 0.12,
      ease: "power2.out",
    }, "folios+=0.08")
    .to(".panorama-final", { opacity: 1, y: 0, duration: 0.65, ease: "sine.out" }, "finale")
    .to(".panorama-final-seal", { opacity: 1, scale: 1, rotation: 2, duration: 0.42, ease: "power2.out" }, "finale+=0.32")
    .to(container, { opacity: 0, duration: 0.65, onComplete: finish }, "exit");
}

export default function OpeningIntroPanorama({ startBgm, onComplete }) {
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
      gsap.set(".ink-art-wrap", { opacity: 0 });
      gsap.set(".ink-line", { opacity: 0.08, clipPath: "inset(0% 82% 0% 0%)" });
      gsap.set(".ink-pressure", { opacity: 0, x: 0 });
      gsap.set(".ink-plate-yellow", { opacity: 0, x: -9, y: 5 });
      gsap.set(".ink-plate-blue", { opacity: 0, x: 8, y: 9 });
      gsap.set(".ink-plate-red", { opacity: 0, x: 10, y: -7 });
      gsap.set(".ink-meta-kicker, .ink-meta-title, .ink-meta-origin", { opacity: 0, y: 10 });
      gsap.set(".ink-meta-rule", { scaleY: 0, transformOrigin: "top center" });
      gsap.set(".ink-meta-seal", { opacity: 0, scale: 1.16, rotation: 5 });
      gsap.set(".panorama-viewport", { opacity: 0, clipPath: INITIAL_CLIP });
      gsap.set(".scene-paper", { scale: 1.04, transformOrigin: "center center" });
      gsap.set(".scene-one .art-water", { opacity: 0, y: 0, scale: 1, rotation: 0 });
      gsap.set(".scene-one .art-romance, .scene-one .art-tower", { opacity: 0, y: 48, scale: 1.045, rotation: index => [-1.2, 1.2][index] });
      gsap.set(".scene-two .scene-art", { opacity: 0, y: 54, scale: 1.05, rotation: index => [1, 0, -1][index] });
      gsap.set(".scene-three .scene-art", { opacity: 0, x: index => index === 0 ? -82 : index === 2 ? 82 : 0, scale: 1.04, rotation: index => index === 0 ? -1.5 : index === 2 ? 1.5 : 0 });
      gsap.set(".caption-char", { opacity: 0, y: 24, scale: 1.08 });
      gsap.set(".scene-caption > span", { opacity: 0, y: 14 });
      gsap.set(".panorama-curtain", { opacity: 0 });
      gsap.set(".panorama-folio-deck", { opacity: 0 });
      gsap.set(".panorama-folio", { opacity: 0, y: 80, rotation: 0 });
      gsap.set(".panorama-final", { opacity: 0, y: 22 });
      gsap.set(".panorama-final-seal", { opacity: 0, scale: 1.18, rotation: 5 });
    }, container);

    const startTimeline = async () => {
      const images = [...container.querySelectorAll("img")];
      const criticalImages = images.filter(image => image.dataset.openingCritical === "true");
      const deferredImages = images.filter(image => image.dataset.openingCritical !== "true");
      void decodeOpeningImages(deferredImages).then(() => {
        if (!cancelled) container.dataset.sceneAssetsReady = "true";
      });

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
      timelineContext = gsap.context(() => {
        const timeline = gsap.timeline({ defaults: { ease: "sine.inOut" } });
        timelineRef.current = timeline;
        addTimelineLabels(timeline);
        addPrintmakingPrelude(timeline);
        addFirstScene(timeline);
        addSecondScene(timeline);
        addThirdScene(timeline);
        addFinale(timeline, container, finish);
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
      className="opening-intro panorama-intro"
      data-animation-ready="false"
      data-scene-assets-ready="false"
      role="dialog"
      aria-modal="true"
      aria-label="平阳木版年画开屏动画"
      onKeyDown={keepDialogFocus}
    >
      <button ref={skipRef} className="panorama-skip" type="button" onClick={skip} aria-label="跳过开屏动画">
        跳过
      </button>

      <div className="panorama-paper" aria-hidden="true" />

      <div className="ink-stage" aria-hidden="true">
        <div className="ink-art-anchor">
          <div className="ink-art-wrap">
            <span className="ink-plate ink-plate-yellow" />
            <span className="ink-plate ink-plate-blue" />
            <span className="ink-plate ink-plate-red" />
            <img
              className="ink-line"
              src="/opening/py-014-ink.webp"
              alt=""
              loading="eager"
              decoding="async"
              fetchpriority="high"
              data-opening-critical="true"
            />
            <span className="ink-pressure" />
          </div>
        </div>
        <div className="ink-meta">
          <span className="ink-meta-kicker">馆藏 · 戏曲</span>
          <strong className="ink-meta-title">水漫金山</strong>
          <span className="ink-meta-rule" />
          <small className="ink-meta-origin">平阳木版年画</small>
          <i className="ink-meta-seal">平阳</i>
        </div>
      </div>

      <div className="panorama-viewport" aria-hidden="true">
        <div className="panorama-track">
          <section className="panorama-scene scene-one">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art art-water" src="/images/py-014/primary.webp" alt="" loading="eager" decoding="async" fetchpriority="high" data-opening-critical="true" />
            <img className="scene-art art-romance" src="/images/py-005/primary.webp" alt="" loading="eager" decoding="async" fetchpriority="high" data-opening-critical="true" />
            <img className="scene-art art-tower" src="/images/py-016/primary.webp" alt="" loading="eager" decoding="async" fetchpriority="high" data-opening-critical="true" />
            <div className="scene-caption">
              <span>第一幕 · 戏曲</span>
              <strong>{"粉墨入画".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
            </div>
          </section>

          <section className="panorama-scene scene-two">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art art-plum" src="/images/py-030/primary.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <img className="scene-art art-river" src="/images/py-038/primary.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <img className="scene-art art-auspicious" src="/images/py-095/part-1.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <div className="scene-caption">
              <span>第二幕 · 人间</span>
              <strong>{"人间有戏".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
            </div>
          </section>

          <section className="panorama-scene scene-three">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art guardian-left" src="/images/py-099/part-1.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <img className="scene-art guardian-center" src="/images/py-089/part-1.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <img className="scene-art guardian-right" src="/images/py-099/part-2.webp" alt="" loading="eager" decoding="async" fetchpriority="low" />
            <div className="scene-caption">
              <span>第三幕 · 门神</span>
              <strong>{"守望平阳".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
            </div>
          </section>
        </div>

      </div>

      <div className="panorama-curtain" aria-hidden="true" />
      <div className="panorama-folio-deck" aria-hidden="true">
        {FOLIOS.map(folio => (
          <figure key={folio.slug} className={`panorama-folio ${folio.color}`}>
            <span className="folio-theme">{folio.theme}</span>
            <img
              src={`/images/${folio.slug}/${folio.slug === "py-099" ? "part-1" : "primary"}.webp`}
              alt=""
              loading="eager"
              decoding="async"
              fetchpriority="low"
            />
            <figcaption>{folio.title}</figcaption>
          </figure>
        ))}
      </div>

      <div className="panorama-final" aria-hidden="true">
        <span>山西临汾 · 国家级非物质文化遗产</span>
        <div className="panorama-final-title-row">
          <strong>平阳木版年画</strong>
          <i className="panorama-final-seal">平阳</i>
        </div>
        <small>博观集 · 数字馆藏</small>
      </div>
    </div>
  );
}
