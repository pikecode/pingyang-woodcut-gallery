import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./category-select.css";

const CATEGORIES = [
  { name: "全部", desc: "平阳木版年画 · 完整馆藏", count: 55, slug: "py-001", num: "00" },
  { name: "戏曲", desc: "粉墨登场 · 舞台百态",     count: 38, slug: "py-014", num: "01" },
  { name: "神祇", desc: "神灵守护 · 门神百态",     count: 13, slug: "py-087", num: "02" },
  { name: "吉祥", desc: "年节吉庆 · 祈福纹样",     count:  3, slug: "py-095", num: "03" },
  { name: "故事", desc: "人间烟火 · 民俗叙事",     count:  1, slug: "py-030", num: "04" },
];

export default function CategorySelect({ onSelect }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".cat-panel", { opacity: 0, y: 40 });
      gsap.set(".cat-brand", { opacity: 0, y: -16 });
      gsap.set(".cat-prompt", { opacity: 0 });
      gsap.to(".cat-brand", { opacity: 1, y: 0, duration: 0.6, ease: "sine.out", delay: 0.1 });
      gsap.to(".cat-prompt", { opacity: 1, duration: 0.5, ease: "sine.out", delay: 0.4 });
      gsap.to(".cat-panel", {
        opacity: 1, y: 0,
        duration: 0.65, stagger: 0.08, ease: "back.out(1.4)", delay: 0.3,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSelect = (cat) => {
    if (exiting) return;
    setExiting(true);
    const ctx = gsap.context(() => {
      gsap.to(".cat-panel", { opacity: 0, y: -30, duration: 0.35, stagger: 0.04, ease: "sine.inOut" });
      gsap.to(".cat-brand, .cat-prompt", { opacity: 0, duration: 0.3, ease: "sine.inOut" });
      gsap.to(containerRef.current, {
        opacity: 0, duration: 0.4, delay: 0.3, ease: "sine.inOut",
        onComplete: () => onSelect(cat),
      });
    }, containerRef);
    return () => ctx.revert();
  };

  return (
    <div ref={containerRef} className="cat-root">
      <header className="cat-brand">
        <span className="cat-seal">平</span>
        <span className="cat-brand-name">平阳木版年画</span>
      </header>

      <p className="cat-prompt">选择题材，进入馆藏</p>

      <div className="cat-panels">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            className={`cat-panel${hovered === cat.name ? " is-hovered" : ""}${hovered && hovered !== cat.name ? " is-dimmed" : ""}`}
            onClick={() => handleSelect(cat.name)}
            onMouseEnter={() => setHovered(cat.name)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${cat.name}，共${cat.count}件`}
          >
            <img className="cat-panel-bg" src={`/images/${cat.slug}/primary.webp`} alt="" aria-hidden="true" />
            <div className="cat-panel-overlay" />
            <div className="cat-panel-content">
              <span className="cat-num">{cat.num}</span>
              <strong className="cat-name">{cat.name}</strong>
              <span className="cat-count">{cat.count} 件</span>
              <span className="cat-desc">{cat.desc}</span>
            </div>
            <div className="cat-panel-border" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
