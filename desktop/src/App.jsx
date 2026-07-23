import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ChevronLeft, ChevronRight, Play, Search, X } from "lucide-react";

/* ── 常量 ── */
const THEME_ORDER = ["全部", "戏曲", "神祇", "吉祥", "故事"];
const INTRO_KEY = "pingyang-intro-seen";

/* ── 数据 ── */
function useGalleryData() {
  const [artworks, setArtworks] = useState([]);
  useEffect(() => {
    fetch("/data/artworks.json")
      .then(r => r.json())
      .then(d => setArtworks(d.artworks || []))
      .catch(() => {});
  }, []);
  return artworks;
}

/* ── 开场门扉动画 ── */
function OpeningIntro() {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef(null);
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

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const exit = () => gsap.to(containerRef.current, {
      opacity: 0, duration: 0.8, ease: "power2.inOut",
      onComplete: () => { document.body.style.overflow = orig; setVisible(false); },
    });

    gsap.set(leftDoorRef.current, { transformPerspective: 1600, transformOrigin: "left center" });
    gsap.set(rightDoorRef.current, { transformPerspective: 1600, transformOrigin: "right center" });
    gsap.set(doorBgRef.current, { opacity: 0, scale: 1.1 });
    gsap.set(doorGlowRef.current, { opacity: 0 });
    gsap.set(lightCrackRef.current, { scaleY: 0, opacity: 0 });
    gsap.set(sealRef.current, { opacity: 0, scale: 2, rotation: -12 });
    gsap.set(eyebrowRef.current, { opacity: 0, y: 14 });
    gsap.set(titleCharsRef.current.filter(Boolean), { opacity: 0, y: 32, transformOrigin: "50% 100%" });
    gsap.set(subRef.current, { opacity: 0, y: 10 });

    const tl = gsap.timeline({ onComplete: () => setTimeout(exit, 700) });

    tl.from([leftDoorRef.current, rightDoorRef.current], { opacity: 0, duration: 0.28, ease: "power1.out" })
      .to(sealRef.current, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3.5)" }, "+=0.12")
      .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }, "+=0.18")
      .to(titleCharsRef.current.filter(Boolean), { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "back.out(1.6)" }, "-=0.1")
      .to(subRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.1")
      .to({}, { duration: 1.8 })
      .to([leftRingRef.current, rightRingRef.current], { rotation: -16, duration: 0.1, ease: "power2.inOut", yoyo: true, repeat: 5 })
      .to(lightCrackRef.current, { scaleY: 1, opacity: 1, duration: 0.7, ease: "power1.out" }, "+=0.2")
      .to(doorGlowRef.current, { opacity: 0.5, duration: 1.0, ease: "power1.out" }, "<0.2")
      .to([eyebrowRef.current, ...titleCharsRef.current.filter(Boolean), subRef.current, sealRef.current].filter(Boolean), { opacity: 0, y: -14, duration: 1.4, ease: "power1.inOut", stagger: 0.04 }, "+=0.1")
      .to(leftDoorRef.current, { rotateY: -112, duration: 3.2, ease: "power1.inOut" }, "-=0.5")
      .to(rightDoorRef.current, { rotateY: 112, duration: 3.2, ease: "power1.inOut" }, "<")
      .to(doorBgRef.current, { opacity: 1, scale: 1, duration: 3.0, ease: "power1.out" }, "<0.6")
      .to([lightCrackRef.current, doorGlowRef.current], { opacity: 0, duration: 1.2, ease: "power1.inOut" }, "<1.0");

    return () => { document.body.style.overflow = orig; tl.kill(); };
  }, [visible]);

  const skip = () => gsap.to(containerRef.current, {
    opacity: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => setVisible(false),
  });

  if (!visible) return null;

  return (
    <div ref={containerRef} className="opening-intro door-intro">
      <button className="intro-skip" type="button" onClick={skip}><X size={16} /><span>SKIP</span></button>
      <div ref={doorBgRef} className="door-bg" aria-hidden="true">
        <img src="/images/py-087/primary.webp" alt="" />
        <div className="door-bg-overlay" />
      </div>
      <div ref={doorGlowRef} className="door-glow" aria-hidden="true" />
      <div className="door-frame" aria-hidden="true">
        <div ref={leftDoorRef} className="door-panel is-left">
          <div className="door-studs" /><div ref={leftRingRef} className="door-ring" />
          <span ref={sealRef} className="door-seal">平</span>
        </div>
        <div ref={rightDoorRef} className="door-panel is-right">
          <div className="door-studs" /><div ref={rightRingRef} className="door-ring" />
        </div>
      </div>
      <div ref={lightCrackRef} className="door-light-crack" aria-hidden="true" />
      <div className="door-title">
        <span ref={eyebrowRef} className="door-eyebrow">山西临汾 · 国家级非物质文化遗产</span>
        <strong className="door-title-chars">
          {"平阳木版年画".split("").map((c, i) => (
            <span key={i} ref={el => { titleCharsRef.current[i] = el; }}>{c}</span>
          ))}
        </strong>
        <span ref={subRef} className="door-sub">数字馆藏</span>
      </div>
    </div>
  );
}

