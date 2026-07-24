import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { markOpeningIntroSeen, shouldShowOpeningIntro } from "./openingIntroSession";
import "./opening-intro-door-backup.css";

const CORRIDOR = [
  { slug: "py-001", x: -420, y: -80, scale: 0.42, rot: 14 },
  { slug: "py-014", x: -305, y: 48, scale: 0.64, rot: 9 },
  { slug: "py-025", x: -162, y: 148, scale: 0.87, rot: 4 },
  { slug: "py-030", x: 162, y: 148, scale: 0.87, rot: -4 },
  { slug: "py-088", x: 305, y: 48, scale: 0.64, rot: -9 },
  { slug: "py-091", x: 420, y: -80, scale: 0.42, rot: -14 },
];

export default function OpeningIntroDoorBackup({ startBgm }) {
  const [visible, setVisible] = useState(shouldShowOpeningIntro);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const leftDoorRef = useRef(null);
  const rightDoorRef = useRef(null);
  const doorBgRef = useRef(null);
  const doorGlowRef = useRef(null);
  const sealRef = useRef(null);
  const leftRingRef = useRef(null);
  const rightRingRef = useRef(null);
  const eyebrowRef = useRef(null);
  const titleCharsRef = useRef([]);
  const subRef = useRef(null);
  const lightCrackRef = useRef(null);
  const corridorArtsRef = useRef([]);

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startBgm?.();

    gsap.set(leftDoorRef.current, { transformPerspective: 1000, transformOrigin: "left center", rotateY: 0 });
    gsap.set(rightDoorRef.current, { transformPerspective: 1000, transformOrigin: "right center", rotateY: 0 });
    gsap.set(doorBgRef.current, { opacity: 0 });
    gsap.set(corridorArtsRef.current.filter(Boolean), { scale: 0.05, x: 0, y: 0, opacity: 0, rotation: 0 });
    gsap.set(doorGlowRef.current, { opacity: 0 });
    gsap.set(lightCrackRef.current, { scaleY: 0, opacity: 0 });
    gsap.set(sealRef.current, { opacity: 0, scale: 2, rotation: -12 });
    gsap.set(eyebrowRef.current, { opacity: 0, y: 14 });
    gsap.set(titleCharsRef.current.filter(Boolean), { opacity: 0, y: 32, transformOrigin: "50% 100%" });
    gsap.set(subRef.current, { opacity: 0, y: 10 });

    const timeline = gsap.timeline();
    timelineRef.current = timeline;
    timeline
      .from([leftDoorRef.current, rightDoorRef.current], { opacity: 0, duration: 0.28, ease: "power1.out" })
      .to(sealRef.current, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3.5)" }, "+=0.12")
      .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }, "+=0.18")
      .to(titleCharsRef.current.filter(Boolean), { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "back.out(1.6)" }, "-=0.1")
      .to(subRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.1")
      .to({}, { duration: 1.8 })
      .to([leftRingRef.current, rightRingRef.current], { rotation: -16, duration: 0.1, ease: "power2.inOut", yoyo: true, repeat: 5 })
      .to(lightCrackRef.current, { scaleY: 1, opacity: 1, duration: 0.7, ease: "power1.out" }, "+=0.2")
      .to(doorGlowRef.current, { opacity: 0.5, duration: 1, ease: "power1.out" }, "<0.2")
      .to([eyebrowRef.current, ...titleCharsRef.current.filter(Boolean), subRef.current, sealRef.current].filter(Boolean), { opacity: 0, y: -14, duration: 1.4, ease: "power1.inOut", stagger: 0.04 }, "+=0.1")
      .to(leftDoorRef.current, { rotateY: 95, duration: 2.2, ease: "power3.inOut" }, "-=0.5")
      .to(rightDoorRef.current, { rotateY: -95, duration: 2.2, ease: "power3.inOut" }, "<")
      .to(doorBgRef.current, { opacity: 1, duration: 1, ease: "power2.out" }, "<0.3")
      .to(corridorArtsRef.current.filter(Boolean), {
        scale: index => CORRIDOR[index].scale,
        x: index => CORRIDOR[index].x,
        y: index => CORRIDOR[index].y,
        rotation: index => CORRIDOR[index].rot,
        opacity: 1,
        duration: 1.6,
        stagger: { each: 0.07, from: "center" },
        ease: "power2.out",
      }, "<0.2")
      .to({}, { duration: 1.2 })
      .to([doorBgRef.current, lightCrackRef.current, doorGlowRef.current], { opacity: 0, duration: 1.2, ease: "power2.inOut" })
      .to({}, { duration: 0.7 })
      .to(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          markOpeningIntroSeen();
          setVisible(false);
        },
      });

    return () => {
      document.body.style.overflow = originalOverflow;
      timelineRef.current = null;
      timeline.kill();
    };
  }, [startBgm, visible]);

  const skip = () => {
    timelineRef.current?.kill();
    markOpeningIntroSeen();
    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => setVisible(false),
    });
  };

  if (!visible) return null;

  return (
    <div ref={containerRef} className="opening-intro door-intro">
      <button className="intro-skip" type="button" onClick={skip} aria-label="跳过开屏动画" title="跳过">
        <X size={16} /><span>SKIP</span>
      </button>
      <div ref={doorBgRef} className="door-bg" aria-hidden="true">
        <div className="door-corridor-bg" />
        {CORRIDOR.map((item, index) => (
          <img
            key={item.slug}
            ref={element => { corridorArtsRef.current[index] = element; }}
            src={`/images/${item.slug}/primary.webp`}
            alt=""
            className="corridor-art"
          />
        ))}
        <div className="door-bg-overlay" />
      </div>
      <div ref={doorGlowRef} className="door-glow" aria-hidden="true" />
      <div className="door-frame" aria-hidden="true">
        <div ref={leftDoorRef} className="door-panel is-left">
          <img className="door-panel-art" src="/images/py-099/part-1.webp" alt="" />
          <div className="door-studs" />
          <div ref={leftRingRef} className="door-ring" />
          <span ref={sealRef} className="door-seal">平</span>
        </div>
        <div ref={rightDoorRef} className="door-panel is-right">
          <img className="door-panel-art" src="/images/py-099/part-2.webp" alt="" />
          <div className="door-studs" />
          <div ref={rightRingRef} className="door-ring" />
        </div>
      </div>
      <div ref={lightCrackRef} className="door-light-crack" aria-hidden="true" />
      <div className="door-title">
        <span ref={eyebrowRef} className="door-eyebrow">山西临汾 · 国家级非物质文化遗产</span>
        <strong className="door-title-chars">
          {"平阳木版年画".split("").map((character, index) => (
            <span key={character} ref={element => { titleCharsRef.current[index] = element; }}>{character}</span>
          ))}
        </strong>
        <span ref={subRef} className="door-sub">数字馆藏</span>
      </div>
    </div>
  );
}
