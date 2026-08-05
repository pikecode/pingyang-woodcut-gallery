import { useEffect, useMemo, useRef, useState } from "react";
import OpeningIntroVideo from "./opening/OpeningIntroVideo";
import CategorySelect from "./CategorySelect";
import MaintenanceWorkbench from "./MaintenanceWorkbench";
import { shouldShowOpeningIntro } from "./opening/openingIntroSession";
import useBackgroundMusic from "./useBackgroundMusic";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Pause,
  Search,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

/* ── 常量 ── */
const MAINTENANCE_STORAGE_KEY = "pingyang.maintenance.overrides.v2";
const MAINTENANCE_UPDATE_EVENT = "pingyang:gallery-overrides-updated";

function loadMaintenanceOverrides() {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function normalizeArtwork(artwork, override) {
  const merged = { ...artwork, ...(override || {}) };
  const category = merged.category || merged.theme?.name || merged.sourceCategory || "未分类";
  const content = merged.content || merged.description || "";
  return {
    ...merged,
    category,
    content,
    description: content,
    aliases: merged.aliases || [],
    images: merged.images || [],
    theme: {
      ...(merged.theme || {}),
      code: merged.theme?.code || category,
      name: category,
    },
    period: merged.period || { code: "unknown", label: "未标注" },
  };
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/* ── 数据 ── */
function useGalleryData() {
  const [artworks, setArtworks] = useState([]);
  const [overrides, setOverrides] = useState(loadMaintenanceOverrides);

  useEffect(() => {
    fetch("/data/official-artworks.json")
      .then(r => {
        if (!r.ok) throw new Error(`official data request failed: ${r.status}`);
        return r.json();
      })
      .then(d => setArtworks(d.artworks || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const refresh = (event) => {
      setOverrides(event.detail || loadMaintenanceOverrides());
    };
    const onStorage = (event) => {
      if (event.key === MAINTENANCE_STORAGE_KEY) setOverrides(loadMaintenanceOverrides());
    };
    window.addEventListener(MAINTENANCE_UPDATE_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MAINTENANCE_UPDATE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return useMemo(
    () => artworks.map(artwork => normalizeArtwork(artwork, overrides[artwork.slug])),
    [artworks, overrides]
  );
}

/* ── 藏品详情覆盖层 ── */
function DetailOverlay({ artwork, artworks, onClose, onChange, toggleBgm, bgmMuted, bgmStarted }) {
  const [activeImage, setActiveImage] = useState(0);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [audioState, setAudioState] = useState({ ready: false, playing: false, current: 0, duration: 0, error: "" });
  const imageAreaRef = useRef(null);
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const didDragRef = useRef(false);
  const isScrubRef = useRef(false);
  const scrubPosRef = useRef(0);
  const scrubWasPlayingRef = useRef(false);
  const [scrubDisplay, setScrubDisplay] = useState(0);

  const images = artwork?.images || [];
  const currentImage = images[activeImage] || null;
  const activeSource = currentImage?.path;

  useEffect(() => {
    if (!artwork?.slug) return undefined;
    const audio = new Audio(`/audio/${artwork.slug}.m4a`);
    audio.preload = "metadata";
    audio.playbackRate = 0.7;
    audioRef.current = audio;
    setAudioState({ ready: false, playing: false, current: 0, duration: 0, error: "" });

    const onMetadata = () => setAudioState((state) => ({ ...state, ready: true, duration: audio.duration || 0, error: "" }));
    const onTime = () => {
      if (!isScrubRef.current) setAudioState((state) => ({ ...state, current: audio.currentTime || 0 }));
    };
    const onPlay = () => { if (!isScrubRef.current) setAudioState((state) => ({ ...state, playing: true })); };
    const onPause = () => { if (!isScrubRef.current) setAudioState((state) => ({ ...state, playing: false })); };
    const onEnded = () => {
      audio.currentTime = 0;
      setAudioState((state) => ({ ...state, playing: false, current: 0 }));
    };
    const onError = () => setAudioState((state) => ({ ...state, ready: false, playing: false, error: "音频暂不可用" }));

    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [artwork?.slug]);

  useEffect(() => {
    setActiveImage(0);
    setView({ scale: 1, x: 0, y: 0 });
  }, [artwork?.slug]);

  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, [activeImage]);

  useEffect(() => {
    if (!artwork) return undefined;
    const onKey = e => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else onClose();
      }
      if (e.key === "ArrowLeft") onChange(-1);
      if (e.key === "ArrowRight") onChange(1);
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setView((value) => ({ ...value, scale: Math.min(6, value.scale + 0.25) }));
      }
      if (e.key === "-") {
        e.preventDefault();
        setView((value) => value.scale <= 1.25
          ? { scale: 1, x: 0, y: 0 }
          : { ...value, scale: value.scale - 0.25 });
      }
      if (e.key === "0") setView({ scale: 1, x: 0, y: 0 });
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else imageAreaRef.current?.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [artwork, onChange, onClose]);

  if (!artwork) return null;
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  const detailTags = Array.from(new Set([
    artwork.theme?.name,
    kind,
    artwork.period?.label,
  ].filter(tag => tag && tag !== "未标注")));
  const idx = artworks.findIndex(a => a.slug === artwork.slug);

  const changeZoom = (offset) => {
    setView((value) => {
      const scale = Math.max(1, Math.min(6, value.scale + offset));
      return scale === 1 ? { scale, x: 0, y: 0 } : { ...value, scale };
    });
  };

  const onWheel = (event) => {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 0.25 : -0.25);
  };

  const onPointerDown = (event) => {
    didDragRef.current = false;
    if (view.scale <= 1 || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
    setIsPanning(true);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    didDragRef.current = true;
    setView((value) => ({
      ...value,
      x: drag.originX + event.clientX - drag.x,
      y: drag.originY + event.clientY - drag.y,
    }));
  };

  const endPan = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsPanning(false);
  };

  const handleFrameClick = () => {
    if (!didDragRef.current && view.scale === 1) setShowLightbox(true);
  };

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio || audioState.error) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setAudioState((state) => ({ ...state, playing: false, error: "无法播放音频" }));
      }
    } else {
      audio.pause();
    }
  };

  const onScrubStart = (e) => {
    const audio = audioRef.current;
    if (!audio || audioState.error) return;
    const v = Number(e.target.value);
    scrubPosRef.current = v;
    scrubWasPlayingRef.current = !audio.paused;
    isScrubRef.current = true;
    if (!audio.paused) audio.pause();
    setScrubDisplay(v);
  };

  const onScrubMove = (e) => {
    const v = Number(e.target.value);
    scrubPosRef.current = v;
    setScrubDisplay(v);
  };

  const onScrubEnd = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const pos = scrubPosRef.current;
    audio.currentTime = pos;
    setAudioState((s) => ({ ...s, current: pos }));
    isScrubRef.current = false;
    if (scrubWasPlayingRef.current) {
      try { await audio.play(); } catch {}
    }
  };

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      {/* 顶部导航栏 */}
      <header className="detail-topbar">
        <button className="detail-back-btn" onClick={onClose} aria-label="返回">
          <ChevronLeft size={20} />
          <span>平阳木版年画 · 博观集</span>
        </button>
        <h1 className="detail-topbar-title">藏品详情</h1>
        <div className="detail-topbar-icons">
          {bgmStarted && (
            <button type="button" className="topbar-icon-btn" onClick={toggleBgm} aria-label={bgmMuted ? "开启音乐" : "关闭音乐"} title={bgmMuted ? "开启音乐" : "关闭音乐"}>
              {bgmMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>
      </header>

      {/* 主体：左图右文 */}
      <div className="detail-body">
        {/* 左侧图片区 */}
        <div className="detail-img-section">
          <div
            ref={imageAreaRef}
            className="detail-img-frame"
            onClick={handleFrameClick}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onDoubleClick={() => setView((value) => value.scale === 1
              ? { scale: 2, x: 0, y: 0 }
              : { scale: 1, x: 0, y: 0 })}
          >
            {/* 四角红钉装饰 */}
            <span className="frame-corner frame-tl" aria-hidden="true" />
            <span className="frame-corner frame-tr" aria-hidden="true" />
            <span className="frame-corner frame-bl" aria-hidden="true" />
            <span className="frame-corner frame-br" aria-hidden="true" />
            <div className={`detail-image-stage${view.scale > 1 ? " is-zoomed" : ""}${isPanning ? " is-panning" : ""}`}>
              {currentImage && (
                <img
                  key={activeSource}
                  src={activeSource}
                  alt={artwork.title}
                  className="detail-artwork-img"
                  draggable="false"
                  style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
                />
              )}
            </div>
          </div>

          {/* 图片缩略图切换（仅多图时显示） */}
          {images.length > 1 && (
            <div className="detail-image-thumbs">
              {images.map((image, i) => (
                <button
                  key={image.role}
                  className={`detail-image-thumb${activeImage === i ? " is-active" : ""}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`图 ${i + 1}`}
                >
                  <img src={image.path} alt="" />
                </button>
              ))}
            </div>
          )}

          {/* 藏品切换：上一件 / 下一件 */}
          <div className="detail-artwork-nav">
            <button className="detail-artwork-btn" onClick={() => onChange(-1)} aria-label="上一件藏品">
              <ChevronLeft size={15} />
              <span>上一件</span>
            </button>
            <span className="detail-artwork-counter">{idx + 1} / {artworks.length}</span>
            <button className="detail-artwork-btn" onClick={() => onChange(1)} aria-label="下一件藏品">
              <span>下一件</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <p className="detail-img-hint" />
        </div>

        {/* 右侧信息面板 */}
        <div className="detail-info">
          <div className="detail-info-scroll">
            <div className="detail-kicker">
              {detailTags.map(tag => (
                <span key={tag} className="detail-kicker-tag">{tag}</span>
              ))}
            </div>
            <h2 id="detail-title" className="detail-title">{artwork.title}</h2>
            {artwork.aliases.length > 0 && <p className="detail-alias">又名：{artwork.aliases.join("、")}</p>}

            <div className="detail-section-heading"><span>作品赏析</span></div>
            <p className="detail-desc">{artwork.description}</p>
          </div>
          <div className="detail-info-footer">
            <div className="detail-audio-panel">
              <button
                type="button"
                className="detail-audio-btn"
                onClick={toggleAudio}
                disabled={!audioState.ready || Boolean(audioState.error)}
                aria-label={audioState.playing ? "暂停导览" : "播放导览"}
              >
                {audioState.playing ? <Pause size={15} /> : <Volume2 size={15} />}
                <span>{audioState.playing ? "暂停" : "语音讲解"}</span>
              </button>
              <div className="detail-audio-timeline">
                <div className="detail-audio-meta">
                  {audioState.error && <span>{audioState.error}</span>}
                  <span>{formatTime(audioState.current)} / {formatTime(audioState.duration)}</span>
                </div>
                <input
                  className="detail-audio-range"
                  type="range"
                  min="0"
                  max={audioState.duration || 0}
                  step="any"
                  value={isScrubRef.current ? scrubDisplay : Math.min(audioState.current, audioState.duration || 0)}
                  onMouseDown={onScrubStart}
                  onTouchStart={onScrubStart}
                  onChange={onScrubMove}
                  onMouseUp={onScrubEnd}
                  onTouchEnd={onScrubEnd}
                  disabled={!audioState.ready || Boolean(audioState.error)}
                  aria-label="导览音频进度"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片灯箱（全屏单独查看）*/}
      {showLightbox && currentImage && (
        <div className="detail-lightbox" onClick={() => setShowLightbox(false)}>
          <button className="detail-lightbox-close" onClick={() => setShowLightbox(false)} aria-label="关闭">
            <X size={22} />
          </button>
          <img
            src={activeSource}
            alt={artwork.title}
            className="detail-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ── 藏品卡片（横向展览风格）── */
function ArtworkCard({ artwork, onOpen }) {
  return (
    <button className="gallery-card" onClick={() => onOpen(artwork)} aria-label={`查看《${artwork.title}》`}>
      <div className="card-img-wrap">
        <img src={artwork.images[0].path} alt={artwork.title} loading="lazy" className="card-img" />
      </div>
      <div className="card-body">
        <strong className="card-title">{artwork.title}</strong>
        <p className="card-desc">{artwork.description}</p>
        <div className="card-audio-btn">
          <span>查看详情</span>
        </div>
      </div>
    </button>
  );
}

/* ── 主应用 ── */
export default function App() {
  const artworks = useGalleryData();
  const [selected, setSelected] = useState(null);
  const [theme, setTheme] = useState("");
  const [phase, setPhase] = useState(() => window.location.hash === "#maintenance" ? "maintenance" : "category");
  const [introVisible, setIntroVisible] = useState(() => window.location.hash === "#maintenance" ? false : shouldShowOpeningIntro());
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const {
    muted: bgmMuted,
    started: bgmStarted,
    startForOpening: startBgm,
    toggle: toggleBgm,
  } = useBackgroundMusic();

  useEffect(() => {
    let maintenanceClickCount = 0;
    let maintenanceClickTimer = null;

    const openMaintenance = () => {
      setSelected(null);
      setIntroVisible(false);
      setPhase("maintenance");
      window.location.hash = "maintenance";
    };

    const onKey = e => {
      if (e.ctrlKey && e.altKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        openMaintenance();
        return;
      }
      if ((e.key === "f" || e.key === "F") && !selected) {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };

    const onClick = e => {
      if (!e.target.closest?.("[data-maintenance-hotspot]")) return;
      maintenanceClickCount += 1;
      window.clearTimeout(maintenanceClickTimer);
      maintenanceClickTimer = window.setTimeout(() => {
        maintenanceClickCount = 0;
      }, 1000);
      if (maintenanceClickCount >= 3) {
        maintenanceClickCount = 0;
        window.clearTimeout(maintenanceClickTimer);
        openMaintenance();
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(maintenanceClickTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    return artworks.filter(a =>
      (!theme || theme === "全部" || a.theme.name === theme) &&
      (!kw || [a.title, a.description, ...a.aliases].join(" ").toLowerCase().includes(kw))
    );
  }, [artworks, theme, query]);

  const themeOrder = useMemo(() => {
    const names = Array.from(new Set(artworks.map(a => a.theme?.name).filter(Boolean)));
    names.sort((left, right) => {
      const diff = artworks.filter(a => a.theme?.name === right).length - artworks.filter(a => a.theme?.name === left).length;
      return diff || left.localeCompare(right, "zh-Hans-CN");
    });
    return names;
  }, [artworks]);

  useEffect(() => {
    if (!themeOrder.length) return;
    if (!theme || (theme !== "全部" && !themeOrder.includes(theme))) setTheme(themeOrder[0]);
  }, [theme, themeOrder]);

  const changeSelected = offset => {
    setSelected(cur => {
      if (!cur) return cur;
      const idx = filtered.findIndex(a => a.slug === cur.slug);
      return filtered[(idx + offset + filtered.length) % filtered.length];
    });
  };

  const counts = useMemo(() =>
    Object.fromEntries(themeOrder.map(t => [t, artworks.filter(a => a.theme.name === t).length])),
    [artworks, themeOrder]
  );

  const galleryThemeOrder = useMemo(() => ["全部", ...themeOrder], [themeOrder]);

  const categoryCards = useMemo(() => {
    const firstArtwork = artworks[0];
    return themeOrder.map((name, index) => {
      const categoryItems = artworks.filter(a => a.theme.name === name);
      const cover = categoryItems.find(a => a.images?.[0]) || firstArtwork;
      return {
        name,
        desc: "按正式文档类别浏览",
        count: counts[name] || 0,
        imagePath: cover?.images?.[0]?.path,
        num: String(index + 1).padStart(2, "0"),
      };
    });
  }, [artworks, counts, themeOrder]);

  const completeOpening = () => {
    setIntroVisible(false);
    setPhase("category");
  };

  const replayOpening = () => {
    setSelected(null);
    setPhase("category");
    if (window.location.hash === "#maintenance") window.history.replaceState(null, "", window.location.pathname);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroVisible(true);
    }
  };

  const closeMaintenance = () => {
    setSelected(null);
    setPhase("category");
    setIntroVisible(false);
    if (window.location.hash === "#maintenance") window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <div className="app-shell">
      {phase === "maintenance" ? (
        <MaintenanceWorkbench onClose={closeMaintenance} />
      ) : (
        <>
      {introVisible && <OpeningIntroVideo startBgm={startBgm} onComplete={completeOpening} />}
      {phase === "category" && (
        <CategorySelect
          onSelect={(cat) => { setTheme(cat); setPhase("gallery"); }}
          categories={categoryCards}
          toggleBgm={toggleBgm}
          bgmMuted={bgmMuted}
          bgmStarted={bgmStarted}
          inactive={introVisible}
        />
      )}

      {!introVisible && phase === "gallery" && (
        <>
          {/* 顶栏：大字品牌名 + 图标按钮 */}
          <header className="gallery-topbar">
            <div className="topbar-left">
              <button className="topbar-back-btn" onClick={replayOpening} aria-label="回到首页">
                <Home size={18} />
              </button>
              <h1 className="topbar-title" data-maintenance-hotspot title="平阳木版年画·博观集">平阳木版年画·博观集</h1>
            </div>
            <div className="topbar-icons">
              {showSearch ? (
                <label className="topbar-search">
                  <Search size={14} aria-hidden="true" />
                  <input
                    autoFocus
                    type="search" value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="搜索题名、别名…"
                  />
                  <button type="button" onClick={() => { setQuery(""); setShowSearch(false); }} aria-label="关闭搜索">
                    <X size={13} />
                  </button>
                </label>
              ) : (
                <button type="button" className="topbar-icon-btn" onClick={() => setShowSearch(true)} aria-label="搜索">
                  <Search size={18} />
                </button>
              )}
              {bgmStarted && (
                <button type="button" className="topbar-icon-btn" onClick={toggleBgm} aria-label={bgmMuted ? "开启音乐" : "关闭音乐"} title={bgmMuted ? "开启音乐" : "关闭音乐"}>
                  {bgmMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </div>
          </header>

          {/* 导航：独立居中行，下划线激活态 */}
          <div className="gallery-nav-shell">
            <nav className="gallery-nav" aria-label="按题材筛选">
              {galleryThemeOrder.map(t => (
                <button
                  key={t}
                  className={`nav-tab${theme === t ? " is-active" : ""}`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                  <span className="nav-count">{t === "全部" ? artworks.length : (counts[t] || 0)}</span>
                </button>
              ))}
            </nav>
          </div>

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
            toggleBgm={toggleBgm}
            bgmMuted={bgmMuted}
            bgmStarted={bgmStarted}
          />
        </>
      )}
        </>
      )}
    </div>
  );
}
