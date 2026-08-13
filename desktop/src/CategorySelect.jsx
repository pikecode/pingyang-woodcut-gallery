import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Volume2, VolumeX, X } from "lucide-react";
import "./category-select.css";

const CREDITS_TITLE = "《平阳木版年画·博观集》";

const CREDITS_SECTIONS = [
  {
    heading: "编委会",
    rows: [
      { label: "名誉主编", value: "李荣钢" },
      { label: "主编", value: "赵起超" },
      { label: "常务副主编", value: "边疆、李阳、谢晨曲" },
      { label: "副主编", value: "成一榕、姜黎明、王小强、吴刚" },
      { label: "特约专家", value: "齐国生、许向阳" },
    ],
  },
  {
    heading: "顾问团",
    rows: [
      { label: "总顾问", value: "边保华" },
      { label: "非遗顾问", value: "赵国琦、张馨韦" },
      { label: "艺术顾问", value: "孔令志" },
      { label: "媒体顾问", value: "赵一罡" },
      { label: "数字顾问", value: "刘昕羽" },
    ],
  },
  {
    heading: "编委",
    note: "（按姓氏拼音排列）",
    rows: [
      { value: "陈虹、崔欣怡、傅海青、韩姣姣、胡董森、胡淑芳、胡伟东、黄艳霞、贾南、李栋、林琳、刘畅、刘仲、吕秋月、薿薿、田园、王建明、王凤龙、辛霞、徐海龙、严乐耘、杨波、尹彩云、袁琴、张世佳、张天琦、张恬祎、宗跃飞" },
    ],
  },
  {
    heading: "支持单位",
    rows: [
      { value: "北京市工艺美术技师学院、山西中华文化促进会、山西省非物质文化遗产保护促进会、大同市网络视频传播协会、北京博观时代科技文化有限公司" },
    ],
  },
  {
    heading: "出版发行",
    rows: [
      { label: "出版发行", value: "山西出版传媒集团\n山西春秋电子音像出版社" },
      { label: "出版人", value: "董晓宁" },
      { label: "策划", value: "董晓宁、武斌、周骁羽" },
      { label: "出品", value: "萬世吉光" },
      { label: "责任编辑", value: "周骁羽、薄佳丽" },
      { label: "复审", value: "武斌" },
      { label: "终审", value: "董晓宁" },
      { label: "出版物号", value: "ISBN 978-7-89504-811-9" },
    ],
  },
  {
    heading: "技术",
    rows: [
      { label: "程序开发", value: "青岛君令品牌创意有限公司" },
    ],
  },
];

const DEFAULT_CATEGORIES = [
  { name: "门神", desc: "守护门户 · 镇宅纳祥", count: 0, imagePath: "/opening/panorama/py-099-part-1.webp", num: "01" },
  { name: "神祇", desc: "神灵护佑 · 民俗信仰", count: 0, imagePath: "/opening/panorama/py-089-part-1.webp", num: "02" },
  { name: "装饰", desc: "纹样装点 · 吉庆成章", count: 0, imagePath: "/opening/panorama/py-095-part-1.webp", num: "03" },
  { name: "纸马", desc: "纸上神灵 · 岁时供奉", count: 0, imagePath: "/opening/panorama/py-014-primary.webp", num: "04" },
];

export default function CategorySelect({ onSelect, categories = DEFAULT_CATEGORIES, toggleBgm, bgmMuted, bgmStarted, inactive = false }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

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
    <div
      ref={containerRef}
      className="cat-root"
      aria-hidden={inactive ? "true" : undefined}
      inert={inactive ? "" : undefined}
    >
      <header className="cat-header">
        <span className="cat-brand-name" data-maintenance-hotspot>平阳木版年画 · 博观集</span>
        <span className="cat-subtitle">选择题材，开始探索</span>
      </header>

      {bgmStarted && (
        <button className="cat-bgm-btn" onClick={toggleBgm} aria-label={bgmMuted ? "开启音乐" : "关闭音乐"} title={bgmMuted ? "开启音乐" : "关闭音乐"}>
          {bgmMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
      <button className="cat-info-btn" onClick={() => setShowCredits(true)} aria-label="版权信息" title="版权信息">
        版权
      </button>

      {showCredits && (
        <div className="cat-credits-overlay" onClick={() => setShowCredits(false)}>
          <div className="cat-credits-modal" onClick={e => e.stopPropagation()}>
            <div className="cat-credits-header">
              <h2 className="credits-title">{CREDITS_TITLE}</h2>
              <button className="cat-credits-close" onClick={() => setShowCredits(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="credits-divider" />
            <div className="cat-credits-body">
              {CREDITS_SECTIONS.map((sec, si) => (
                <div key={si} className="credits-section">
                  <h3 className="credits-heading">
                    {sec.heading}
                    {sec.note && <span className="credits-note">{sec.note}</span>}
                  </h3>
                  {sec.rows.map((row, ri) => (
                    <div key={ri} className={`credits-row${!row.label ? " credits-row-full" : ""}`}>
                      {row.label && <span className="credits-label">{row.label}</span>}
                      <span className="credits-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="cat-panels">
        {categories.map((cat) => (
          <button
            key={cat.name}
            className={`cat-panel${hovered === cat.name ? " is-hovered" : ""}${hovered && hovered !== cat.name ? " is-dimmed" : ""}`}
            onClick={() => handleSelect(cat.name)}
            onMouseEnter={() => setHovered(cat.name)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${cat.name}，共${cat.count}件`}
          >
            {/* 藏品背景图（始终可见，hover更亮）*/}
            {cat.imagePath && <img className="cat-bg" src={cat.imagePath} alt="" aria-hidden="true" />}
            <div className="cat-overlay" />

            {/* 大号序号水印 */}
            <span className="cat-watermark" aria-hidden="true">{cat.num}</span>

            {/* 主内容 */}
            <div className="cat-body">
              <strong className="cat-name" aria-hidden="true">
                {Array.from(cat.name).map((char, index) => (
                  <span key={`${cat.name}-${index}`}>{char}</span>
                ))}
              </strong>
              <span className="sr-only">{cat.name}</span>
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
        <span>非遗顾问：赵国琦、张馨韦</span>
        <span className="cat-footer-dot">·</span>
        <span>出版发行：山西出版传媒集团 &nbsp;山西春秋电子音像出版社</span>
        <span className="cat-footer-dot">·</span>
        <span>出版物号：ISBN 978-7-89504-811-9</span>
      </footer>
    </div>
  );
}
