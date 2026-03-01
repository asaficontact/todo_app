export function showFallback() {
  document.body.innerHTML = `
    <div class="webgl-fallback">
      <div class="fallback-content">
        <h1>WebGL Required</h1>
        <p>This app uses advanced 3D rendering powered by WebGL.</p>
        <p>Please open it in a modern browser (Chrome, Firefox, or Safari 15+).</p>
        <p style="margin-top:16px;font-size:12px;opacity:0.5;">
          Or try enabling hardware acceleration in your browser settings.
        </p>
      </div>
    </div>`;
}
