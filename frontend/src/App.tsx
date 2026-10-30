
import { useEffect, useRef, useState } from "react";
import "./App.css";

type HistoryItem = {
  id: string;
  type?: "image" | "video";
  prompt: string;
  image?: string;
  video?: string;
  ratio: string;
  resolution?: string;
  duration?: number;
  createdAt: string;
};

const HISTORY_KEY = "foxican-ai-history";
const MAX_HISTORY = 15;
const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getImageSource(image: unknown): string {
  if (typeof image !== "string" || !image.trim()) {
    throw new Error("The image API did not return a valid image.");
  }

  const value = image.trim();

  if (
    value.startsWith("data:image/") ||
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  // Cloudflare commonly returns a raw Base64 JPEG.
  return `data:image/jpeg;base64,${value.replace(/\s/g, "")}`;
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return localStorage.getItem("foxican-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("foxican-theme", theme);
    } catch {
      // Theme still works for the current session.
    }
  }, [theme]);

  const [page, setPage] = useState<"create" | "history">("create");
  const [mode, setMode] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [quality, setQuality] = useState("Standard");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);

  const generatedVideoRef = useRef<HTMLVideoElement>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (!saved) return [];

      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item): item is HistoryItem =>
            item !== null &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.prompt === "string" &&
            (typeof item.image === "string" ||
              typeof item.video === "string")
        )
        .map((item) => ({
          ...item,
          type: item.type || (item.video ? "video" : "image"),
        }))
        .slice(0, MAX_HISTORY);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      setMessage(
        "Storage is full. Delete some older history items to save new creations."
      );
    }
  }, [history]);

  function addToHistory(item: HistoryItem) {
    setHistory((previous) =>
      [item, ...previous].slice(0, MAX_HISTORY)
    );
  }

  // -------------------- IMAGE GENERATION --------------------

  async function generateImage() {
    if (!prompt.trim()) {
      setMessage("Please enter a prompt before generating an image.");
      return;
    }

    setLoading(true);
    setMessage("");
    setGeneratedImage("");
    setGeneratedVideo("");
    setImageLoadError(false);

    try {
      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: ratio,
          quality,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            `Request failed (${response.status})`
        );
      }

      const rawImage =
        data.image ||
        data.image_url ||
        data.data?.image;

      const imageSource = getImageSource(rawImage);

      setGeneratedImage(imageSource);

      addToHistory({
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type: "image",
        prompt: prompt.trim(),
        image: imageSource,
        ratio,
        createdAt: new Date().toLocaleString(),
      });

      setMessage("Image received. Loading preview...");
    } catch (error) {
      setMessage(
        `Image generation failed: ${
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleImageLoaded() {
    setImageLoadError(false);
    setMessage("Image generated and loaded successfully!");
  }

  function handleImageError() {
    setImageLoadError(true);
    setMessage(
      "The API returned an image, but the browser could not display it. Check the image data returned by the backend."
    );
  }

  // -------------------- VIDEO GENERATION --------------------

  async function generateVideo() {
    if (!prompt.trim()) {
      setMessage("Please enter a prompt before generating a video.");
      return;
    }

    setLoading(true);
    setMessage("Connecting to the video generation model...");
    setGeneratedImage("");
    setGeneratedVideo("");
    setImageLoadError(false);

    const supportedVideoRatios = [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
    ];

    const videoRatio = supportedVideoRatios.includes(ratio)
      ? ratio
      : "16:9";

    const videoResolution =
      quality === "Full HD" ? "1080P" : "720P";

    try {
      const response = await fetch(`${API_URL}/api/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ratio: videoRatio,
          resolution: videoResolution,
          duration,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            `Request failed (${response.status})`
        );
      }

      if (
        typeof data.video_url !== "string" ||
        !data.video_url.startsWith("https://")
      ) {
        throw new Error(
          "The video API did not return a valid HTTPS video URL."
        );
      }

      setGeneratedVideo(data.video_url);

      addToHistory({
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type: "video",
        prompt: prompt.trim(),
        video: data.video_url,
        ratio: data.ratio || videoRatio,
        resolution: data.resolution || videoResolution,
        duration: data.duration || duration,
        createdAt: new Date().toLocaleString(),
      });

      setMessage(
        `Video generated successfully. Provider status: ${
          data.state || "Completed"
        }.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setMessage(
        errorMessage.includes("Failed to fetch")
          ? "Cannot connect to the backend. Make sure FastAPI is running at http://127.0.0.1:8000."
          : `Video generation failed: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------- DOWNLOAD --------------------

  async function downloadMedia(url: string, filename: string) {
    if (!url) {
      setMessage("The media file is not available to download.");
      return;
    }

    try {
      // Convert data URLs and accessible URLs into a Blob download.
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Could not retrieve the media file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      // Fallback for providers that block cross-origin fetch.
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  // -------------------- COPY PROMPT --------------------

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Prompt copied successfully!");
    } catch {
      setCopyMessage(
        "Copy failed. Please copy the prompt manually."
      );
    }
  }

  // -------------------- HISTORY MANAGEMENT --------------------

  function deleteHistoryItem(id: string) {
    setHistory((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (previewItem?.id === id) {
      setPreviewItem(null);
    }
  }

  function clearHistory() {
    if (history.length === 0) return;

    if (
      window.confirm(
        "Are you sure you want to clear all saved creations?"
      )
    ) {
      setHistory([]);
      setPreviewItem(null);
      setMessage("History cleared successfully.");
    }
  }

  function reusePrompt(item: HistoryItem) {
    setPrompt(item.prompt);
    setMode(item.type === "video" ? "video" : "image");

    const supportedRatios =
      item.type === "video"
        ? ["16:9", "9:16", "1:1", "4:3"]
        : ["1:1", "16:9", "9:16", "4:3", "3:2"];

    setRatio(
      supportedRatios.includes(item.ratio)
        ? item.ratio
        : "1:1"
    );

    setDuration(item.duration || 60);

    setGeneratedImage("");
    setGeneratedVideo("");
    setImageLoadError(false);
    setMessage(
      "Prompt loaded. Edit it if needed, then generate again."
    );
    setCopyMessage("");
    setPreviewItem(null);
    setPage("create");
  }

  function handleGenerate() {
    if (loading) return;

    if (mode === "video") {
      void generateVideo();
    } else {
      void generateImage();
    }
  }

  const isError =
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("cannot connect") ||
    message.toLowerCase().includes("please enter") ||
    message.toLowerCase().includes("timed out") ||
    message.toLowerCase().includes("could not display");

  // -------------------- MAIN UI --------------------

  return (
    <div className={`app-shell ${theme}-theme`}>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => {
            setPage("create");
            setMessage("");
          }}
        >
          <img
            className="brand-logo"
            src="/foxican-logo.png"
            alt="FOXICAN AI logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          <span className="brand-name">
            FOXICAN <span>AI</span>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={`nav-item ${
            page === "create" ? "active" : ""
          }`}
          onClick={() => setPage("create")}
        >
          <span className="nav-icon">✳</span>
          Create
        </button>

        <button
          className={`nav-item ${
            page === "history" ? "active" : ""
          }`}
          onClick={() => {
            setPage("history");
            setCopyMessage("");
          }}
        >
          <span className="nav-icon">▧</span>
          History
          <span className="nav-count">{history.length}</span>
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot" />

          <div>
            <strong>FOXICAN AI</strong>
            <p>AI Creation Studio</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              YOUR CREATIVE SPACE
            </span>

            <h2>
              {page === "create" ? "AI Studio" : "Your Gallery"}
            </h2>
          </div>

          <div className="topbar-right">
            <span className="online-indicator" />
            Workspace Ready

            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setTheme((previous) =>
                  previous === "dark" ? "light" : "dark"
                )
              }
              title={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } theme`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </header>

        {page === "create" ? (
          <section className="create-page">
            <div className="hero">
              <div className="hero-badge">
                <span>✦</span> AI-POWERED CREATION
              </div>

              <h1>
                Imagine it.
                <br />
                <span>Create it.</span>
              </h1>

              <p>
                Turn your ideas into images and videos with
                FOXICAN AI. Describe your imagination and let
                AI bring it to life.
              </p>
            </div>

            <div className="creator-layout">
              <div className="creator-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-eyebrow">
                      01 / GENERATOR
                    </span>
                    <h3>Create something amazing</h3>
                  </div>

                  <span className="ai-chip">AI STUDIO</span>
                </div>

                <div className="field-group">
                  <label className="field-label">
                    Creation mode
                  </label>

                  <div className="mode-switch">
                    <button
                      className={
                        mode === "image" ? "selected" : ""
                      }
                      onClick={() => {
                        setMode("image");
                        setMessage("");
                        setGeneratedVideo("");
                      }}
                    >
                      <span>▧</span> Image
                    </button>

                    <button
                      className={
                        mode === "video" ? "selected" : ""
                      }
                      onClick={() => {
                        setMode("video");
                        setMessage("");
                        setGeneratedImage("");
                        setImageLoadError(false);
                      }}
                    >
                      <span>▷</span> Video
                      <span className="soon-tag live-tag">
                        LIVE
                      </span>
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <div className="label-row">
                    <label
                      htmlFor="prompt"
                      className="field-label"
                    >
                      Describe your imagination
                    </label>

                    <span className="character-count">
                      {prompt.length}/2500
                    </span>
                  </div>

                  <textarea
                    id="prompt"
                    className="prompt-input"
                    placeholder={
                      mode === "video"
                        ? "A cinematic shot of a futuristic city at night, flying cars, neon reflections, slow camera movement..."
                        : "A futuristic city floating above the clouds at sunset, cinematic lighting, highly detailed..."
                    }
                    value={prompt}
                    onChange={(event) =>
                      setPrompt(event.target.value)
                    }
                    maxLength={2500}
                    rows={6}
                  />

                  <div className="prompt-tip">
                    <span>✦</span>

                    {mode === "video"
                      ? "Describe the action, camera movement, scene and visual style."
                      : "Include the subject, style, lighting and mood."}
                  </div>
                </div>

                <div className="settings-grid">
                  <div className="field-group">
                    <label
                      htmlFor="ratio"
                      className="field-label"
                    >
                      Aspect ratio
                    </label>

                    <select
                      id="ratio"
                      value={ratio}
                      onChange={(event) =>
                        setRatio(event.target.value)
                      }
                      className="select-input"
                    >
                      {mode === "video" ? (
                        <>
                          <option value="16:9">
                            16:9 · Landscape
                          </option>
                          <option value="9:16">
                            9:16 · Portrait
                          </option>
                          <option value="1:1">
                            1:1 · Square
                          </option>
                          <option value="4:3">
                            4:3 · Classic
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="1:1">
                            1:1 · Square
                          </option>
                          <option value="16:9">
                            16:9 · Landscape
                          </option>
                          <option value="9:16">
                            9:16 · Portrait
                          </option>
                          <option value="4:3">
                            4:3 · Classic
                          </option>
                          <option value="3:2">
                            3:2 · Photo
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="field-group">
                    <label
                      htmlFor="quality"
                      className="field-label"
                    >
                      {mode === "video"
                        ? "Video resolution"
                        : "Quality preference"}
                    </label>

                    <select
                      id="quality"
                      value={quality}
                      onChange={(event) =>
                        setQuality(event.target.value)
                      }
                      className="select-input"
                    >
                      {mode === "video" ? (
                        <>
                          <option value="Standard">
                            720P · Standard
                          </option>
                          <option value="Full HD">
                            1080P · Full HD
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="Standard">
                            Standard
                          </option>
                          <option value="High">High</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {mode === "video" && (
                  <div className="field-group">
                    <label
                      htmlFor="duration"
                      className="field-label"
                    >
                      Video duration
                    </label>

                    <select
                      id="duration"
                      className="select-input"
                      value={duration}
                      onChange={(event) =>
                        setDuration(Number(event.target.value))
                      }
                    >
                      <option value={10}>10 seconds</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={40}>40 seconds</option>
                      <option value={50}>50 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>

                    <p className="setting-note">
                      Creates a slideshow with AI-generated
                      scenes based on your selected duration.
                    </p>
                  </div>
                )}

                <button
                  className="generate-button"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      {mode === "video"
                        ? "Generating video..."
                        : "Generating image..."}
                    </>
                  ) : (
                    <>
                      <span>✦</span>
                      Generate{" "}
                      {mode === "video" ? "Video" : "Image"}
                      <span>→</span>
                    </>
                  )}
                </button>

                <p className="generation-note">
                  Your creations are saved in History. Maximum{" "}
                  {MAX_HISTORY} items.
                </p>

                {message && (
                  <div
                    className={`feedback ${
                      isError ? "feedback-error" : ""
                    }`}
                    role="status"
                  >
                    {message}
                  </div>
                )}
              </div>

              <div className="result-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-eyebrow">
                      02 / CANVAS
                    </span>
                    <h3>Your creation</h3>
                  </div>

                  <span className="canvas-status">
                    <span />
                    {loading ? "GENERATING" : "LIVE CANVAS"}
                  </span>
                </div>

                {loading ? (
                  <div className="canvas-placeholder loading-canvas">
                    <div className="loading-orbit">
                      <span>✦</span>
                    </div>

                    <h3>
                      Creating your{" "}
                      {mode === "video" ? "video" : "vision"}
                    </h3>

                    <p>
                      {mode === "video"
                        ? "The video model is processing your prompt. This can take a few minutes."
                        : "AI is turning your prompt into an image..."}
                    </p>

                    <div className="loading-bar">
                      <span />
                    </div>
                  </div>
                ) : generatedVideo ? (
                  <div className="generated-result">
                    <div className="generated-video-wrapper">
                      <video
                        ref={generatedVideoRef}
                        className="generated-video"
                        src={generatedVideo}
                        controls
                        playsInline
                        preload="metadata"
                      >
                        Your browser does not support video playback.
                      </video>

                      <button
                        type="button"
                        className="secondary-button fullscreen-button"
                        onClick={() => {
                          const video = generatedVideoRef.current;

                          if (video?.requestFullscreen) {
                            void video.requestFullscreen();
                          } else if (
                            video &&
                            "webkitEnterFullscreen" in video
                          ) {
                            (
                              video as HTMLVideoElement & {
                                webkitEnterFullscreen: () => void;
                              }
                            ).webkitEnterFullscreen();
                          }
                        }}
                      >
                        ⛶ Fullscreen
                      </button>
                    </div>

                    <p className="history-prompt preview-prompt">
                      {prompt}
                    </p>

                    <div className="video-info">
                      <span>{duration}s video</span>
                      <span>
                        {quality === "Full HD" ? "1080P" : "720P"}
                      </span>
                    </div>

                    <div className="result-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          void downloadMedia(
                            generatedVideo,
                            `foxican-${Date.now()}.mp4`
                          )
                        }
                      >
                        ↓ Download video
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() => setPage("history")}
                      >
                        View gallery →
                      </button>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="generated-result">
                    {imageLoadError ? (
                      <div className="image-error">
                        <div className="empty-history-icon">!</div>
                        <h3>Image preview unavailable</h3>
                        <p>
                          The backend returned an image, but the
                          browser could not decode or display it.
                          Check the image response format.
                        </p>
                      </div>
                    ) : (
                      <img
                        src={generatedImage}
                        alt="AI-generated creation"
                        className="generated-image"
                        onLoad={handleImageLoaded}
                        onError={handleImageError}
                      />
                    )}

                    <div className="result-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          void downloadMedia(
                            generatedImage,
                            `foxican-${Date.now()}.jpg`
                          )
                        }
                      >
                        ↓ Download image
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() => setPage("history")}
                      >
                        View gallery →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="canvas-placeholder">
                    <div className="placeholder-art">
                      <div className="art-orbit orbit-one" />
                      <div className="art-orbit orbit-two" />
                      <div className="art-glow" />

                      <span className="art-star star-one">✦</span>
                      <span className="art-star star-two">✧</span>
                      <span className="art-star star-three">✦</span>

                      <img
                        className="art-center"
                        src="/foxican-logo.png"
                        alt="FOXICAN AI logo"
                      />
                    </div>

                    <h3>Your next masterpiece starts here</h3>

                    <p>
                      Write a prompt and click Generate{" "}
                      {mode === "video" ? "Video" : "Image"}.
                      Your result will appear here.
                    </p>
                  </div>
                )}

                <div className="canvas-footer">
                  <div>
                    <span className="footer-dot" />
                    Powered by Cloudflare AI
                  </div>

                  <span>FOXICAN AI</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="history-page">
            <div className="history-heading">
              <div>
                <span className="section-eyebrow">
                  YOUR CREATIVE JOURNEY
                </span>

                <h1>Creation History</h1>

                <p>
                  View, preview, download and reuse your saved
                  creations.
                </p>
              </div>

              <button
                className="clear-history-button"
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                Clear history
              </button>
            </div>

            {copyMessage && (
              <div className="feedback" role="status">
                {copyMessage}
              </div>
            )}

            {history.length === 0 ? (
              <div className="empty-history">
                <div className="empty-history-icon">▧</div>

                <h3>Your gallery is waiting</h3>

                <p>
                  Your generated images and videos will appear here.
                </p>

                <button
                  className="generate-button empty-create-button"
                  onClick={() => setPage("create")}
                >
                  ✦ Start creating
                </button>
              </div>
            ) : (
              <div className="history-grid">
                {history.map((item) => {
                  const itemType =
                    item.type || (item.video ? "video" : "image");

                  return (
                    <article className="history-card" key={item.id}>
                      <button
                        type="button"
                        className="history-image-button"
                        onClick={() => {
                          setPreviewItem(item);
                          setCopyMessage("");
                        }}
                        aria-label={`Preview saved ${itemType}`}
                      >
                        {itemType === "video" && item.video ? (
                          <div className="video-thumbnail">
                            <video
                              src={item.video}
                              preload="metadata"
                              muted
                            />
                            <span className="video-thumbnail-badge">
                              ▶ VIDEO
                            </span>
                          </div>
                        ) : item.image ? (
                          <img
                            src={item.image}
                            alt={`Saved creation: ${item.prompt}`}
                            className="history-image"
                          />
                        ) : (
                          <div className="video-thumbnail">
                            Media unavailable
                          </div>
                        )}

                        <span className="image-preview-hint">
                          Click to preview
                        </span>
                      </button>

                      <div className="history-card-body">
                        <div className="media-type-label">
                          {itemType === "video" ? "VIDEO" : "IMAGE"}
                        </div>

                        <p className="history-prompt">
                          {item.prompt}
                        </p>

                        <div className="history-meta">
                          <span>{item.ratio || "1:1"} ratio</span>
                          <span>
                            {item.createdAt || "Saved creation"}
                          </span>
                        </div>

                        <div className="history-actions">
                          <button
                            className="history-action"
                            onClick={() => setPreviewItem(item)}
                          >
                            Open
                          </button>

                          <button
                            className="history-action"
                            onClick={() => void copyPrompt(item.prompt)}
                          >
                            Copy Prompt
                          </button>

                          <button
                            className="history-action"
                            onClick={() => reusePrompt(item)}
                          >
                            Reuse Prompt
                          </button>

                          <button
                            className="history-action"
                            onClick={() =>
                              void downloadMedia(
                                itemType === "video"
                                  ? item.video!
                                  : item.image!,
                                `foxican-${item.id}.${
                                  itemType === "video" ? "mp4" : "jpg"
                                }`
                              )
                            }
                          >
                            Download
                          </button>

                          <button
                            className="history-action delete-action"
                            onClick={() => deleteHistoryItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {previewItem && (
              <div
                className="preview-overlay"
                onClick={() => setPreviewItem(null)}
              >
                <div
                  className="preview-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Creation preview"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="preview-close"
                    onClick={() => setPreviewItem(null)}
                    aria-label="Close preview"
                  >
                    ×
                  </button>

                  {previewItem.type === "video" &&
                  previewItem.video ? (
                    <video
                      className="preview-modal-video"
                      src={previewItem.video}
                      controls
                      playsInline
                      autoPlay
                    />
                  ) : previewItem.image ? (
                    <img
                      src={previewItem.image}
                      alt={previewItem.prompt}
                      className="preview-modal-image"
                    />
                  ) : (
                    <p>Media unavailable.</p>
                  )}

                  {previewItem.type !== "video" && (
                    <p className="history-prompt preview-prompt">
                      {previewItem.prompt}
                    </p>
                  )}

                  <div className="history-meta preview-meta">
                    <span>
                      {previewItem.type === "video" ? "VIDEO" : "IMAGE"}
                    </span>

                    <span>{previewItem.ratio || "1:1"} ratio</span>
                    <span>{previewItem.createdAt}</span>
                  </div>

                  <div className="history-actions preview-actions">
                    <button
                      className="history-action"
                      onClick={() => void copyPrompt(previewItem.prompt)}
                    >
                      Copy Prompt
                    </button>

                    <button
                      className="history-action"
                      onClick={() =>
                        void downloadMedia(
                          previewItem.type === "video"
                            ? previewItem.video!
                            : previewItem.image!,
                          `foxican-${previewItem.id}.${
                            previewItem.type === "video" ? "mp4" : "jpg"
                          }`
                        )
                      }
                    >
                      Download
                    </button>

                    <button
                      className="history-action"
                      onClick={() => reusePrompt(previewItem)}
                    >
                      Reuse Prompt
                    </button>
                  </div>

                  {copyMessage && (
                    <p className="feedback" role="status">
                      {copyMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="app-footer">
          <span>FOXICAN AI</span>
          <span>Made for your imagination.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
