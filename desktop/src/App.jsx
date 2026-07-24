import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/* ── 常量 ── */
const THEME_ORDER = ["全部", "戏曲", "神祇", "吉祥", "故事"];
const INTRO_KEY = "pingyang-intro-seen";
const ORIGINALS_STORAGE_KEY = "pingyang-originals-root";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function shouldShowOpeningIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (new URLSearchParams(window.location.search).get("intro") === "1") return true;
  try {
    // 页面 reload（开发热重载 / Cmd+R）时清除标记，让动画重播
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav?.type === "reload") window.sessionStorage.removeItem(INTRO_KEY);
    return window.sessionStorage.getItem(INTRO_KEY) !== "1";
  } catch {
    return true;
  }
}

function markOpeningIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted webviews.
  }
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

/* ── 开场门扉动画 ── */
function OpeningIntro() {
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

  // 走廊透视布局：全部选单图作品（有 primary.webp）
  const CORRIDOR = [
    { slug: "py-001", x: -420, y: -80,  scale: 0.42, rot: 14 },
    { slug: "py-014", x: -305, y: 48,   scale: 0.64, rot: 9  },
    { slug: "py-025", x: -162, y: 148,  scale: 0.87, rot: 4  },
    { slug: "py-030", x:  162, y: 148,  scale: 0.87, rot: -4 },
    { slug: "py-088", x:  305, y: 48,   scale: 0.64, rot: -9 },
    { slug: "py-091", x:  420, y: -80,  scale: 0.42, rot: -14},
  ];

  useEffect(() => {
    if (!visible || !containerRef.current) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // GSAP 直接管理透视，不依赖 CSS perspective
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

    const tl = gsap.timeline();
    timelineRef.current = tl;

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
      // 向内开门
      .to(leftDoorRef.current, { rotateY: 95, duration: 2.2, ease: "power3.inOut" }, "-=0.5")
      .to(rightDoorRef.current, { rotateY: -95, duration: 2.2, ease: "power3.inOut" }, "<")
      // 门打开同时：走廊背景淡入
      .to(doorBgRef.current, { opacity: 1, duration: 1.0, ease: "power2.out" }, "<0.3")
      // 走廊画作从中心点向左右飞出（透视走廊感）
      .to(corridorArtsRef.current.filter(Boolean), {
        scale: (i) => CORRIDOR[i].scale,
        x: (i) => CORRIDOR[i].x,
        y: (i) => CORRIDOR[i].y,
        rotation: (i) => CORRIDOR[i].rot,
        opacity: 1,
        duration: 1.6,
        stagger: { each: 0.07, from: "center" },
        ease: "power2.out",
      }, "<0.2")
      // 停留片刻让用户欣赏走廊
      .to({}, { duration: 1.2 })
      // 走廊整体缓缓淡出，光线收敛
      .to([doorBgRef.current, lightCrackRef.current, doorGlowRef.current], {
        opacity: 0, duration: 1.2, ease: "power2.inOut",
      })
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
      document.body.style.overflow = orig;
      timelineRef.current = null;
      tl.kill();
    };
  }, [visible]);

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
        {CORRIDOR.map((item, i) => (
          <img
            key={item.slug}
            ref={el => { corridorArtsRef.current[i] = el; }}
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
function DetailOverlay({ artwork, artworks, onClose, onChange, libraryRoot, onChooseLibrary }) {
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
          <span>平阳木版年画</span>
        </button>
        <h1 className="detail-topbar-title">藏品详情</h1>
        <div className="detail-topbar-icons">
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
            {/* 缩放工具栏（叠加在图片右上角） */}
            <div className="image-toolbar" aria-label="图像工具">
              <button type="button" onClick={() => changeZoom(-0.25)} disabled={view.scale <= 1} aria-label="缩小"><ZoomOut size={16} /></button>
              <span>{Math.round(view.scale * 100)}%</span>
              <button type="button" onClick={() => changeZoom(0.25)} disabled={view.scale >= 6} aria-label="放大"><ZoomIn size={16} /></button>
              <button type="button" onClick={() => setView({ scale: 1, x: 0, y: 0 })} aria-label="重置"><RotateCcw size={15} /></button>
            </div>
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
          <Volume2 size={15} />
          <span>语音讲解</span>
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
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

  return (
    <div className="app-shell">
      <OpeningIntro />

      {/* 顶栏：大字品牌名 + 图标按钮 */}
      <header className="gallery-topbar">
        <h1 className="topbar-title">平阳木版年画</h1>
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
      />
    </div>
  );
}
