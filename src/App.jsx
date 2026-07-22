import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  Grid2X2, Home, LayoutGrid, List,
  Search, SlidersHorizontal, X,
} from "lucide-react";
import {
  Link, NavLink, Route, Routes,
  useLocation, useSearchParams,
} from "react-router-dom";

const themeOrder = ["戏曲", "神祇", "吉祥", "故事"];
const themeMeta = {
  戏曲: { sample: "py-014", caption: "舞台程式凝于纸上，忠奸悲欢一目了然。" },
  神祇: { sample: "py-098", caption: "镇宅护佑，寄托民间对平安的朴素祈愿。" },
  吉祥: { sample: "py-095", caption: "借花木瑞兽与谐音，表达富贵顺遂。" },
  故事: { sample: "py-030", caption: "诗文典故入画，留住地方社会的文化记忆。" },
};

const INTRO_STORAGE_KEY = "pingyang-intro-seen";
const INTRO_CHARS = "平阳木版年画".split("");
const CHAR_ROTS = [-2, 1.5, -1, 2, -1.5, 1];
const STRIP_SLUGS = ["py-001", "py-014", "py-008", "py-030", "py-089", "py-095", "py-098", "py-025"];

function shouldShowOpeningIntro() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (new URLSearchParams(window.location.search).get("intro") === "1") return true;
  try { return window.sessionStorage.getItem(INTRO_STORAGE_KEY) !== "1"; } catch { return true; }
}

function OpeningIntro() {
  const [visible, setVisible] = useState(shouldShowOpeningIntro);
  const containerRef = useRef(null);
  const sealRef = useRef(null);
  const charsRed = useRef([]);
  const charsGreen = useRef([]);
  const charsInk = useRef([]);
  const regRefs = useRef([]);
  const ruleRef = useRef(null);
  const ruleFillRef = useRef(null);
  const subtitleRef = useRef(null);
  const stripRef = useRef(null);
  const stripImgs = useRef([]);

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const exit = () => gsap.to(containerRef.current, {
      y: "-106%", scaleY: 0.97, opacity: 0.08, duration: 0.9, ease: "power3.inOut",
      onComplete: () => {
        try { window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1"); } catch { /**/ }
        document.body.style.overflow = orig;
        setVisible(false);
      },
    });

    const tl = gsap.timeline({ onComplete: () => setTimeout(exit, 800) });
    tl.from(regRefs.current, { opacity: 0, scale: 0.3, duration: 0.22, stagger: 0.04, ease: "back.out(3)" })
      .from(sealRef.current, { y: -58, rotation: -8, scale: 1.38, opacity: 0, duration: 0.5, ease: "back.out(2.6)" }, "-=0.05")
      .to(sealRef.current, { scale: 1.07, duration: 0.09, ease: "power2.out", yoyo: true, repeat: 1 }, "-=0.06")
      .from(charsRed.current, { y: -36, opacity: 0, scale: 1.2, rotation: (i) => CHAR_ROTS[i] ?? 0, duration: 0.3, stagger: 0.09, ease: "back.out(2)" }, "+=0.04")
      .from(charsGreen.current, { y: -36, opacity: 0, scale: 1.2, rotation: (i) => (CHAR_ROTS[i] ?? 0) * 0.6, duration: 0.3, stagger: 0.09, ease: "back.out(2)" }, "<0.03")
      .from(charsInk.current, { y: -36, opacity: 0, scale: 1.2, rotation: (i) => (CHAR_ROTS[i] ?? 0) * 0.25, duration: 0.3, stagger: 0.09, ease: "back.out(2)" }, "<0.05")
      .from(ruleRef.current, { scaleX: 0, opacity: 0, duration: 0.36, ease: "power3.out", transformOrigin: "left center" }, "+=0.12")
      .from(ruleFillRef.current, { scaleX: 0, duration: 0.52, ease: "power2.inOut", transformOrigin: "left center" }, "<")
      .from(subtitleRef.current, { y: 8, opacity: 0, duration: 0.3, ease: "power2.out" }, "-=0.22")
      .from(stripRef.current, { opacity: 0, duration: 0.22 }, "+=0.18")
      .from(stripImgs.current, { opacity: 0, y: 14, scale: 0.88, stagger: { each: 0.05, from: "center" }, duration: 0.25, ease: "back.out(1.6)" }, "<0.08");

    return () => { document.body.style.overflow = orig; tl.kill(); };
  }, [visible]);

  const skip = () => gsap.to(containerRef.current, {
    y: "-106%", opacity: 0.08, scaleY: 0.97, duration: 0.6, ease: "power3.inOut",
    onComplete: () => {
      try { window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1"); } catch { /**/ }
      setVisible(false);
    },
  });

  if (!visible) return null;

  return (
    <div ref={containerRef} className="opening-intro">
      <button className="intro-skip" type="button" aria-label="跳过" onClick={skip}>
        <X size={16} /><span>SKIP</span>
      </button>
      {[["is-tl",0],["is-tr",1],["is-bl",2],["is-br",3]].map(([cls,i]) => (
        <span key={cls} ref={(el) => { regRefs.current[i] = el; }} className={`intro-reg-mark ${cls}`} aria-hidden="true" />
      ))}
      <span className="intro-origin">山西 · 临汾</span>
      <div className="intro-stage">
        <span ref={sealRef} className="intro-seal" aria-hidden="true">平</span>
        <div className="intro-title" aria-label="平阳木版年画">
          <span className="intro-title-layer is-red" aria-hidden="true">
            {INTRO_CHARS.map((c,i) => <span key={i} ref={(el)=>{charsRed.current[i]=el;}}>{c}</span>)}
          </span>
          <span className="intro-title-layer is-green" aria-hidden="true">
            {INTRO_CHARS.map((c,i) => <span key={i} ref={(el)=>{charsGreen.current[i]=el;}}>{c}</span>)}
          </span>
          <span className="intro-title-layer is-ink">
            {INTRO_CHARS.map((c,i) => <span key={i} ref={(el)=>{charsInk.current[i]=el;}}>{c}</span>)}
          </span>
        </div>
        <div ref={ruleRef} className="intro-rule" aria-hidden="true"><span ref={ruleFillRef} /></div>
        <p ref={subtitleRef}>数字馆藏</p>
        <div ref={stripRef} className="intro-strip" aria-hidden="true">
          {STRIP_SLUGS.map((slug,i) => (
            <img key={slug} ref={(el)=>{stripImgs.current[i]=el;}} src={`/images/${slug}/primary.webp`} alt="" />
          ))}
        </div>
      </div>
      <span className="intro-heritage">国家级非物质文化遗产</span>
    </div>
  );
}

