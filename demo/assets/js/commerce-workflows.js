const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.4.0/dist/mermaid.esm.min.mjs";

const diagramStates = new WeakMap();

function setStatus(message) {
  const status = document.querySelector("[data-viewer-status]");
  if (status) status.textContent = message;
}

function createError(target, message) {
  target.innerHTML = "";
  const error = document.createElement("p");
  error.className = "diagram-error";
  error.textContent = message;
  target.append(error);
}

function setTransform(state) {
  state.content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}

function resetDiagram(card) {
  const state = diagramStates.get(card);
  if (!state) return;
  state.scale = 1;
  state.x = 0;
  state.y = 0;
  setTransform(state);
}

function zoomDiagram(card, amount) {
  const state = diagramStates.get(card);
  if (!state) return;
  state.scale = Math.min(2.6, Math.max(0.55, state.scale + amount));
  setTransform(state);
}

function sourceFileName(card) {
  return card.dataset.diagram.split("/").at(-1);
}

function downloadFile(filename, content, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function copyWithSelection(source) {
  const field = document.createElement("textarea");
  field.value = source;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy is unavailable");
}

async function copySource(card) {
  const state = diagramStates.get(card);
  if (!state) return;
  const button = card.querySelector('[data-action="copy-source"]');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(state.source);
    else copyWithSelection(state.source);
    button.textContent = "Copied";
  } catch {
    try {
      copyWithSelection(state.source);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy unavailable";
    }
  }
  window.setTimeout(() => { button.textContent = "Copy source"; }, 1400);
}

function downloadSource(card) {
  const state = diagramStates.get(card);
  if (state) downloadFile(sourceFileName(card), state.source, "text/plain;charset=utf-8");
}

function downloadSvg(card) {
  const svg = card.querySelector(".diagram-viewport svg");
  if (!svg) return;
  const serialized = new XMLSerializer().serializeToString(svg);
  downloadFile(sourceFileName(card).replace(/\.mmd$/, ".svg"), serialized, "image/svg+xml;charset=utf-8");
}

function setupPanZoom(card, content) {
  const viewport = card.querySelector(".diagram-viewport");
  const state = { content, scale: 1, x: 0, y: 0, pointerId: null, startX: 0, startY: 0 };
  diagramStates.set(card, state);
  viewport.classList.add("is-pannable");

  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomDiagram(card, event.deltaY < 0 ? 0.12 : -0.12);
  }, { passive: false });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    state.pointerId = event.pointerId;
    state.startX = event.clientX - state.x;
    state.startY = event.clientY - state.y;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-panning");
  });

  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== state.pointerId) return;
    state.x = event.clientX - state.startX;
    state.y = event.clientY - state.startY;
    setTransform(state);
  });

  const releasePointer = (event) => {
    if (event.pointerId !== state.pointerId) return;
    state.pointerId = null;
    viewport.classList.remove("is-panning");
  };
  viewport.addEventListener("pointerup", releasePointer);
  viewport.addEventListener("pointercancel", releasePointer);
}

async function renderDiagram(mermaid, card, index) {
  const sourceUrl = card.dataset.diagram;
  const target = card.querySelector("[data-render-target]");
  const preview = card.querySelector("[data-source-preview]");
  const sourceLink = card.querySelector("[data-source-link]");
  try {
    const response = await fetch(sourceUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.text();
    preview.textContent = source;
    sourceLink.href = sourceUrl;
    const id = `commerce-workflow-${index + 1}`;
    const result = await mermaid.render(id, source);
    target.innerHTML = `<div class="diagram-pan-zoom">${result.svg}</div>`;
    const content = target.querySelector(".diagram-pan-zoom");
    const svg = target.querySelector("svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", card.querySelector("h3").textContent);
    result.bindFunctions?.(target);
    setupPanZoom(card, content);
  } catch (error) {
    console.error(`Unable to render ${sourceUrl}`, error);
    createError(target, `Diagram could not load: ${sourceFileName(card)}. Open the source link to inspect it.`);
  }
}

async function initialize() {
  const cards = [...document.querySelectorAll("[data-diagram]")];
  try {
    const { default: mermaid } = await import(MERMAID_URL);
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      flowchart: { htmlLabels: false, useMaxWidth: false },
      sequence: { useMaxWidth: false },
      themeVariables: {
        fontFamily: "system-ui, Segoe UI, sans-serif",
        primaryColor: "#dbeafe",
        primaryTextColor: "#14213d",
        primaryBorderColor: "#1d4ed8",
        lineColor: "#64748b",
        secondaryColor: "#dcfce7",
        tertiaryColor: "#fef3c7"
      }
    });
    await Promise.all(cards.map((card, index) => renderDiagram(mermaid, card, index)));
    setStatus(`${cards.length} diagram sources loaded`);
  } catch (error) {
    console.error("Unable to load Mermaid", error);
    cards.forEach((card) => createError(
      card.querySelector("[data-render-target]"),
      "The Mermaid renderer could not load. Check your network connection or use the editable source file."
    ));
    setStatus("Mermaid renderer unavailable");
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const card = button.closest("[data-diagram]");
  if (!card) return;
  if (button.dataset.action === "zoom-in") zoomDiagram(card, 0.15);
  if (button.dataset.action === "zoom-out") zoomDiagram(card, -0.15);
  if (button.dataset.action === "reset") resetDiagram(card);
  if (button.dataset.action === "copy-source") await copySource(card);
  if (button.dataset.action === "download-source") downloadSource(card);
  if (button.dataset.action === "download-svg") downloadSvg(card);
  if (button.dataset.action === "fullscreen") {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await card.requestFullscreen?.();
    } catch {
      button.textContent = "Fullscreen unavailable";
      window.setTimeout(() => { button.textContent = "Fullscreen"; }, 1400);
    }
  }
});

initialize();
