import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LeaderboardConfig, LeaderboardFrameItem } from "./OcentraLeaderboardPage";

interface NumberControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

interface BooleanControlProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  onReset: () => void;
}

interface OcentraLeaderboardControlsProps {
  cfg: LeaderboardConfig;
  setCfg: Dispatch<SetStateAction<LeaderboardConfig>>;
  defaultConfig: LeaderboardConfig;
}

function NumberControl({ label, value, min, max, step = 1, onChange, onReset }: NumberControlProps) {
  return <label className="number-control">
    <span>{label}</span>
    <input className="range-input" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <input className="number-input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <button type="button" className="reset-button" onClick={onReset} title={`Reset ${label}`}>Reset</button>
  </label>;
}

function BooleanControl({ label, checked, onChange, onReset }: BooleanControlProps) {
  return <label className="boolean-control">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <button type="button" className="reset-button" onClick={onReset} title={`Reset ${label}`}>Reset</button>
  </label>;
}

function layoutExport(cfg: LeaderboardConfig) {
  return { frames: cfg.frames, carousel: cfg.carousel };
}

function applyInnerGap(frame: LeaderboardFrameItem, gap: number): LeaderboardFrameItem {
  return {
    ...frame,
    innerGap: gap,
    innerWidth: Math.max(0, frame.width - gap * 2),
    innerHeight: Math.max(0, frame.height - gap * 2),
  };
}

function findFrameIndex(frames: LeaderboardFrameItem[], match: string) {
  const index = frames.findIndex((frame) => frame.name.trim().toLowerCase() === match);
  return Math.max(0, index);
}

