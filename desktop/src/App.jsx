import { useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import OpeningIntroPanorama from "./opening/OpeningIntroPanorama";
import CategorySelect from "./CategorySelect";
import { shouldShowOpeningIntro } from "./opening/openingIntroSession";
import useBackgroundMusic from "./useBackgroundMusic";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  Search,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/* ── 常量 ── */
const THEME_ORDER = ["全部", "戏曲", "神祇", "吉祥", "故事"];
const ORIGINALS_STORAGE_KEY = "pingyang-originals-root";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

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

/* ── 藏品详情覆盖层 ── */
function DetailOverlay({ artwork, artworks, onClose, onChange, libraryRoot, onChooseLibrary, toggleBgm, bgmMuted, bgmStarted }) {
  const [activeImage, setActiveImage] = useState(0);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [originalUrls, setOriginalUrls] = useState({});
  const [originalState, setOriginalState] = useState({ role: null, loading: false, error: "" });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [audioState, setAudioState] = useState({ ready: false, playing: false, current: 0, duration: 0, error: "" });
  const imageAreaRef = useRef(null);
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const didDragRef = useRef(false);
  const objectUrlsRef = useRef([]);
  const loadRequestRef = useRef(0);

  const images = artwork?.images || [];
  const currentImage = images[activeImage] || null;
  const originalUrl = currentImage ? originalUrls[currentImage.role] : null;
  const activeSource = originalUrl || currentImage?.path;

  useEffect(() => {
    if (!artwork?.slug) return undefined;
    const audio = new Audio(`/audio/${artwork.slug}.m4a`);
    audio.preload = "metadata";
    audioRef.current = audio;
    setAudioState({ ready: false, playing: false, current: 0, duration: 0, error: "" });

    const onMetadata = () => setAudioState((state) => ({ ...state, ready: true, duration: audio.duration || 0, error: "" }));
    const onTime = () => setAudioState((state) => ({ ...state, current: audio.currentTime || 0 }));
    const onPlay = () => setAudioState((state) => ({ ...state, playing: true }));
    const onPause = () => setAudioState((state) => ({ ...state, playing: false }));
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
    loadRequestRef.current += 1;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setOriginalUrls({});
    setOriginalState({ role: null, loading: false, error: "" });
    setActiveImage(0);
    setView({ scale: 1, x: 0, y: 0 });
  }, [artwork?.slug]);

  useEffect(() => () => {
    loadRequestRef.current += 1;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 });
    setOriginalState((state) => ({ ...state, error: "" }));
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
    const onFullscreen = () => setIsFullscreen(document.fullscreenElement === imageAreaRef.current);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [artwork, onChange, onClose]);

  if (!artwork) return null;
  const kind = artwork.form?.name || artwork.material?.name || "木版年画";
  const idx = artworks.findIndex(a => a.slug === artwork.slug);

  const changeZoom = (offset) => {
    setView((value) => {
      const scale = Math.max(1, Math.min(6, value.scale + offset));
      return scale === 1 ? { scale, x: 0, y: 0 } : { ...value, scale };
    });
  };

  const loadOriginal = async () => {
    if (!currentImage || originalUrl || originalState.loading) return;
    if (!isTauri()) {
      setOriginalState({ role: currentImage.role, loading: false, error: "本地原图仅在桌面应用中可用" });
      return;
    }

    const requestId = ++loadRequestRef.current;
    setOriginalState({ role: currentImage.role, loading: true, error: "" });
    try {
      const response = await invoke("read_local_image", {
        originalPath: currentImage.originalPath,
        libraryRoot: libraryRoot || null,
      });
      const bytes = response instanceof ArrayBuffer
        ? new Uint8Array(response)
        : response instanceof Uint8Array
          ? response
          : new Uint8Array(response);
      const mimeType = /tiff/i.test(currentImage.mimeType) ? "image/png" : currentImage.mimeType;
      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      if (requestId !== loadRequestRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrlsRef.current.push(url);
      setOriginalUrls((value) => ({ ...value, [currentImage.role]: url }));
      setOriginalState({ role: currentImage.role, loading: false, error: "" });
    } catch (error) {
      if (requestId === loadRequestRef.current) {
        setOriginalState({ role: currentImage.role, loading: false, error: String(error) });
      }
    }
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

  const toggleImageFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else imageAreaRef.current?.requestFullscreen?.();
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

  const seekAudio = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(event.target.value);
    setAudioState((state) => ({ ...state, current: audio.currentTime }));
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
            {/* 缩略图不用工具栏 */}
            {(originalUrl || originalState.error) && (
              <div className={`original-image-status${originalState.error ? " is-error" : ""}`}>
                {originalState.error
                  ? <><span>{originalState.error}</span><button type="button" onClick={onChooseLibrary}>选择原图库</button></>
                  : <span>本地原图 · {currentImage.width} × {currentImage.height}</span>
                }
              </div>
            )}
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
              <span className="detail-kicker-tag">{artwork.theme.name}</span>
              <span className="detail-kicker-tag">{kind}</span>
              <span className="detail-kicker-tag">{artwork.period.label}</span>
            </div>
            <h2 id="detail-title" className="detail-title">{artwork.title}</h2>
            {artwork.aliases.length > 0 && <p className="detail-alias">又名：{artwork.aliases.join("、")}</p>}

            <div className="detail-section-heading"><span>作品赏析</span></div>
            <p className="detail-desc">{artwork.description}</p>
          </div>
          <div className="detail-info-footer">
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
  const [theme, setTheme] = useState("全部");
  const [phase, setPhase] = useState("category");
  const [introVisible, setIntroVisible] = useState(shouldShowOpeningIntro);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const {
    muted: bgmMuted,
    started: bgmStarted,
    startForOpening: startBgm,
    toggle: toggleBgm,
  } = useBackgroundMusic();
  const [libraryRoot, setLibraryRoot] = useState(() => {
    try {
      return window.localStorage.getItem(ORIGINALS_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const chooseOriginalLibrary = async () => {
    if (!isTauri()) return;
    const selectedDirectory = await open({
      directory: true,
      multiple: false,
      title: "选择 assets/originals 原始图片文件夹",
    });
    if (typeof selectedDirectory !== "string") return;
    setLibraryRoot(selectedDirectory);
    try {
      window.localStorage.setItem(ORIGINALS_STORAGE_KEY, selectedDirectory);
    } catch {
      // The selected folder still works for the current application session.
    }
  };

  const toggleAppFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

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

  const completeOpening = () => {
    setIntroVisible(false);
    setPhase("category");
  };

  const replayOpening = () => {
    setSelected(null);
    setPhase("category");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroVisible(true);
    }
  };

  return (
    <div className="app-shell">
      {introVisible && <OpeningIntroPanorama startBgm={startBgm} onComplete={completeOpening} />}
      {!introVisible && phase === "category" && (
        <CategorySelect
          onSelect={(cat) => { setTheme(cat); setPhase("gallery"); }}
          toggleBgm={toggleBgm}
          bgmMuted={bgmMuted}
          bgmStarted={bgmStarted}
        />
      )}

      {!introVisible && phase === "gallery" && (
        <>
          {/* 顶栏：大字品牌名 + 图标按钮 */}
          <header className="gallery-topbar">
            <div className="topbar-left">
              <button className="topbar-back-btn" onClick={replayOpening} aria-label="重播开屏动画">
                <ChevronLeft size={18} />
              </button>
              <h1 className="topbar-title">平阳木版年画·博观集</h1>
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
          <nav className="gallery-nav" aria-label="按题材筛选">
            {THEME_ORDER.map(t => (
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
            libraryRoot={libraryRoot}
            onChooseLibrary={chooseOriginalLibrary}
            toggleBgm={toggleBgm}
            bgmMuted={bgmMuted}
            bgmStarted={bgmStarted}
          />
        </>
      )}
    </div>
  );
}
