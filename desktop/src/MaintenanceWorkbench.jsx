import { useEffect, useMemo, useState } from "react";
import { Check, Download, Eye, RotateCcw, Search, Trash2, X } from "lucide-react";
import "./maintenance.css";

const STORAGE_KEY = "pingyang.maintenance.overrides.v2";
const UPDATE_EVENT = "pingyang:gallery-overrides-updated";
const ACCESS_CODE = "pingyang-admin";

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function applyOverride(artwork, override) {
  if (!override) return artwork;
  return {
    ...artwork,
    ...override,
    theme: artwork.theme ? { ...artwork.theme, name: override.category ?? artwork.theme.name } : artwork.theme,
    description: override.content ?? artwork.description,
  };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function MaintenanceGate({ onUnlock, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (code === ACCESS_CODE) onUnlock();
    else setError("入口码不正确");
  };

  return (
    <div className="maint-gate">
      <form className="maint-gate-card" onSubmit={submit}>
        <span className="maint-eyebrow">Data Maintenance</span>
        <h1>平阳木版年画数据维护</h1>
        <p>该页面用于核对正式数据、记录标题/类别/内容/图片修订意见。入口隐藏，不出现在普通展览流程中。</p>
        <label>
          <span>入口码</span>
          <input autoFocus type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="输入维护入口码" />
        </label>
        {error && <p className="maint-error">{error}</p>}
        <div className="maint-gate-actions">
          <button type="button" onClick={onClose}>返回展览</button>
          <button type="submit" className="is-primary">进入维护</button>
        </div>
      </form>
    </div>
  );
}

export default function MaintenanceWorkbench({ onClose }) {
  const [unlocked, setUnlocked] = useState(false);
  const [rawArtworks, setRawArtworks] = useState([]);
  const [report, setReport] = useState(null);
  const [overrides, setOverrides] = useState(loadOverrides);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [changeFilter, setChangeFilter] = useState("全部");
  const [saveState, setSaveState] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/data/official-artworks.json").then((r) => r.json()),
      fetch("/data/official-import-report.json").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([data, importReport]) => {
      const items = data.artworks || [];
      setRawArtworks(items);
      setReport(importReport);
      setSelectedSlug((value) => value || items[0]?.slug || "");
    }).catch(() => {});
  }, []);

  const artworks = useMemo(
    () => rawArtworks.map((artwork) => applyOverride(artwork, overrides[artwork.slug])),
    [rawArtworks, overrides]
  );

  const categories = useMemo(() => ["全部", ...Array.from(new Set(artworks.map((item) => item.category).filter(Boolean))).sort()], [artworks]);
  const selected = artworks.find((item) => item.slug === selectedSlug) || artworks[0];
  const selectedOriginal = rawArtworks.find((item) => item.slug === selected?.slug);
  const selectedOverride = selected ? overrides[selected.slug] || {} : {};
  const dirtyCount = Object.keys(overrides).length;
  const dataIssueCount = artworks.filter((item) => item.issues?.length).length;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selected?.slug]);

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    return artworks.filter((item) => {
      const matchesCategory = category === "全部" || item.category === category;
      const matchesChange =
        changeFilter === "全部" ||
        (changeFilter === "已修改" && Boolean(overrides[item.slug])) ||
        (changeFilter === "未修改" && !overrides[item.slug]);
      const sourceText = `${item.sourceRef?.label || ""} ${item.imageSourceRef?.label || ""}`;
      const matchesQuery = !kw || [item.title, item.category, item.content, sourceText, item.slug].join(" ").toLowerCase().includes(kw);
      return matchesCategory && matchesChange && matchesQuery;
    });
  }, [artworks, category, changeFilter, overrides, query]);

  const updateSelected = (patch) => {
    if (!selected) return;
    setOverrides((current) => {
      const nextPatch = { ...(current[selected.slug] || {}), ...patch, updatedAt: new Date().toISOString() };
      const next = { ...current, [selected.slug]: nextPatch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
      setSaveState("已保存到本机草稿");
      return next;
    });
  };

  const resetSelected = () => {
    if (!selected) return;
    setOverrides((current) => {
      const next = { ...current };
      delete next[selected.slug];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
      setSaveState("已重置当前记录");
      return next;
    });
  };

  const clearDrafts = () => {
    setOverrides({});
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: {} }));
    setSaveState("已清空本机草稿");
  };

  const exportOverrides = () => {
    downloadJson("official-artwork-overrides.json", {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      count: dirtyCount,
      overrides,
    });
  };

  const exportMerged = () => {
    downloadJson("official-artworks-merged-preview.json", {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      artworkCount: artworks.length,
      artworks,
    });
  };

  if (!unlocked) return <MaintenanceGate onUnlock={() => setUnlocked(true)} onClose={onClose} />;

  const currentImage = selected?.images?.[activeImageIndex] || selected?.images?.[0];

  return (
    <div className="maint-root">
      <header className="maint-topbar">
        <div>
          <span className="maint-eyebrow">Pingyang Woodcut Gallery</span>
          <h1>数据维护工作台</h1>
        </div>
        <div className="maint-topbar-actions">
          <span className="maint-save-state">{saveState || `本机草稿 ${dirtyCount} 条`}</span>
          <button onClick={exportOverrides}><Download size={15} />导出变更包</button>
          <button onClick={exportMerged}><Download size={15} />导出合并预览</button>
          <button onClick={clearDrafts}><Trash2 size={15} />清空草稿</button>
          <button onClick={onClose}><X size={16} />返回展览</button>
        </div>
      </header>

      <aside className="maint-sidebar">
        <div className="maint-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题、类别、来源…" />
        </div>
        <div className="maint-filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={changeFilter} onChange={(e) => setChangeFilter(e.target.value)}>
            <option>全部</option>
            <option>已修改</option>
            <option>未修改</option>
          </select>
        </div>
        <div className="maint-stats">
          <span>正式记录 {artworks.length}</span>
          <span>当前筛选 {filtered.length}</span>
          <span>数据状态 {dataIssueCount ? `${dataIssueCount} 条提示` : "已整理"}</span>
        </div>
        <div className="maint-list">
          {filtered.map((item) => (
            <button
              key={item.slug}
              className={`maint-list-item${item.slug === selected?.slug ? " is-active" : ""}${overrides[item.slug] ? " is-dirty" : ""}`}
              onClick={() => setSelectedSlug(item.slug)}
            >
              <img src={item.images?.[0]?.path} alt="" />
              <span>
                <strong>{item.title}</strong>
                <em>{item.category} · {item.sourceRef?.label}</em>
              </span>
              {overrides[item.slug] && <Check size={15} />}
            </button>
          ))}
        </div>
      </aside>

      {selected && (
        <main className="maint-main">
          <section className="maint-preview">
            <div className="maint-image-stage">
              {currentImage ? (
                <img src={currentImage.path} alt={selected.title} />
              ) : (
                <div className="maint-image-empty">暂无图片</div>
              )}
            </div>
            {selected.images?.length > 1 && (
              <div className="maint-thumbs">
                {selected.images.map((image, index) => (
                  <button
                    key={`${image.role}-${index}`}
                    className={`maint-thumb${index === activeImageIndex ? " is-active" : ""}`}
                    onClick={() => setActiveImageIndex(index)}
                    type="button"
                  >
                    <img src={image.path} alt="" />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="maint-source-card">
              <h3><Eye size={15} />来源核对</h3>
              <p><strong>文字：</strong>{selected.sourceRef?.label}</p>
              <p><strong>图片：</strong>{selected.imageSourceRef?.label}</p>
              {selected.imageSourceRef?.title && selected.imageSourceRef.title !== selected.title && (
                <p className="maint-warning">图片来源标题：{selected.imageSourceRef.title}</p>
              )}
              <p><strong>图片数量：</strong>{selected.images?.length || 0} 张</p>
              {currentImage && (
                <>
                  <p><strong>当前图片：</strong>{activeImageIndex + 1} / {selected.images.length} · {currentImage.role}</p>
                  <p><strong>原图：</strong>{currentImage.originalPath}</p>
                </>
              )}
            </div>
          </section>

          <section className="maint-editor">
            <div className="maint-editor-head">
              <div>
                <span className="maint-eyebrow">{selected.slug}</span>
                <h2>{selected.title}</h2>
              </div>
              <div className="maint-editor-actions">
                {selectedOverride.updatedAt && <span>已修改</span>}
                <button onClick={resetSelected}><RotateCcw size={15} />重置</button>
              </div>
            </div>

            <label className="maint-field">
              <span>标题</span>
              <input value={selected.title || ""} onChange={(e) => updateSelected({ title: e.target.value })} />
            </label>
            <label className="maint-field">
              <span>类别</span>
              <input value={selected.category || ""} onChange={(e) => updateSelected({ category: e.target.value })} />
            </label>
            <label className="maint-field">
              <span>内容说明</span>
              <textarea value={selected.content || ""} onChange={(e) => updateSelected({ content: e.target.value })} />
            </label>
            <label className="maint-field">
              <span>图片调整备注</span>
              <textarea
                className="is-small"
                value={selected.imageReviewNote || ""}
                onChange={(e) => updateSelected({ imageReviewNote: e.target.value })}
                placeholder="例如：图片与标题疑似不匹配；需要替换为第 2 张；需要重新裁切……"
              />
            </label>
            <label className="maint-field">
              <span>维护备注</span>
              <textarea
                className="is-small"
                value={selected.maintenanceNote || ""}
                onChange={(e) => updateSelected({ maintenanceNote: e.target.value })}
                placeholder="记录人工核对结论、后续处理建议。"
              />
            </label>

            <div className="maint-compare">
              <h3>原始值对照</h3>
              <p><strong>标题：</strong>{selectedOriginal?.title}</p>
              <p><strong>类别：</strong>{selectedOriginal?.category}</p>
              <p><strong>年代：</strong>{selectedOriginal?.period?.label || "未标注"}</p>
              <p><strong>尺寸：</strong>{selectedOriginal?.dimensions?.sourceText || "未标注"}</p>
              <p><strong>内容：</strong>{selectedOriginal?.content}</p>
            </div>

            <div className="maint-issues">
              <h3>数据状态</h3>
              {selected.issues?.length ? (
                selected.issues.map((issue) => <span key={issue}>{issue}</span>)
              ) : (
                <p><Check size={14} />最终版数据已整理</p>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