export function OcentraLeaderboardControls({ cfg, setCfg, defaultConfig }: OcentraLeaderboardControlsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionTab, setSectionTab] = useState("main");
  const [sectionSubTab, setSectionSubTab] = useState("frame");
  const [copyText, setCopyText] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [controlTab, setControlTab] = useState("frames");
  const frames = cfg.frames;
  const sectionIndexById: Record<string, number> = {
    main: findFrameIndex(frames, "main center"),
    left: findFrameIndex(frames, "left sidebar"),
    top: findFrameIndex(frames, "toppanel"),
    right: findFrameIndex(frames, "right sidebar"),
  };
  const selectedIndex = Math.min(activeIndex, frames.length - 1);
  const active = frames[selectedIndex] ?? frames[0];
  const defaultFrame = defaultConfig.frames[0];

  const updateFrame = <K extends keyof LeaderboardFrameItem>(key: K, value: LeaderboardFrameItem[K]) => setCfg((old) => ({
    ...old,
    frames: old.frames.map((frame, index) => index === selectedIndex ? { ...frame, [key]: value } : frame),
  }));

  const updateFramePatch = (patch: Partial<LeaderboardFrameItem>) => setCfg((old) => ({
    ...old,
    frames: old.frames.map((frame, index) => index === selectedIndex ? { ...frame, ...patch } : frame),
  }));

  const updateCarousel = <K extends keyof LeaderboardConfig["carousel"]>(key: K, value: LeaderboardConfig["carousel"][K]) => setCfg((old) => ({
    ...old,
    carousel: { ...old.carousel, [key]: value },
  }));

  const setWidthWithBulges = (value: number) => {
    const topReserve = defaultFrame.width - defaultFrame.topBulgeWidth;
    const bottomReserve = defaultFrame.width - defaultFrame.bottomBulgeWidth;
    updateFramePatch({
      width: value,
      innerWidth: Math.max(0, value - active.innerGap * 2),
      topBulgeWidth: Math.max(0, value - topReserve),
      bottomBulgeWidth: Math.max(0, value - bottomReserve),
    });
  };

  const setHeightWithInner = (value: number) => {
    updateFramePatch({ height: value, innerHeight: Math.max(0, value - active.innerGap * 2) });
  };

  const setInnerGap = (value: number) => {
    updateFramePatch(applyInnerGap(active, value));
  };

  const duplicateActive = () => {
    const source = frames[selectedIndex] ?? frames[0];
    const nextIndex = frames.length;
    const copy = { ...source, id: `${source.id}-copy-${Date.now()}`, name: `${source.name} Copy` };
    setCfg((old) => ({ ...old, frames: [...old.frames, copy] }));
    setActiveIndex(nextIndex);
  };

  const deleteActive = () => setCfg((old) => {
    if (old.frames.length <= 1) return old;
    const next = old.frames.filter((_, index) => index !== selectedIndex);
    setActiveIndex(Math.max(0, selectedIndex - 1));
    return { ...old, frames: next };
  });

  const copyValues = async () => {
    const text = JSON.stringify(layoutExport(cfg), null, 2);
    setCopyText(text);

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(textarea);
      return ok;
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatus("Copied to clipboard.");
        return;
      }
    } catch {
      // Fall through to old-school copy below.
    }

    if (fallbackCopy()) {
      setCopyStatus("Copied using fallback copy.");
      return;
    }

    setCopyStatus("Copy is blocked here. Select the text below and press Ctrl+C.");
  };

  return <div className="controls-panel">
    <div className="controls-header">
      <div className="controls-title">Page Section Controls</div>
      <div className="button-row">
        <button className="primary-button" onClick={duplicateActive}>Duplicate</button>
        <button className="secondary-button" onClick={deleteActive}>Delete</button>
        <button className="primary-button" onClick={copyValues}>Copy</button>
        <button className="primary-button" onClick={() => { setCfg(defaultConfig); setActiveIndex(0); setCopyText(""); setCopyStatus(""); }}>Reset</button>
      </div>
    </div>
    <div className="tab-row">
      {[
        ["main", "Main Center"],
        ["left", "Left Sidepanel"],
        ["top", "Top Panel"],
        ["right", "Right Sidepanel"],
        ["carousel", "Carousel"],
      ].map(([id, label]) => <button key={id} className={sectionTab === id ? "tab-button active" : "tab-button"} onClick={() => {
        setSectionTab(id);
        setControlTab(id === "carousel" ? "carousel" : "frames");
        setSectionSubTab("frame");
        if (id !== "carousel") setActiveIndex(sectionIndexById[id]);
      }}>{label}</button>)}
    </div>
    {sectionTab !== "carousel" && <div className="tab-row sub-tabs">
      <button className={sectionSubTab === "frame" ? "tab-button active" : "tab-button"} onClick={() => setSectionSubTab("frame")}>Frame Style</button>
      <button className="tab-button disabled" disabled>Content Later</button>
    </div>}
    {controlTab === "frames" && sectionSubTab === "frame" && <>
      <div className="name-control">
        <span>Name</span>
        <input value={active.name} onChange={(event) => updateFrame("name", event.target.value)} />
      </div>
      <div className="control-grid">
        <NumberControl label="X" value={active.x} min={-1000} max={1000} onChange={(value) => updateFrame("x", value)} onReset={() => updateFrame("x", defaultFrame.x)} />
        <NumberControl label="Y" value={active.y} min={-600} max={600} onChange={(value) => updateFrame("y", value)} onReset={() => updateFrame("y", defaultFrame.y)} />
        <NumberControl label="Scale" value={active.scale} min={0.1} max={1.4} step={0.001} onChange={(value) => updateFrame("scale", value)} onReset={() => updateFrame("scale", defaultFrame.scale)} />
        <NumberControl label="Width" value={active.width} min={100} max={2400} onChange={setWidthWithBulges} onReset={() => updateFramePatch({ width: defaultFrame.width, innerWidth: defaultFrame.innerWidth, topBulgeWidth: defaultFrame.topBulgeWidth, bottomBulgeWidth: defaultFrame.bottomBulgeWidth })} />
        <NumberControl label="Height" value={active.height} min={100} max={1600} onChange={setHeightWithInner} onReset={() => updateFramePatch({ height: defaultFrame.height, innerHeight: defaultFrame.innerHeight })} />
        <NumberControl label="Inner Gap" value={active.innerGap} min={0} max={120} onChange={setInnerGap} onReset={() => updateFramePatch(applyInnerGap(active, defaultFrame.innerGap))} />
        <NumberControl label="Top Bulge W" value={active.topBulgeWidth} min={0} max={2400} onChange={(value) => updateFrame("topBulgeWidth", value)} onReset={() => updateFrame("topBulgeWidth", defaultFrame.topBulgeWidth)} />
        <NumberControl label="Top Bulge H" value={active.topBulgeHeight} min={0} max={160} onChange={(value) => updateFrame("topBulgeHeight", value)} onReset={() => updateFrame("topBulgeHeight", defaultFrame.topBulgeHeight)} />
        <NumberControl label="Bottom Bulge W" value={active.bottomBulgeWidth} min={0} max={2400} onChange={(value) => updateFrame("bottomBulgeWidth", value)} onReset={() => updateFrame("bottomBulgeWidth", defaultFrame.bottomBulgeWidth)} />
        <NumberControl label="Bottom Bulge H" value={active.bottomBulgeHeight} min={0} max={160} onChange={(value) => updateFrame("bottomBulgeHeight", value)} onReset={() => updateFrame("bottomBulgeHeight", defaultFrame.bottomBulgeHeight)} />
        <NumberControl label="Thick Width" value={active.thickSegmentWidth} min={0.5} max={40} step={0.1} onChange={(value) => updateFrame("thickSegmentWidth", value)} onReset={() => updateFrame("thickSegmentWidth", defaultFrame.thickSegmentWidth)} />
        <NumberControl label="Thin Width" value={active.thinSegmentWidth} min={0.2} max={12} step={0.1} onChange={(value) => updateFrame("thinSegmentWidth", value)} onReset={() => updateFrame("thinSegmentWidth", defaultFrame.thinSegmentWidth)} />
        <NumberControl label="Corner Cut" value={active.cornerCut} min={0} max={220} onChange={(value) => updateFrame("cornerCut", value)} onReset={() => updateFrame("cornerCut", defaultFrame.cornerCut)} />
        <BooleanControl label="Inner Frame" checked={active.showInnerFrame ?? true} onChange={(value) => updateFrame("showInnerFrame", value)} onReset={() => updateFrame("showInnerFrame", defaultFrame.showInnerFrame ?? true)} />
      </div>
    </>}
    {controlTab === "carousel" && <div className="carousel-controls">
      <div className="small-heading">Carousel Controls</div>
      <div className="control-grid">
        <BooleanControl label="Enabled" checked={cfg.carousel.enabled} onChange={(value) => updateCarousel("enabled", value)} onReset={() => updateCarousel("enabled", defaultConfig.carousel.enabled)} />
        <NumberControl label="Count" value={cfg.carousel.count} min={1} max={12} onChange={(value) => updateCarousel("count", value)} onReset={() => updateCarousel("count", defaultConfig.carousel.count)} />
        <NumberControl label="Start X" value={cfg.carousel.startX} min={-1200} max={300} onChange={(value) => updateCarousel("startX", value)} onReset={() => updateCarousel("startX", defaultConfig.carousel.startX)} />
        <NumberControl label="Y" value={cfg.carousel.y} min={-200} max={700} onChange={(value) => updateCarousel("y", value)} onReset={() => updateCarousel("y", defaultConfig.carousel.y)} />
        <NumberControl label="Gap" value={cfg.carousel.gap} min={80} max={500} onChange={(value) => updateCarousel("gap", value)} onReset={() => updateCarousel("gap", defaultConfig.carousel.gap)} />
        <NumberControl label="Width" value={cfg.carousel.width} min={80} max={600} onChange={(value) => updateCarousel("width", value)} onReset={() => updateCarousel("width", defaultConfig.carousel.width)} />
        <NumberControl label="Height" value={cfg.carousel.height} min={40} max={300} onChange={(value) => updateCarousel("height", value)} onReset={() => updateCarousel("height", defaultConfig.carousel.height)} />
        <NumberControl label="Corner" value={cfg.carousel.cornerCut} min={0} max={120} onChange={(value) => updateCarousel("cornerCut", value)} onReset={() => updateCarousel("cornerCut", defaultConfig.carousel.cornerCut)} />
        <NumberControl label="Arrow Gap" value={cfg.carousel.arrowGap} min={0} max={140} onChange={(value) => updateCarousel("arrowGap", value)} onReset={() => updateCarousel("arrowGap", defaultConfig.carousel.arrowGap)} />
        <NumberControl label="Thick" value={cfg.carousel.thickSegmentWidth} min={0.5} max={30} step={0.1} onChange={(value) => updateCarousel("thickSegmentWidth", value)} onReset={() => updateCarousel("thickSegmentWidth", defaultConfig.carousel.thickSegmentWidth)} />
        <NumberControl label="Thin" value={cfg.carousel.thinSegmentWidth} min={0.2} max={10} step={0.1} onChange={(value) => updateCarousel("thinSegmentWidth", value)} onReset={() => updateCarousel("thinSegmentWidth", defaultConfig.carousel.thinSegmentWidth)} />
      </div>
    </div>}
    {copyStatus && <div className="copy-status">{copyStatus}</div>}
    {copyText && <textarea className="copy-output" value={copyText} readOnly onFocus={(event) => event.currentTarget.select()} />}
  </div>;
}
