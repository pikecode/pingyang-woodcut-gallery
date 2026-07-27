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

export default function OpeningIntroPanorama({ startBgm, onComplete }) {
  const [visible, setVisible] = useState(shouldShowOpeningIntro);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const startBgmRef = useRef(startBgm);
  startBgmRef.current = startBgm;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startBgmRef.current?.();

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      timelineRef.current = timeline;

      gsap.set(".panorama-wordmark-line", { opacity: 1, clipPath: "inset(0 100% 0 0)" }); /* B: 笔触揭幕 */
      gsap.set(".panorama-seal", { opacity: 0, scale: 2.4, rotation: -12, y: -16 });
      gsap.set(".panorama-seal-ring", { scale: 0.6, opacity: 0 }); /* A: 晕染圈 */
      gsap.set(".panorama-flash", { opacity: 0 }); /* C: 换幕闪光 */
      gsap.set(".panorama-swatch", { opacity: 0, x: 14 });
      gsap.set(".panorama-viewport", {
        clipPath: "polygon(43% 7%, 60% 3%, 67% 20%, 64% 39%, 72% 57%, 64% 93%, 44% 97%, 35% 79%, 38% 55%, 31% 31%)",
      });
      gsap.set(".panorama-color-stripe", { scaleY: 0, transformOrigin: "top center" });
      gsap.set(".panorama-opening-copy", { opacity: 0, y: 16 });
      gsap.set(".scene-paper", { scale: 1.035, transformOrigin: "center center" });
      gsap.set(".scene-one .scene-art", { opacity: 0, y: 60, scale: 1.055 });
      gsap.set(".scene-two .scene-art", { opacity: 0, y: 70, scale: 1.055 });
      gsap.set(".scene-three .scene-art", { opacity: 0, x: index => index === 0 ? -150 : index === 2 ? 150 : 0, scale: 1.06 }); /* D: 更大冲入距离 */
      gsap.set(".caption-char", { opacity: 0, y: 14 }); /* IV */
      gsap.set(".scene-glow", { opacity: 0 }); /* V */
      gsap.set(".panorama-curtain", { opacity: 0 });
      gsap.set(".panorama-folio-deck", { opacity: 0 });
      gsap.set(".panorama-folio", { opacity: 0, y: 110, rotation: 0 });
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
        /* B: 逐行笔触揭幕 */
        .to(".panorama-wordmark-line", { clipPath: "inset(0 0% 0 0)", duration: 0.7, stagger: 0.18, ease: "power2.inOut" }, "brand")
        /* A: 印章重击落下 → 弹性回正 + 晕染圈 */
        .to(".panorama-seal", { opacity: 1, scale: 0.85, y: 0, rotation: 0, duration: 0.22, ease: "power4.in" }, "brand+=0.22")
        .to(".panorama-seal", { scale: 1, duration: 0.55, ease: "elastic.out(1.6, 0.45)" }, "brand+=0.44")
        .to(".panorama-seal-ring", { scale: 2.8, opacity: 0.55, duration: 0.22, ease: "power2.out" }, "brand+=0.44")
        .to(".panorama-seal-ring", { opacity: 0, duration: 0.45, ease: "power2.in" }, "brand+=0.6")
        .to(".panorama-swatch", { opacity: 1, x: 0, duration: 0.42, stagger: 0.07, ease: "sine.out" }, "brand+=0.48")
        .to(".panorama-opening-copy", { opacity: 1, y: 0, duration: 0.58, ease: "sine.out" }, "brand+=0.55")
        .to(".panorama-viewport", {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 1.5, ease: "sine.inOut",
        }, "reveal")
        .to(".panorama-color-stripe", { scaleY: 1, duration: 0.72, stagger: 0.055, ease: "sine.inOut" }, "reveal")
        .to(".panorama-color-stripe", { opacity: 0, duration: 0.55, stagger: 0.035, ease: "sine.out" }, "reveal+=0.58")
        .to(".panorama-opening-copy", { opacity: 0, y: -18, duration: 0.5, ease: "sine.inOut" }, "reveal+=0.68")
        /* V: 场景1入场过曝闪光 */
        .to(".scene-one .scene-glow", { opacity: 0.55, duration: 0.12, ease: "none" }, "reveal+=0.15")
        .to(".scene-one .scene-glow", { opacity: 0, duration: 0.5, ease: "power2.out" }, "reveal+=0.27")
        /* III: 前/后景不同视差 — art-water(前) > art-tower(后) */
        .to(".scene-one .scene-art", { opacity: 1, y: 0, scale: 1, duration: 1.3, stagger: 0.12, ease: "back.out(1.4)" }, "reveal+=0.15")
        /* II: 背景形状呼吸 */
        .to(".scene-one .shape-one", { xPercent: 3.2, yPercent: -2.2, scale: 1.04, duration: 3.65, ease: "none" }, "reveal")
        .to(".scene-one .shape-two", { xPercent: -3.4, yPercent: 2.2, scale: 0.96, duration: 3.65, ease: "none" }, "reveal")
        /* IV: 字幕逐字落下 */
        .to(".scene-one .scene-caption > span", { opacity: 1, y: 0, duration: 0.5, ease: "sine.out" }, "reveal+=0.75")
        .to(".scene-one .caption-char", { opacity: 1, y: 0, stagger: 0.08, duration: 0.35, ease: "back.out(1.6)" }, "reveal+=0.88")
        /* III: 漂移时前景幅度更大 */
        .to(".scene-one .art-water", { x: -22, y: -10, rotation: -0.8, duration: 2.1, ease: "none" }, "reveal+=1.5")
        .to(".scene-one .art-romance", { x: 14, y: 9, duration: 2.1, ease: "none" }, "reveal+=1.5")
        .to(".scene-one .art-tower", { x: -8, y: -5, rotation: 0.6, duration: 2.1, ease: "none" }, "reveal+=1.5")
        /* I: 镜头感平移 — 轻微压扁后弹开 */
        .to(".panorama-track", { xPercent: -33.3333, scaleX: 0.975, duration: 0.3, ease: "power3.in" }, "panoramaTwo")
        .to(".panorama-track", { xPercent: -33.3333, scaleX: 1, duration: 1.1, ease: "expo.out" }, "panoramaTwo+=0.3")
        .to(".scene-one .scene-art", { xPercent: -5, scale: 0.98, opacity: 0.45, duration: 1.4, ease: "sine.inOut" }, "panoramaTwo")
        .to(".scene-one .scene-caption, .scene-one .caption-char", { opacity: 0, x: -22, duration: 0.55, ease: "sine.inOut" }, "panoramaTwo+=0.15")
        /* V: 场景2入场过曝 */
        .to(".scene-two .scene-glow", { opacity: 0.5, duration: 0.1, ease: "none" }, "panoramaTwo+=0.28")
        .to(".scene-two .scene-glow", { opacity: 0, duration: 0.45, ease: "power2.out" }, "panoramaTwo+=0.38")
        .to(".scene-two .scene-art", { opacity: 1, y: 0, scale: 1, duration: 1.1, stagger: 0.1, ease: "back.out(1.4)" }, "panoramaTwo+=0.18")
        /* II: 背景形状呼吸 */
        .to(".scene-two .shape-one", { xPercent: -3.2, yPercent: 2.1, scale: 1.05, duration: 3.65, ease: "none" }, "panoramaTwo")
        .to(".scene-two .shape-two", { xPercent: 3.4, yPercent: -2.2, scale: 0.95, duration: 3.65, ease: "none" }, "panoramaTwo")
        /* IV: 字幕逐字 */
        .to(".scene-two .scene-caption > span", { opacity: 1, y: 0, duration: 0.5, ease: "sine.out" }, "panoramaTwo+=0.65")
        .to(".scene-two .caption-char", { opacity: 1, y: 0, stagger: 0.08, duration: 0.35, ease: "back.out(1.6)" }, "panoramaTwo+=0.78")
        /* III: 前/后景视差漂移 */
        .to(".scene-two .art-plum", { x: 18, y: -8, rotation: 0.7, duration: 2.1, ease: "none" }, "panoramaTwo+=1.55")
        .to(".scene-two .art-river", { x: -14, y: 10, duration: 2.1, ease: "none" }, "panoramaTwo+=1.55")
        .to(".scene-two .art-auspicious", { x: 16, y: -9, rotation: -0.5, duration: 2.1, ease: "none" }, "panoramaTwo+=1.55")
        /* I: 镜头感平移 */
        .to(".panorama-track", { xPercent: -66.6667, scaleX: 0.975, duration: 0.3, ease: "power3.in" }, "panoramaThree")
        .to(".panorama-track", { xPercent: -66.6667, scaleX: 1, duration: 1.1, ease: "expo.out" }, "panoramaThree+=0.3")
        .to(".scene-two .scene-art", { xPercent: -5, scale: 0.98, opacity: 0.48, duration: 1.4, ease: "sine.inOut" }, "panoramaThree")
        .to(".scene-two .scene-caption, .scene-two .caption-char", { opacity: 0, x: -22, duration: 0.55, ease: "sine.inOut" }, "panoramaThree+=0.15")
        /* V: 场景3入场过曝 */
        .to(".scene-three .scene-glow", { opacity: 0.45, duration: 0.1, ease: "none" }, "panoramaThree+=0.18")
        .to(".scene-three .scene-glow", { opacity: 0, duration: 0.5, ease: "power2.out" }, "panoramaThree+=0.28")
        /* D: 门神对称冲入 + 过冲弹回 */
        .to(".scene-three .scene-art", { opacity: 1, x: 0, scale: 1, duration: 0.88, stagger: 0.08, ease: "back.out(2.2)" }, "panoramaThree+=0.2")
        /* II: 背景形状呼吸 */
        .to(".scene-three .shape-one", { yPercent: -2.8, scale: 1.04, duration: 3.1, ease: "none" }, "panoramaThree")
        .to(".scene-three .shape-two", { xPercent: 2.8, scale: 0.97, duration: 3.1, ease: "none" }, "panoramaThree")
        /* IV: 字幕逐字 */
        .to(".scene-three .scene-caption > span", { opacity: 1, y: 0, duration: 0.5, ease: "sine.out" }, "panoramaThree+=0.7")
        .to(".scene-three .caption-char", { opacity: 1, y: 0, stagger: 0.08, duration: 0.35, ease: "back.out(1.6)" }, "panoramaThree+=0.83")
        /* III: 门神漂移（对称） */
        .to(".scene-three .scene-art", { x: index => [-13, 8, 13][index], y: index => [-6, 7, -6][index], duration: 1.5, ease: "none" }, "panoramaThree+=1.55")
        .to(".panorama-viewport", {
          clipPath: "polygon(42% 5%, 61% 2%, 69% 18%, 65% 41%, 73% 60%, 63% 95%, 43% 98%, 34% 78%, 38% 55%, 30% 29%)",
          duration: 1.1, ease: "sine.inOut",
        }, "closePanorama")
        .to(".panorama-track", { scale: 0.84, opacity: 0.3, duration: 1.1, transformOrigin: "center center", ease: "sine.inOut" }, "closePanorama")
        .to(".scene-three .scene-caption, .scene-three .caption-char", { opacity: 0, y: -14, duration: 0.55, ease: "sine.inOut" }, "closePanorama+=0.12")
        .to(".panorama-curtain", { opacity: 1, duration: 0.8, ease: "sine.inOut" }, "closePanorama+=0.35")
        .to(".panorama-viewport", { opacity: 0, duration: 0.5, ease: "sine.inOut" }, "closePanorama+=0.72")
        .to(".panorama-folio-deck", { opacity: 1, duration: 0.38, ease: "sine.out" }, "folios")
        /* E: 图录物理扇开 */
        .to(".panorama-folio", {
          opacity: 1, y: 0,
          rotation: index => [-14, 0, 14][index],
          duration: 0.75,
          stagger: 0.14,
          ease: "back.out(2.0)",
        }, "folios+=0.1")
        .to(".panorama-final", { opacity: 1, y: 0, duration: 0.75, ease: "sine.out" }, "finale")
        .to(containerRef.current, {
          opacity: 0,
          duration: 0.65,
          ease: "sine.inOut",
          onComplete: () => {
            markOpeningIntroSeen();
            setVisible(false);
            onCompleteRef.current?.();
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
      opacity: 0, duration: 0.3, ease: "power2.inOut",
      onComplete: () => { setVisible(false); onCompleteRef.current?.(); },
    });
  };

  if (!visible) return null;

  return (
    <div ref={containerRef} className="opening-intro panorama-intro">
      <button className="panorama-skip" type="button" onClick={skip} aria-label="跳过开屏动画">
        跳过
      </button>

      <div className="panorama-paper" aria-hidden="true">
        <div className="panorama-wordmark">
          <span className="panorama-wordmark-line">平阳</span>
          <span className="panorama-wordmark-line">年画</span>
        </div>
        <span className="panorama-seal-ring" aria-hidden="true" />
        <div className="panorama-swatches">
          {SWATCHES.map(color => <span key={color} className="panorama-swatch" style={{ backgroundColor: color }} />)}
        </div>
      </div>

      <div className="panorama-viewport">
        <div className="panorama-track">
          <section className="panorama-scene scene-one" aria-label="戏曲年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <div className="scene-glow" aria-hidden="true" />
            <img className="scene-art art-water" src="/images/py-014/primary.webp" alt="水漫金山" />
            <img className="scene-art art-romance" src="/images/py-005/primary.webp" alt="西厢记" />
            <img className="scene-art art-tower" src="/images/py-016/primary.webp" alt="黄鹤楼" />
            <div className="scene-caption">
              <span>第一幕 · 戏曲</span>
              <strong>{"粉墨入画".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
            </div>
          </section>

          <section className="panorama-scene scene-two" aria-label="民间故事年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <div className="scene-glow" aria-hidden="true" />
            <img className="scene-art art-plum" src="/images/py-030/primary.webp" alt="踏雪寻梅" />
            <img className="scene-art art-river" src="/images/py-038/primary.webp" alt="渭水河" />
            <img className="scene-art art-auspicious" src="/images/py-095/part-1.webp" alt="马莲如意" />
            <div className="scene-caption">
              <span>第二幕 · 故事</span>
              <strong>{"人间有戏".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
            </div>
          </section>

          <section className="panorama-scene scene-three" aria-label="门神年画">
            <div className="scene-paper shape-one" />
            <div className="scene-paper shape-two" />
            <div className="scene-glow" aria-hidden="true" />
            <img className="scene-art guardian-left" src="/images/py-099/part-1.webp" alt="秦琼门神" />
            <img className="scene-art guardian-center" src="/images/py-089/part-1.webp" alt="禄门神" />
            <img className="scene-art guardian-right" src="/images/py-099/part-2.webp" alt="敬德门神" />
            <div className="scene-caption">
              <span>第三幕 · 门神</span>
              <strong>{"守望平阳".split("").map((c, i) => <span key={i} className="caption-char">{c}</span>)}</strong>
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
      <div className="panorama-flash" aria-hidden="true" />
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
        <small>博观集 · 数字馆藏</small>
      </div>
    </div>
  );
}
