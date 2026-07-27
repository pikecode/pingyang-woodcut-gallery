import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Volume2, VolumeX } from "lucide-react";
import "./category-select.css";

const CATEGORIES = [
  { name: "戏曲", desc: "粉墨登场 · 舞台百态",   count: 38, slug: "py-014", num: "01" },
  { name: "神祇", desc: "神灵守护 · 门神百态",   count: 13, slug: "py-087", num: "02" },
  { name: "吉祥", desc: "年节吉庆 · 祈福纹样",   count:  3, slug: "py-025", num: "03" },
  { name: "故事", desc: "人间烟火 · 民俗叙事",   count:  1, slug: "py-030", num: "04" },
];

export default function CategorySelect({ onSelect, toggleBgm, bgmMuted, bgmStarted }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".cat-header", { opacity: 0, y: -20 });
      gsap.set(".cat-panel", { opacity: 0, scaleY: 0.88, transformOrigin: "bottom center" });
      gsap.to(".cat-header", { opacity: 1, y: 0, duration: 0.6, ease: "sine.out", delay: 0.15 });
      gsap.to(".cat-panel", {
        opacity: 1, scaleY: 1,
        duration: 0.7, stagger: 0.09, ease: "back.out(1.2)", delay: 0.25,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSelect = (cat) => {
    if (exiting) return;
    setExiting(true);
    const ctx = gsap.context(() => {
      gsap.to(".cat-panel", { opacity: 0, y: 30, duration: 0.3, stagger: 0.05, ease: "sine.in" });
      gsap.to(".cat-header", { opacity: 0, duration: 0.25, ease: "sine.in" });
      gsap.to(containerRef.current, {
        opacity: 0, duration: 0.35, delay: 0.28, ease: "sine.inOut",
        onComplete: () => onSelect(cat),
      });
    }, containerRef);
    return () => ctx.revert();
  };

  return (
    <div ref={containerRef} className="cat-root">
      <header className="cat-header">
        <span className="cat-brand-name">平阳木版年画 · 博观集</span>
        <span className="cat-subtitle">选择题材，开始探索</span>
      </header>

      {bgmStarted && (
        <button className="cat-bgm-btn" onClick={toggleBgm} aria-label={bgmMuted ? "开启音乐" : "关闭音乐"} title={bgmMuted ? "开启音乐" : "关闭音乐"}>
          {bgmMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

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
            {/* 藏品背景图（始终可见，hover更亮）*/}
            <img className="cat-bg" src={`/images/${cat.slug}/primary.webp`} alt="" aria-hidden="true" />
            <div className="cat-overlay" />

            {/* 大号序号水印 */}
            <span className="cat-watermark" aria-hidden="true">{cat.num}</span>

            {/* 主内容 */}
            <div className="cat-body">
              <strong className="cat-name">{cat.name}</strong>
              <div className="cat-line" aria-hidden="true" />
              <span className="cat-count">{cat.count} 件</span>
            </div>

            {/* 底部描述（hover显现）*/}
            <div className="cat-footer">
              <span className="cat-desc">{cat.desc}</span>
              <span className="cat-cta">进入 →</span>
            </div>

            {/* 金色边框 */}
            <div className="cat-frame" aria-hidden="true" />
          </button>
        ))}
      </div>

      <footer className="cat-footer-info">
        <span>主编：赵起超</span>
        <span className="cat-footer-dot">·</span>
        <span>顾问：赵国琦</span>
        <span className="cat-footer-dot">·</span>
        <span>出版发行：山西出版传媒集团 &nbsp;山西春秋电子音像出版社</span>
        <span className="cat-footer-copy">© 2026 版权所有，未经授权不得转载</span>
      </footer>
    </div>
  );
}
