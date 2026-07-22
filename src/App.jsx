import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Menu,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const themeOrder = ["戏曲", "神祇", "吉祥", "故事"];
const themeMeta = {
  戏曲: { sample: "py-014", caption: "舞台程式凝于纸上，忠奸悲欢一目了然。" },
  神祇: { sample: "py-098", caption: "镇宅护佑，寄托民间对平安的朴素祈愿。" },
  吉祥: { sample: "py-095", caption: "借花木瑞兽与谐音，表达富贵顺遂。" },
  故事: { sample: "py-030", caption: "诗文典故入画，留住地方社会的文化记忆。" },
};

function useGalleryData() {
  const [state, setState] = useState({ data: null, error: null });

  useEffect(() => {
    let active = true;
    fetch("/data/artworks.json")
      .then((response) => {
        if (!response.ok) throw new Error(`数据加载失败：${response.status}`);
        return response.json();
      })
      .then((data) => active && setState({ data, error: null }))
      .catch((error) => active && setState({ data: null, error }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const allCollectionActive = location.pathname === "/categories" && new URLSearchParams(location.search).get("view") === "all";
  const categoryActive = location.pathname === "/categories" && !allCollectionActive;

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="平阳木版年画首页">
          <span className="brand-seal" aria-hidden="true">平</span>
          <span>
            <strong>平阳木版年画</strong>
            <small>数字馆藏</small>
          </span>
        </Link>

        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="主导航">
          <NavLink to="/" end>首页</NavLink>
          <Link className={categoryActive ? "active" : ""} to="/categories">分类</Link>
          <Link className={allCollectionActive ? "active" : ""} to="/categories?view=all">全部藏品</Link>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="搜索藏品"
            title="搜索藏品"
            onClick={() => navigate("/categories?focus=search")}
          >
            <Search size={19} />
          </button>
          <button
            className="icon-button menu-button"
            type="button"
            aria-label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open}
            title={open ? "关闭导航" : "打开导航"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <span className="footer-mark">平阳木版年画</span>
          <p>临汾市平阳木版年画博物馆馆藏资料数字化整理</p>
        </div>
        <nav aria-label="页脚导航">
          <Link to="/">首页</Link>
          <Link to="/categories">分类浏览</Link>
          <Link to="/categories?view=all">全部藏品</Link>
        </nav>
        <p className="footer-note">当前收录 55 件作品 · 图片版权状态待馆方确认</p>
      </div>
    </footer>
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

function ArtworkCard({ artwork, mode = "grid", onOpen, featured = false }) {
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  return (
    <article className={`artwork-card ${mode === "list" ? "is-list" : ""} ${featured ? "is-featured" : ""}`}>
      <button type="button" onClick={() => onOpen(artwork)} aria-label={`查看《${artwork.title}》详情`}>
        <span className="artwork-image-wrap">
          <img src={artwork.images[0].path} alt={artwork.title} loading="lazy" />
          <span className="artwork-index">{String(artwork.catalogNo).padStart(3, "0")}</span>
        </span>
        <span className="artwork-copy">
          <span className="artwork-kicker">{artwork.theme.name} · {kind}</span>
          <strong>{artwork.title}</strong>
          {mode === "list" && <span className="artwork-description">{artwork.description}</span>}
          <span className="artwork-meta">{artwork.period.label}<ArrowRight size={16} /></span>
        </span>
      </button>
    </article>
  );
}

function HomePage({ artworks, onOpen }) {
  const hero = artworks.find((artwork) => artwork.slug === "py-087") || artworks[0];
  const curatedSlugs = ["py-001", "py-014", "py-025", "py-030", "py-089", "py-098"];
  const curated = curatedSlugs.map((slug) => artworks.find((item) => item.slug === slug)).filter(Boolean);
  const counts = Object.fromEntries(themeOrder.map((theme) => [theme, artworks.filter((item) => item.theme.name === theme).length]));

  return (
    <main>
      <section className="home-hero" aria-labelledby="home-title">
        <img className="hero-image" src={hero.images[0].path} alt="赵云救阿斗年画" />
        <div className="hero-copy">
          <span className="eyebrow">山西临汾 · 国家级非物质文化遗产</span>
          <h1 id="home-title">平阳木版年画</h1>
          <p>以刀代笔，以色寄愿。戏台故事、门神信仰与岁时愿景，在一张张纸上留存至今。</p>
          <div className="hero-actions">
            <Link className="primary-action" to="/categories">
              浏览馆藏 <ArrowRight size={18} />
            </Link>
            <button className="text-action" type="button" onClick={() => onOpen(hero)}>
              本期展品：{hero.title}
            </button>
          </div>
        </div>
        <div className="hero-caption">
          <span>{String(hero.catalogNo).padStart(3, "0")}</span>
          <strong>{hero.title}</strong>
          <small>{hero.period.label} · {hero.collection}</small>
        </div>
      </section>

      <nav className="theme-index" aria-label="按主题分类">
        {themeOrder.map((theme) => (
          <Link key={theme} to={`/categories?theme=${encodeURIComponent(theme)}`}>
            <span>{theme}</span>
            <strong>{String(counts[theme]).padStart(2, "0")}</strong>
            <ArrowRight size={17} />
          </Link>
        ))}
      </nav>

      <section className="section selected-section">
        <div className="section-heading">
          <div>
            <span className="section-label">Selected collection</span>
            <h2>精选藏品</h2>
          </div>
          <Link className="section-link" to="/categories?view=all">查看全部 <ArrowRight size={17} /></Link>
        </div>
        <div className="featured-grid">
          {curated.map((artwork, index) => (
            <ArtworkCard key={artwork.slug} artwork={artwork} onOpen={onOpen} featured={index === 0} />
          ))}
        </div>
      </section>

      <section className="theme-section">
        <div className="section section-heading theme-heading">
          <div>
            <span className="section-label">Collection themes</span>
            <h2>题材脉络</h2>
          </div>
          <p>从舞台叙事到日常祈愿，年画记录着地方社会共同的想象。</p>
        </div>
        <div className="theme-gallery">
          {themeOrder.map((theme) => {
            const meta = themeMeta[theme];
            const sample = artworks.find((artwork) => artwork.slug === meta.sample);
            return (
              <Link key={theme} className="theme-feature" to={`/categories?theme=${encodeURIComponent(theme)}`}>
                <img src={sample.images[0].path} alt={`${theme}类代表作品：${sample.title}`} loading="lazy" />
                <span className="theme-feature-copy">
                  <small>{String(counts[theme]).padStart(2, "0")} 件作品</small>
                  <strong>{theme}</strong>
                  <span>{meta.caption}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="collection-facts">
        <div className="section facts-inner">
          <div>
            <span className="section-label">Archive at a glance</span>
            <h2>馆藏概览</h2>
          </div>
          <dl>
            <div><dt>55</dt><dd>件藏品</dd></div>
            <div><dt>65</dt><dd>幅图像</dd></div>
            <div><dt>04</dt><dd>类主题</dd></div>
            <div><dt>54</dt><dd>件清代作品</dd></div>
          </dl>
        </div>
      </section>
    </main>
  );
}

function CategoriesPage({ artworks, onOpen }) {
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState("全部形制");
  const [sort, setSort] = useState("catalog");
  const [mode, setMode] = useState("grid");
  const theme = params.get("theme") || "全部";

  useEffect(() => {
    if (params.get("focus") === "search") searchRef.current?.focus();
  }, [params]);

  const formOptions = useMemo(() => {
    const values = artworks.map((artwork) => artwork.form?.name || artwork.material?.name).filter(Boolean);
    return ["全部形制", ...new Set(values)];
  }, [artworks]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    const result = artworks.filter((artwork) => {
      const artworkForm = artwork.form?.name || artwork.material?.name;
      const matchesTheme = theme === "全部" || artwork.theme.name === theme;
      const matchesForm = form === "全部形制" || artworkForm === form;
      const searchable = [artwork.title, artwork.description, ...artwork.aliases].join(" ").toLocaleLowerCase("zh-CN");
      return matchesTheme && matchesForm && (!keyword || searchable.includes(keyword));
    });
    return [...result].sort((a, b) => sort === "title"
      ? a.title.localeCompare(b.title, "zh-CN")
      : a.catalogNo - b.catalogNo);
  }, [artworks, form, query, sort, theme]);

  const chooseTheme = (value) => {
    const next = new URLSearchParams(params);
    next.delete("focus");
    if (value === "全部") next.delete("theme");
    else next.set("theme", value);
    setParams(next);
  };

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div className="section catalog-header-inner">
          <span className="section-label">Browse the collection</span>
          <h1>藏品分类</h1>
          <p>按题材与形制梳理 55 件馆藏，查看作品图像、年代与画面叙事。</p>
        </div>
      </header>

      <div className="theme-tabs-wrap">
        <div className="section theme-tabs" role="tablist" aria-label="题材分类">
          {["全部", ...themeOrder].map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={theme === value}
              className={theme === value ? "is-active" : ""}
              onClick={() => chooseTheme(value)}
            >
              {value}
              <span>{value === "全部" ? artworks.length : artworks.filter((item) => item.theme.name === value).length}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="section catalog-content">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索题名、别名或画面内容"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="清除搜索" title="清除搜索">
                <X size={17} />
              </button>
            )}
          </label>

          <label className="select-field">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <select value={form} onChange={(event) => setForm(event.target.value)} aria-label="按形制筛选">
              {formOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <label className="select-field sort-field">
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="排序方式">
              <option value="catalog">按馆藏编号</option>
              <option value="title">按题名</option>
            </select>
          </label>

          <div className="view-switch" aria-label="布局方式">
            <button
              type="button"
              className={mode === "grid" ? "is-active" : ""}
              onClick={() => setMode("grid")}
              aria-label="网格视图"
              title="网格视图"
            ><Grid2X2 size={18} /></button>
            <button
              type="button"
              className={mode === "list" ? "is-active" : ""}
              onClick={() => setMode("list")}
              aria-label="列表视图"
              title="列表视图"
            ><List size={19} /></button>
          </div>
        </div>

        <div className="results-heading">
          <p><strong>{filtered.length}</strong> 件藏品</p>
          {(theme !== "全部" || form !== "全部形制" || query) && (
            <button type="button" onClick={() => { chooseTheme("全部"); setForm("全部形制"); setQuery(""); }}>
              重置筛选
            </button>
          )}
        </div>

        {filtered.length ? (
          <div className={`catalog-grid ${mode === "list" ? "is-list" : ""}`}>
            {filtered.map((artwork) => (
              <ArtworkCard key={artwork.slug} artwork={artwork} mode={mode} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={28} />
            <h2>没有找到对应藏品</h2>
            <p>可尝试缩短关键词或重置筛选条件。</p>
          </div>
        )}
      </section>
    </main>
  );
}

function ArtworkModal({ artwork, artworks, onClose, onChange }) {
  useEffect(() => {
    if (!artwork) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onChange(-1);
      if (event.key === "ArrowRight") onChange(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [artwork, onChange, onClose]);

  if (!artwork) return null;
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="artwork-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-toolbar">
          <span>编号 {String(artwork.catalogNo).padStart(3, "0")} · 共 {artworks.length} 件</span>
          <div>
            <button type="button" onClick={() => onChange(-1)} aria-label="上一件" title="上一件"><ChevronLeft size={21} /></button>
            <button type="button" onClick={() => onChange(1)} aria-label="下一件" title="下一件"><ChevronRight size={21} /></button>
            <button type="button" onClick={onClose} aria-label="关闭详情" title="关闭详情"><X size={22} /></button>
          </div>
        </div>
        <div className={`modal-images ${artwork.images.length > 1 ? "has-pair" : ""}`}>
          {artwork.images.map((image) => <img key={image.role} src={image.path} alt={artwork.title} />)}
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
    setSelected((current) => {
      if (!current || !artworks.length) return current;
      const index = artworks.findIndex((item) => item.slug === current.slug);
      return artworks[(index + offset + artworks.length) % artworks.length];
    });
  };

  return (
    <>
      <ScrollToTop />
      <Header />
      {!data ? (
        <LoadingState error={error} />
      ) : (
        <Routes>
          <Route path="/" element={<HomePage artworks={artworks} onOpen={setSelected} />} />
          <Route path="/categories" element={<CategoriesPage artworks={artworks} onOpen={setSelected} />} />
          <Route path="*" element={<HomePage artworks={artworks} onOpen={setSelected} />} />
        </Routes>
      )}
      <Footer />
      <ArtworkModal
        artwork={selected}
        artworks={artworks}
        onClose={() => setSelected(null)}
        onChange={changeSelected}
      />
    </>
  );
}
