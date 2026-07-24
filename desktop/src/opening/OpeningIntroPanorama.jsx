import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { markOpeningIntroSeen, shouldShowOpeningIntro } from "./openingIntroSession";
import "./opening-intro-panorama.css";

const SWATCHES = ["#e0b72f", "#9bbd42", "#cf4f65", "#54bfc0", "#d85f2f", "#3978a8"];

const FOLIOS = [
  { slug: "py-014", title: "水漫金山", theme: "戏曲", color: "is-yellow" },
  { slug: "py-030", title: "踏雪寻梅", theme: "故事", color: "is-blue" },
  { slug: "py-099", title: "秦琼敬德", theme: "门神", color: "is-red" },
];

export default function OpeningIntroPanorama({ startBgm }) {
  const [visible, setVisible] = useState(shouldShowOpeningIntro);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const startBgmRef = useRef(startBgm);
  startBgmRef.current = startBgm;

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startBgmRef.current?.();

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      timelineRef.current = timeline;

      gsap.set(".panorama-wordmark-line", { opacity: 0, y: 24 });
      gsap.set(".panorama-seal", { opacity: 0, scale: 1.8, rotation: -10 });
      gsap.set(".panorama-swatch", { opacity: 0, x: 14 });
      gsap.set(".panorama-viewport", {
        clipPath: "polygon(43% 7%, 60% 3%, 67% 20%, 64% 39%, 72% 57%, 64% 93%, 44% 97%, 35% 79%, 38% 55%, 31% 31%)",
      });
      gsap.set(".panorama-color-stripe", { scaleY: 0, transformOrigin: "top center" });
      gsap.set(".panorama-opening-copy", { opacity: 0, y: 16 });
      gsap.set(".scene-paper", { scale: 1.035, transformOrigin: "center center" });
      gsap.set(".scene-one .scene-art", { opacity: 0, y: 60, scale: 1.055 });
      gsap.set(".scene-two .scene-art", { opacity: 0, y: 70, scale: 1.055 });
      gsap.set(".scene-three .scene-art", { opacity: 0, x: index => index === 0 ? -90 : index === 2 ? 90 : 0, scale: 1.04 });
      gsap.set(".scene-caption", { opacity: 0, y: 22 });
      gsap.set(".panorama-curtain", { opacity: 0 });
      gsap.set(".panorama-folio-deck", { opacity: 0 });
      gsap.set(".panorama-folio", { opacity: 0, y: 100, rotation: 0 });
      gsap.set(".panorama-final", { opacity: 0, y: 28 });

      timeline
        .addLabel("brand", 0)
        .addLabel("reveal", 0.65)
        .addLabel("panoramaTwo", 2.8)
        .addLabel("panoramaThree", 5.05)
        .addLabel("closePanorama", 7.25)
        .addLabel("folios", 8.15)
        .addLabel("finale", 8.55)
        .addLabel("exit", 9.8)
        .to(".panorama-wordmark-line", { opacity: 1, y: 0, duration: 0.85, stagger: 0.12, ease: "sine.out" }, "brand")
        .to(".panorama-seal", { opacity: 1, scale: 1, rotation: 0, duration: 0.58, ease: "back.out(1.8)" }, "brand+=0.18")
        .to(".panorama-swatch", { opacity: 1, x: 0, duration: 0.42, stagger: 0.07, ease: "sine.out" }, "brand+=0.34")
        .to(".panorama-opening-copy", { opacity: 1, y: 0, duration: 0.58, ease: "sine.out" }, "brand+=0.42")
        .to(".panorama-viewport", {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 1.5,
          ease: "sine.inOut",
        }, "reveal")
        .to(".panorama-color-stripe", { scaleY: 1, duration: 0.72, stagger: 0.055, ease: "sine.inOut" }, "reveal")
        .to(".panorama-color-stripe", { opacity: 0, duration: 0.55, stagger: 0.035, ease: "sine.out" }, "reveal+=0.58")
        .to(".panorama-opening-copy", { opacity: 0, y: -18, duration: 0.5, ease: "sine.inOut" }, "reveal+=0.68")
        .to(".scene-one .scene-art", { opacity: 1, y: 0, scale: 1, duration: 1.3, stagger: 0.12, ease: "sine.out" }, "reveal+=0.15")
        .to(".scene-one .scene-caption", { opacity: 1, y: 0, duration: 0.65, ease: "sine.out" }, "reveal+=0.75")
        .to(".scene-one .shape-one", { xPercent: 3.2, yPercent: -2.2, scale: 1, duration: 3.65, ease: "none" }, "reveal")
        .to(".scene-one .shape-two", { xPercent: -3.4, yPercent: 2.2, scale: 1, duration: 3.65, ease: "none" }, "reveal")
        .to(".scene-one .scene-art", {
          x: index => [-16, 12, -10][index],
          y: index => [-8, 9, -6][index],
          duration: 2.1,
          ease: "none",
        }, "reveal+=1.5")
        .to(".panorama-track", { xPercent: -33.3333, duration: 1.5, ease: "sine.inOut" }, "panoramaTwo")
        .to(".scene-one .scene-art", { xPercent: -5, scale: 0.98, opacity: 0.45, duration: 1.5, ease: "sine.inOut" }, "panoramaTwo")
        .to(".scene-one .scene-caption", { opacity: 0, x: -22, duration: 0.72, ease: "sine.inOut" }, "panoramaTwo+=0.15")
        .to(".scene-two .scene-art", { opacity: 1, y: 0, scale: 1, duration: 1.1, stagger: 0.1, ease: "sine.out" }, "panoramaTwo+=0.18")
        .to(".scene-two .scene-caption", { opacity: 1, y: 0, duration: 0.65, ease: "sine.out" }, "panoramaTwo+=0.65")
        .to(".scene-two .shape-one", { xPercent: -3.2, yPercent: 2.1, scale: 1, duration: 3.65, ease: "none" }, "panoramaTwo")
        .to(".scene-two .shape-two", { xPercent: 3.4, yPercent: -2.2, scale: 1, duration: 3.65, ease: "none" }, "panoramaTwo")
        .to(".scene-two .scene-art", {
          x: index => [14, -12, 16][index],
          y: index => [-7, 8, -9][index],
          duration: 2.1,
          ease: "none",
        }, "panoramaTwo+=1.55")
        .to(".panorama-track", { xPercent: -66.6667, duration: 1.5, ease: "sine.inOut" }, "panoramaThree")
        .to(".scene-two .scene-art", { xPercent: -5, scale: 0.98, opacity: 0.48, duration: 1.5, ease: "sine.inOut" }, "panoramaThree")
        .to(".scene-two .scene-caption", { opacity: 0, x: -22, duration: 0.72, ease: "sine.inOut" }, "panoramaThree+=0.15")
        .to(".scene-three .scene-art", { opacity: 1, x: 0, scale: 1, duration: 1.18, stagger: 0.1, ease: "sine.out" }, "panoramaThree+=0.2")
        .to(".scene-three .scene-caption", { opacity: 1, y: 0, duration: 0.65, ease: "sine.out" }, "panoramaThree+=0.7")
        .to(".scene-three .shape-one", { yPercent: -2.8, scale: 1, duration: 3.1, ease: "none" }, "panoramaThree")
        .to(".scene-three .shape-two", { xPercent: 2.8, scale: 1, duration: 3.1, ease: "none" }, "panoramaThree")
        .to(".scene-three .scene-art", {
          x: index => [-13, 8, 13][index],
          y: index => [-6, 7, -6][index],
          duration: 1.5,
          ease: "none",
        }, "panoramaThree+=1.55")
        .to(".panorama-viewport", {
          clipPath: "polygon(42% 5%, 61% 2%, 69% 18%, 65% 41%, 73% 60%, 63% 95%, 43% 98%, 34% 78%, 38% 55%, 30% 29%)",
          duration: 1.1,
          ease: "sine.inOut",
        }, "closePanorama")
        .to(".panorama-track", { scale: 0.84, opacity: 0.3, duration: 1.1, transformOrigin: "center center", ease: "sine.inOut" }, "closePanorama")
        .to(".scene-three .scene-caption", { opacity: 0, y: -14, duration: 0.55, ease: "sine.inOut" }, "closePanorama+=0.12")
        .to(".panorama-curtain", { opacity: 1, duration: 0.8, ease: "sine.inOut" }, "closePanorama+=0.35")
        .to(".panorama-viewport", { opacity: 0, duration: 0.5, ease: "sine.inOut" }, "closePanorama+=0.72")
        .to(".panorama-folio-deck", { opacity: 1, duration: 0.38, ease: "sine.out" }, "folios")
        .to(".panorama-folio", {
          opacity: 1,
          y: 0,
          rotation: index => [-7, 0, 7][index],
          duration: 0.82,
          stagger: 0.11,
          ease: "back.out(1.25)",
        }, "folios+=0.1")
        .to(".panorama-final", { opacity: 1, y: 0, duration: 0.75, ease: "sine.out" }, "finale")
        .to(containerRef.current, {
          opacity: 0,
          duration: 0.65,
          ease: "sine.inOut",
          onComplete: () => {
            markOpeningIntroSeen();
            setVisible(false);
          },
        }, "exit");
    }, containerRef);

    return () => {
      document.body.style.overflow = originalOverflow;
      timelineRef.current = null;
      context.revert();
    };
  }, [visible]);

  const skip = () => {
    timelineRef.current?.kill();
    markOpeningIntroSeen();
    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
      onComplete: () => setVisible(false),
    });
  };

  if (!visible) return null;

  return (
    <div ref={containerRef} className="opening-intro panorama-intro">
      <button className="panorama-skip" type="button" onClick={skip} aria-label="跳过开屏动画" title="跳过">
        <X size={18} />
      </button>

      <div className="panorama-paper" aria-hidden="true">
        <div className="panorama-wordmark">
          <span className="panorama-wordmark-line">平阳</span>
          <span className="panorama-wordmark-line">年画</span>
        </div>
        <span className="panorama-seal">平</span>
        <div className="panorama-swatches">
          {SWATCHES.map(color => <span key={color} className="panorama-swatch" style={{ backgroundColor: color }} />)}
        </div>
      </div>

      <div className="panorama-viewport">
        <div className="panorama-track">
          <section className="panorama-scene scene-one" aria-label="戏曲年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art art-water" src="/images/py-014/primary.webp" alt="水漫金山" />
            <img className="scene-art art-romance" src="/images/py-005/primary.webp" alt="西厢记" />
            <img className="scene-art art-tower" src="/images/py-016/primary.webp" alt="黄鹤楼" />
            <div className="scene-caption">
              <span>第一幕 · 戏曲</span>
              <strong>粉墨入画</strong>
            </div>
          </section>

          <section className="panorama-scene scene-two" aria-label="民间故事年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art art-plum" src="/images/py-030/primary.webp" alt="踏雪寻梅" />
            <img className="scene-art art-river" src="/images/py-038/primary.webp" alt="渭水河" />
            <img className="scene-art art-auspicious" src="/images/py-095/part-1.webp" alt="马莲如意" />
            <div className="scene-caption">
              <span>第二幕 · 故事</span>
              <strong>人间有戏</strong>
            </div>
          </section>

          <section className="panorama-scene scene-three" aria-label="门神年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <img className="scene-art guardian-left" src="/images/py-099/part-1.webp" alt="秦琼门神" />
            <img className="scene-art guardian-center" src="/images/py-089/part-1.webp" alt="禄门神" />
            <img className="scene-art guardian-right" src="/images/py-099/part-2.webp" alt="敬德门神" />
            <div className="scene-caption">
              <span>第三幕 · 门神</span>
              <strong>守望平阳</strong>
            </div>
          </section>
        </div>

        <div className="panorama-color-wipe" aria-hidden="true">
          {SWATCHES.map(color => <span key={color} className="panorama-color-stripe" style={{ backgroundColor: color }} />)}
        </div>
      </div>

      <div className="panorama-opening-copy" aria-hidden="true">
        <span>木版套色</span>
        <strong>一版见天地</strong>
      </div>

      <div className="panorama-curtain" aria-hidden="true" />
      <div className="panorama-folio-deck" aria-hidden="true">
        {FOLIOS.map(folio => (
          <figure key={folio.slug} className={`panorama-folio ${folio.color}`}>
            <span className="folio-theme">{folio.theme}</span>
            <img src={`/images/${folio.slug}/${folio.slug === "py-099" ? "part-1" : "primary"}.webp`} alt="" />
            <figcaption>{folio.title}</figcaption>
          </figure>
        ))}
      </div>

      <div className="panorama-final">
        <span>山西临汾 · 国家级非物质文化遗产</span>
        <strong>平阳木版年画</strong>
        <small>数字馆藏</small>
      </div>
    </div>
  );
}