function useGalleryData() {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let active = true;
    fetch("/data/artworks.json")
      .then((r) => { if (!r.ok) throw new Error(`数据加载失败：${r.status}`); return r.json(); })
      .then((data) => active && setState({ data, error: null }))
      .catch((error) => active && setState({ data: null, error }));
    return () => { active = false; };
  }, []);
  return state;
}

function useInView(threshold = 0.14) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCountUp(target, active) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1300, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);
  return count;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [location.pathname]);
  return null;
}

function TabBar() {
  const location = useLocation();
  const isSearch = location.pathname === "/search";
  const isCategories = location.pathname === "/categories";
  const isHome = !isSearch && !isCategories;
  return (
    <nav className="tab-bar" aria-label="底部导航">
      <Link to="/" className={`tab-item${isHome ? " is-active" : ""}`}>
        <Home size={22} /><span>首页</span>
      </Link>
      <Link to="/categories" className={`tab-item${isCategories ? " is-active" : ""}`}>
        <LayoutGrid size={22} /><span>藏品</span>
      </Link>
      <Link to="/search" className={`tab-item${isSearch ? " is-active" : ""}`}>
        <Search size={22} /><span>搜索</span>
      </Link>
    </nav>
  );
}

function LoadingState({ error }) {
  return (
    <main className="state-page">
      <span className="state-rule" />
      <h1>{error ? "馆藏数据暂不可用" : "正在整理馆藏"}</h1>
      <p>{error ? error.message : "请稍候"}</p>
    </main>
  );
}

function FactCount({ value, label, delay = 0, padded = false }) {
  const [ref, inView] = useInView();
  const count = useCountUp(value, inView);
  const display = padded ? String(count).padStart(2, "0") : count;
  return (
    <div ref={ref} className={`reveal${inView ? " is-visible" : ""}`} style={{ "--reveal-delay": `${delay}ms` }}>
      <dt>{display}</dt><dd>{label}</dd>
    </div>
  );
}