/* ── 藏品详情覆盖层 ── */
function DetailOverlay({ artwork, artworks, onClose, onChange }) {
  useEffect(() => {
    if (!artwork) return undefined;
    const onKey = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange(-1);
      if (e.key === "ArrowRight") onChange(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [artwork, onChange, onClose]);

  if (!artwork) return null;
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  const idx = artworks.findIndex(a => a.slug === artwork.slug);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-inner" onClick={e => e.stopPropagation()}>
        <div className="detail-img-area">
          <div className="detail-img-nav">
            <button className="detail-nav-btn" onClick={() => onChange(-1)} aria-label="上一件"><ChevronLeft size={22} /></button>
            <span className="detail-counter">{idx + 1} / {artworks.length}</span>
            <button className="detail-nav-btn" onClick={() => onChange(1)} aria-label="下一件"><ChevronRight size={22} /></button>
          </div>
          <button className="detail-close-btn" onClick={onClose} aria-label="关闭"><X size={20} /></button>
          <div className="detail-images-wrap">
            {artwork.images.map(img => (
              <img key={img.role} src={img.path} alt={artwork.title} className="detail-artwork-img" />
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="detail-info-scroll">
            <div className="detail-kicker">
              <span className="detail-kicker-tag">{artwork.theme.name}</span>
              <span className="detail-kicker-tag">{kind}</span>
              <span className="detail-kicker-tag">{artwork.period.label}</span>
            </div>
            <h2 className="detail-title">{artwork.title}</h2>
            {artwork.aliases.length > 0 && <p className="detail-alias">又名：{artwork.aliases.join("、")}</p>}
            <p className="detail-desc">{artwork.description}</p>
            <div className="detail-meta-grid">
              <div><span className="meta-label">分类</span><span className="meta-val">{artwork.theme.name}</span></div>
              <div><span className="meta-label">形制</span><span className="meta-val">{kind}</span></div>
              <div><span className="meta-label">年代</span><span className="meta-val">{artwork.period.label}</span></div>
              <div><span className="meta-label">规格</span><span className="meta-val">{artwork.dimensions.sourceText}</span></div>
              <div className="meta-full"><span className="meta-label">馆藏</span><span className="meta-val">{artwork.collection}</span></div>
            </div>
            <div className="audio-player">
              <button className="audio-btn" disabled><Play size={15} /></button>
              <div><span className="audio-label">导览音频</span><span className="audio-status">音频文件准备中</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 藏品卡片 ── */
function ArtworkCard({ artwork, onOpen }) {
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  return (
    <button className="gallery-card" onClick={() => onOpen(artwork)} aria-label={`查看《${artwork.title}》`}>
      <img src={artwork.images[0].path} alt={artwork.title} loading="lazy" className="gallery-card-img" />
      <span className="gallery-card-num">{String(artwork.catalogNo).padStart(3, "0")}</span>
      <span className="gallery-card-badge">{artwork.theme.name}</span>
      <div className="gallery-card-bottom">
        <strong className="gallery-card-title">{artwork.title}</strong>
        <span className="gallery-card-meta">{artwork.period.label} · {kind}</span>
      </div>
    </button>
  );
}

/* ── 主应用 ── */
export default function App() {
  const artworks = useGalleryData();
  const [selected, setSelected] = useState(null);
  const [theme, setTheme] = useState("全部");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = e => {
      if ((e.key === "f" || e.key === "F") && !selected) {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    return artworks.filter(a =>
      (theme === "全部" || a.theme.name === theme) &&
      (!kw || [a.title, a.description, ...a.aliases].join(" ").toLowerCase().includes(kw))
    );
  }, [artworks, theme, query]);

  const changeSelected = offset => {
    setSelected(cur => {
      if (!cur) return cur;
      const idx = filtered.findIndex(a => a.slug === cur.slug);
      return filtered[(idx + offset + filtered.length) % filtered.length];
    });
  };

  const counts = useMemo(() =>
    Object.fromEntries(THEME_ORDER.slice(1).map(t => [t, artworks.filter(a => a.theme.name === t).length])),
    [artworks]
  );

  return (
    <div className="app-shell">
      <OpeningIntro />

      {/* 顶部工具栏 */}
      <header className="gallery-topbar">
        <div className="topbar-brand">
          <span className="topbar-seal" aria-hidden="true">平</span>
          <span className="topbar-name">平阳木版年画</span>
        </div>
        <label className="topbar-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索题名、别名…"
          />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="清除"><X size={14} /></button>}
        </label>
      </header>

      {/* 题材标签 */}
      <nav className="theme-tabs-bar" aria-label="按题材筛选">
        {THEME_ORDER.map(t => (
          <button
            key={t}
            className={`theme-tab-btn${theme === t ? " is-active" : ""}`}
            onClick={() => setTheme(t)}
          >
            {t}
            <span>{t === "全部" ? artworks.length : (counts[t] || 0)}</span>
          </button>
        ))}
      </nav>

      {/* 藏品网格 */}
      <main className="gallery-grid-wrap">
        {filtered.length > 0 ? (
          <div className="gallery-grid">
            {filtered.map(a => <ArtworkCard key={a.slug} artwork={a} onOpen={setSelected} />)}
          </div>
        ) : (
          <div className="gallery-empty">
            <Search size={32} /><p>没有找到对应藏品</p>
          </div>
        )}
      </main>

      {/* 详情层 */}
      <DetailOverlay
        artwork={selected}
        artworks={filtered}
        onClose={() => setSelected(null)}
        onChange={changeSelected}
      />
    </div>
  );
}
