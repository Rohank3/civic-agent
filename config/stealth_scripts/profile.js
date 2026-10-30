(() => {
  const define = (obj, name, value) => Object.defineProperty(obj, name, { configurable: true, get: () => value });
  define(Navigator.prototype, "webdriver", undefined);
  for (const GL of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
    if (!GL) continue;
    const original = GL.prototype.getParameter;
    GL.prototype.getParameter = function (p) {
      if (p === 37445) return "Intel Inc.";
      if (p === 37446) return "Intel Iris OpenGL Engine";
      return original.call(this, p);
    };
  }
  // Use one stable offset per document. Repeated reads must agree.
  const salt = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  if (globalThis.AnalyserNode) {
    const read = AnalyserNode.prototype.getFloatFrequencyData;
    AnalyserNode.prototype.getFloatFrequencyData = function (out) {
      read.call(this, out);
      for (let i = 0; i < out.length; i++) out[i] += salt * 0.00001;
    };
  }
  if (window.chrome) window.chrome.csi = () => ({ startE: performance.timeOrigin, pageT: performance.now() + salt });
  const pixels = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (...args) {
    const result = pixels.apply(this, args);
    if (result.data.length) result.data[0] ^= Number(salt > 0.5);
    return result;
  };
})();