function ArtworkCard({ artwork, mode = "grid", onOpen, featured = false, className = "", style }) {
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  return (
    <article className={`artwork-card ${mode === "list" ? "is-list" : ""} ${featured ? "is-featured" : ""} ${className}`} style={style}>
      <button type="button" onClick={() => onOpen(artwork)} aria-label={`查看《${artwork.title}》`}>
        <span className="artwork-image-wrap">
          <img src={artwork.images[0].path} alt={artwork.title} loading="lazy" />
          <span className="artwork-index">{String(artwork.catalogNo).padStart(3, "0")}</span>
        </span>
        <span className="artwork-copy">
          <span className="artwork-kicker">{artwork.theme.name} · {kind}</span>
          <strong>{artwork.title}</strong>
          {mode === "list" && <span className="artwork-description">{artwork.description}</span>}
          <span className="artwork-meta">{artwork.period.label}<ArrowRight size={14} /></span>
        </span>
      </button>
    </article>
  );
}

function HomePage({ artworks, onOpen }) {
  const hero = artworks.find((a) => a.slug === "py-087") || artworks[0];
  const curatedSlugs = ["py-001", "py-014", "py-025", "py-030", "py-089", "py-098"];
  const curated = curatedSlugs.map((slug) => artworks.find((a) => a.slug === slug)).filter(Boolean);
  const counts = Object.fromEntries(themeOrder.map((t) => [t, artworks.filter((a) => a.theme.name === t).length]));
  const [themeIndexRef, themeIndexInView] = useInView();
  const [selectedRef, selectedInView] = useInView();
  const [themeGalleryRef, themeGalleryInView] = useInView();

  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <img className="hero-image" src={hero.images[0].path} alt={hero.title} fetchPriority="high" />
        <div className="hero-copy">
          <span className="eyebrow">山西临汾 · 国家级非遗</span>
          <h1 id="home-title">平阳木版年画</h1>
          <p>以刀代笔，以色寄愿。戏台故事与岁时愿景，在一张张纸上留存至今。</p>
          <div className="hero-actions">
            <Link className="primary-action" to="/categories">浏览馆藏 <ArrowRight size={15} /></Link>
            <button className="text-action" type="button" onClick={() => onOpen(hero)}>本期：{hero.title}</button>
          </div>
        </div>
        <div className="hero-caption">
          <span>{String(hero.catalogNo).padStart(3, "0")}</span>
          <strong>{hero.title}</strong>
          <small>{hero.period.label}</small>
        </div>
      </section>

      <nav ref={themeIndexRef} className="theme-index" aria-label="题材分类">
        {themeOrder.map((theme, i) => (
          <Link key={theme} className={`reveal${themeIndexInView ? " is-visible" : ""}`}
            style={{ "--reveal-delay": `${i * 65}ms` }}
            to={`/categories?theme=${encodeURIComponent(theme)}`}>
            <span>{theme}</span>
            <strong>{String(counts[theme]).padStart(2, "0")}</strong>
            <ArrowRight size={14} />
          </Link>
        ))}
      </nav>

      <section className="mp-section">
        <div className={`section-heading reveal${selectedInView ? " is-visible" : ""}`}>
          <div><span className="section-label">Selected</span><h2>精选藏品</h2></div>
          <Link className="section-link" to="/categories?view=all">全部 <ArrowRight size={13} /></Link>
        </div>
        <div ref={selectedRef} className="featured-grid">
          {curated.map((artwork, i) => (
            <ArtworkCard key={artwork.slug} artwork={artwork} onOpen={onOpen} featured={i === 0}
              className={`reveal${selectedInView ? " is-visible" : ""}`}
              style={{ "--reveal-delay": `${i * 75}ms` }} />
          ))}
        </div>
      </section>

      <section className="theme-section">
        <div className="mp-section section-heading theme-heading">
          <div><span className="section-label">Themes</span><h2>题材脉络</h2></div>
        </div>
        <div ref={themeGalleryRef} className="theme-gallery">
          {themeOrder.map((theme, i) => {
            const meta = themeMeta[theme];
            const sample = artworks.find((a) => a.slug === meta.sample);
            return (
              <Link key={theme} className={`theme-feature reveal${themeGalleryInView ? " is-visible" : ""}`}
                style={{ "--reveal-delay": `${i * 70}ms` }}
                to={`/categories?theme=${encodeURIComponent(theme)}`}>
                <img src={sample.images[0].path} alt={`${theme}：${sample.title}`} loading="lazy" />
                <span className="theme-feature-copy">
                  <small>{String(counts[theme]).padStart(2, "0")} 件</small>
                  <strong>{theme}</strong>
                  <span>{meta.caption}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="collection-facts">
        <div className="mp-section facts-inner">
          <div><span className="section-label">Archive</span><h2>馆藏概览</h2></div>
          <dl>
            <FactCount value={55} label="件藏品" delay={0} />
            <FactCount value={65} label="幅图像" delay={100} />
            <FactCount value={4} label="类主题" delay={200} padded />
            <FactCount value={54} label="件清代" delay={300} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function CategoriesPage({ artworks, onOpen }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState("全部");
  const [mode, setMode] = useState("grid");
  const theme = params.get("theme") || "全部";
  const searchRef = useRef(null);

  useEffect(() => {
    if (params.get("focus") === "search") searchRef.current?.focus();
  }, [params]);

  const formOptions = useMemo(() => {
    const vals = artworks.map((a) => a.form?.name || a.material?.name).filter(Boolean);
    return ["全部", ...new Set(vals)];
  }, [artworks]);

  const filtered = useMemo(() => {
    const kw = query.trim().toLocaleLowerCase("zh-CN");
    return [...artworks.filter((a) => {
      const af = a.form?.name || a.material?.name;
      return (theme === "全部" || a.theme.name === theme)
        && (form === "全部" || af === form)
        && (!kw || [a.title, a.description, ...a.aliases].join(" ").toLocaleLowerCase("zh-CN").includes(kw));
    })].sort((a, b) => a.catalogNo - b.catalogNo);
  }, [artworks, form, query, theme]);

  const chooseTheme = (v) => {
    const next = new URLSearchParams(params);
    next.delete("focus");
    v === "全部" ? next.delete("theme") : next.set("theme", v);
    setParams(next);
  };

  return (
    <main className="catalog-page">
      <div className="catalog-topbar">
        <h1>藏品</h1>
        <div className="catalog-filter-row">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题名…" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="清除"><X size={15} /></button>}
          </label>
          <label className="select-field">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <select value={form} onChange={(e) => setForm(e.target.value)} aria-label="形制">
              {formOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <div className="view-switch">
            <button type="button" className={mode === "grid" ? "is-active" : ""} onClick={() => setMode("grid")} aria-label="网格"><Grid2X2 size={16} /></button>
            <button type="button" className={mode === "list" ? "is-active" : ""} onClick={() => setMode("list")} aria-label="列表"><List size={17} /></button>
          </div>
        </div>
      </div>
      <div className="theme-tabs-wrap">
        <div className="theme-tabs" role="tablist" aria-label="题材">
          {["全部", ...themeOrder].map((v) => (
            <button key={v} type="button" role="tab" aria-selected={theme === v}
              className={theme === v ? "is-active" : ""} onClick={() => chooseTheme(v)}>
              {v}<span>{v === "全部" ? artworks.length : artworks.filter((a) => a.theme.name === v).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mp-section catalog-content">
        <div className="results-heading">
          <p><strong>{filtered.length}</strong> 件</p>
          {(theme !== "全部" || form !== "全部" || query) && (
            <button type="button" onClick={() => { chooseTheme("全部"); setForm("全部"); setQuery(""); }}>重置</button>
          )}
        </div>
        {filtered.length ? (
          <div className={`catalog-grid${mode === "list" ? " is-list" : ""}`}>
            {filtered.map((a) => <ArtworkCard key={a.slug} artwork={a} mode={mode} onOpen={onOpen} />)}
          </div>
        ) : (
          <div className="empty-state"><Search size={26} /><h2>没有找到藏品</h2><p>尝试缩短关键词或重置筛选。</p></div>
        )}
      </div>
    </main>
  );
}

function SearchPage({ artworks, onOpen }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const kw = query.trim().toLocaleLowerCase("zh-CN");
    if (!kw) return [];
    return artworks.filter((a) =>
      [a.title, a.description, ...a.aliases].join(" ").toLocaleLowerCase("zh-CN").includes(kw)
    ).slice(0, 30);
  }, [artworks, query]);

  return (
    <main className="search-page">
      <div className="search-header">
        <label className="search-field-hero">
          <Search size={18} aria-hidden="true" />
          <input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题名、别名或画面内容" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="清除"><X size={16} /></button>}
        </label>
      </div>
      {!query && (
        <div className="search-empty">
          <p className="search-hint">热门主题</p>
          <div className="search-tags">
            {["白素贞", "门神", "关羽", "牛郎织女", "财神", "戏曲"].map((tag) => (
              <button key={tag} type="button" className="search-tag" onClick={() => setQuery(tag)}>{tag}</button>
            ))}
          </div>
        </div>
      )}
      {query && results.length === 0 && (
        <div className="empty-state"><Search size={26} /><h2>无结果</h2><p>换个关键词试试。</p></div>
      )}
      {results.length > 0 && (
        <div className="mp-section">
          <p className="search-count"><strong>{results.length}</strong> 件结果</p>
          <div className="catalog-grid">
            {results.map((a) => <ArtworkCard key={a.slug} artwork={a} onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </main>
  );
}

function ArtworkModal({ artwork, artworks, onClose, onChange }) {
  useEffect(() => {
    if (!artwork) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange(-1);
      if (e.key === "ArrowRight") onChange(1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = orig; window.removeEventListener("keydown", onKey); };
  }, [artwork, onChange, onClose]);

  if (!artwork) return null;
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="artwork-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-toolbar">
          <span>{String(artwork.catalogNo).padStart(3, "0")} / {artworks.length}</span>
          <div>
            <button type="button" onClick={() => onChange(-1)} aria-label="上一件"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => onChange(1)} aria-label="下一件"><ChevronRight size={20} /></button>
            <button type="button" onClick={onClose} aria-label="关闭"><X size={21} /></button>
          </div>
        </div>
        <div className={`modal-images${artwork.images.length > 1 ? " has-pair" : ""}`}>
          {artwork.images.map((img) => <img key={img.role} src={img.path} alt={artwork.title} />)}
        </div>
        <div className="modal-copy">
          <span className="modal-kicker">{artwork.theme.name} · {kind} · {artwork.period.label}</span>
          <h2 id="modal-title">{artwork.title}</h2>
          {artwork.aliases.length > 0 && <p className="aliases">又名：{artwork.aliases.join("、")}</p>}
          <p className="modal-description">{artwork.description}</p>
          <dl>
            <div><dt>分类</dt><dd>{artwork.theme.name}</dd></div>
            <div><dt>形制</dt><dd>{kind}</dd></div>
            <div><dt>年代</dt><dd>{artwork.period.label}</dd></div>
            <div><dt>规格</dt><dd>{artwork.dimensions.sourceText}</dd></div>
            <div className="wide"><dt>馆藏</dt><dd>{artwork.collection}</dd></div>
          </dl>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default function App() {
  const { data, error } = useGalleryData();
  const [selected, setSelected] = useState(null);
  const artworks = data?.artworks || [];

  const changeSelected = (offset) => {
    setSelected((cur) => {
      if (!cur || !artworks.length) return cur;
      const idx = artworks.findIndex((a) => a.slug === cur.slug);
      return artworks[(idx + offset + artworks.length) % artworks.length];
    });
  };

  return (
    <>
      <OpeningIntro />
      <ScrollToTop />
      {!data ? (
        <LoadingState error={error} />
      ) : (
        <Routes>
          <Route path="/" element={<HomePage artworks={artworks} onOpen={setSelected} />} />
          <Route path="/categories" element={<CategoriesPage artworks={artworks} onOpen={setSelected} />} />
          <Route path="/search" element={<SearchPage artworks={artworks} onOpen={setSelected} />} />
          <Route path="*" element={<HomePage artworks={artworks} onOpen={setSelected} />} />
        </Routes>
      )}
      <TabBar />
      <ArtworkModal artwork={selected} artworks={artworks} onClose={() => setSelected(null)} onChange={changeSelected} />
    </>
  );
}
