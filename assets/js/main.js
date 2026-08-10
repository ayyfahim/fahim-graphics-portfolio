/* ==========================================================================
   [YOUR NAME] — Retoucher & Image Editor
   1. Grading engine (exposure / contrast / saturation / temperature + looks)
   2. Live scopes: waveform, RGB parade, histogram, numeric readout
   3. A/B compare on the hero
   4. Six technique demos, each real per-pixel work
   Seed 91252ec9
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // Draw an image at "cover" scale into a 2D context.
  function coverDraw(ctx, img, w, h) {
    var ir = img.naturalWidth / img.naturalHeight;
    var cr = w / h, dw, dh, dx, dy;
    if (ir > cr) { dh = h; dw = h * ir; dx = (w - dw) / 2; dy = 0; }
    else { dw = w; dh = w / ir; dx = 0; dy = (h - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function whenImage(img, cb) {
    if (img.complete && img.naturalWidth) cb();
    else img.addEventListener('load', cb, { once: true });
  }

  /* ----------------------------------------------------------------------
     1. GRADING ENGINE
     Operates on a Uint8ClampedArray in place. Order matches a real grade:
     exposure (linear gain) -> temperature (channel balance) -> contrast
     (pivot at mid grey) -> saturation (toward luma).
     ---------------------------------------------------------------------- */
  function grade(px, g) {
    var n = px.length;
    var gain = Math.pow(2, g.exposure / 100 * 1.6);      // stops
    var c = 1 + g.contrast / 100;                         // pivot 0.5
    var s = 1 + g.saturation / 100;
    var t = g.temperature / 100;                          // -1 cool .. +1 warm

    // temperature as a simple channel balance
    var rMul = 1 + t * 0.22, bMul = 1 - t * 0.22, gMul = 1 + Math.abs(t) * 0.015;

    // split-tone offsets (used by looks)
    var shR = g.shadowR || 0, shG = g.shadowG || 0, shB = g.shadowB || 0;
    var hiR = g.highR || 0, hiG = g.highG || 0, hiB = g.highB || 0;

    for (var i = 0; i < n; i += 4) {
      var r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255;

      // exposure
      r *= gain; gg *= gain; b *= gain;

      // temperature
      r *= rMul; gg *= gMul; b *= bMul;

      // contrast around mid grey
      r = (r - 0.5) * c + 0.5;
      gg = (gg - 0.5) * c + 0.5;
      b = (b - 0.5) * c + 0.5;

      // saturation toward Rec.709 luma
      var L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      r = L + (r - L) * s;
      gg = L + (gg - L) * s;
      b = L + (b - L) * s;

      // split toning: weight by luminance
      if (shR || shG || shB || hiR || hiG || hiB) {
        var lw = clamp(L, 0, 1);
        var sw = (1 - lw) * (1 - lw);
        var hw = lw * lw;
        r += shR * sw + hiR * hw;
        gg += shG * sw + hiG * hw;
        b += shB * sw + hiB * hw;
      }

      px[i] = clamp(r, 0, 1) * 255;
      px[i + 1] = clamp(gg, 0, 1) * 255;
      px[i + 2] = clamp(b, 0, 1) * 255;
    }
  }

  var LOOKS = {
    reset:  { exposure: 0,  contrast: 0,  saturation: 0,   temperature: 0 },
    warm:   { exposure: 8,  contrast: 16, saturation: 6,   temperature: 34,
              shadowR: -0.012, shadowG: 0, shadowB: 0.03, highR: 0.035, highG: 0.014, highB: -0.012 },
    teal:   { exposure: 2,  contrast: 24, saturation: -6,  temperature: -26,
              shadowR: -0.02, shadowG: 0.012, shadowB: 0.05, highR: 0.03, highG: 0.008, highB: -0.02 },
    bleach: { exposure: 16, contrast: 42, saturation: -46, temperature: 6 },
    mono:   { exposure: 4,  contrast: 26, saturation: -100, temperature: 0 }
  };

  /* ----------------------------------------------------------------------
     2. SCOPES
     ---------------------------------------------------------------------- */
  function Scopes() {
    var wave = document.getElementById('scopeWave');
    var parade = document.getElementById('scopeParade');
    var hist = document.getElementById('scopeHist');
    var rBlack = document.getElementById('rBlack');
    var rWhite = document.getElementById('rWhite');
    var rMean = document.getElementById('rMean');
    var rClip = document.getElementById('rClip');
    if (!wave || !parade || !hist) return { update: function () {} };

    function fit(cv) {
      var r = cv.getBoundingClientRect();
      if (!r.width) return null;
      cv.width = Math.round(r.width * DPR);
      cv.height = Math.round(r.height * DPR);
      var c = cv.getContext('2d');
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      return { ctx: c, w: r.width, h: r.height };
    }

    function gridlines(c, w, h) {
      c.strokeStyle = 'rgba(255,255,255,.07)';
      c.lineWidth = 1;
      for (var i = 1; i < 4; i++) {
        var y = Math.round(h * i / 4) + 0.5;
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
      }
    }

    // Sample the source canvas cheaply: step across columns and rows.
    this.update = function (srcCanvas) {
      var sw = srcCanvas.width, sh = srcCanvas.height;
      if (!sw || !sh) return;
      var sctx = srcCanvas.getContext('2d');
      var data;
      try { data = sctx.getImageData(0, 0, sw, sh); } catch (e) { return; }
      var px = data.data;

      var W = fit(wave), P = fit(parade), H = fit(hist);

      var COLS = 160;                       // horizontal resolution of the trace
      var colStep = Math.max(1, Math.floor(sw / COLS));
      var rowStep = Math.max(1, Math.floor(sh / 90));

      // ---- waveform + parade ----
      if (W) {
        W.ctx.clearRect(0, 0, W.w, W.h);
        W.ctx.fillStyle = '#0B0B0B';
        W.ctx.fillRect(0, 0, W.w, W.h);
        gridlines(W.ctx, W.w, W.h);
        W.ctx.fillStyle = 'rgba(123,232,160,.5)';
      }
      if (P) {
        P.ctx.clearRect(0, 0, P.w, P.h);
        P.ctx.fillStyle = '#0B0B0B';
        P.ctx.fillRect(0, 0, P.w, P.h);
        gridlines(P.ctx, P.w, P.h);
      }

      var hgram = new Uint32Array(256);
      var sum = 0, count = 0, minL = 255, maxL = 0, clipped = 0;
      var third = P ? P.w / 3 : 0;

      for (var x = 0, ci = 0; x < sw; x += colStep, ci++) {
        var wx = W ? (ci / (sw / colStep)) * W.w : 0;
        for (var y = 0; y < sh; y += rowStep) {
          var o = (y * sw + x) * 4;
          var r = px[o], g = px[o + 1], b = px[o + 2];
          var L = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          hgram[L | 0]++;
          sum += L; count++;
          if (L < minL) minL = L;
          if (L > maxL) maxL = L;
          if (L >= 254 || L <= 1) clipped++;

          if (W) W.ctx.fillRect(wx, W.h - (L / 255) * W.h, 1.1, 1.1);

          if (P) {
            var px3 = (ci / (sw / colStep)) * third;
            P.ctx.fillStyle = 'rgba(255,107,107,.42)';
            P.ctx.fillRect(px3, P.h - (r / 255) * P.h, 1.1, 1.1);
            P.ctx.fillStyle = 'rgba(107,227,138,.42)';
            P.ctx.fillRect(third + px3, P.h - (g / 255) * P.h, 1.1, 1.1);
            P.ctx.fillStyle = 'rgba(107,168,255,.42)';
            P.ctx.fillRect(third * 2 + px3, P.h - (b / 255) * P.h, 1.1, 1.1);
          }
        }
      }

      // parade dividers
      if (P) {
        P.ctx.strokeStyle = 'rgba(255,255,255,.12)';
        P.ctx.beginPath();
        P.ctx.moveTo(third + .5, 0); P.ctx.lineTo(third + .5, P.h);
        P.ctx.moveTo(third * 2 + .5, 0); P.ctx.lineTo(third * 2 + .5, P.h);
        P.ctx.stroke();
      }

      // ---- histogram ----
      if (H) {
        H.ctx.clearRect(0, 0, H.w, H.h);
        H.ctx.fillStyle = '#0B0B0B';
        H.ctx.fillRect(0, 0, H.w, H.h);
        var peak = 1;
        for (var i2 = 0; i2 < 256; i2++) if (hgram[i2] > peak) peak = hgram[i2];
        H.ctx.fillStyle = 'rgba(242,240,236,.62)';
        for (var i3 = 0; i3 < 256; i3++) {
          var bh = (hgram[i3] / peak) * H.h;
          var bx = (i3 / 256) * H.w;
          H.ctx.fillRect(bx, H.h - bh, H.w / 256 + 0.6, bh);
        }
        gridlines(H.ctx, H.w, H.h);
      }

      // ---- numeric readout ----
      if (count) {
        var mean = sum / count;
        if (rBlack) rBlack.textContent = String(Math.round(minL));
        if (rWhite) rWhite.textContent = String(Math.round(maxL));
        if (rMean) rMean.textContent = String(Math.round(mean));
        if (rClip) {
          var pc = (clipped / count) * 100;
          rClip.textContent = (pc < 0.05 ? '0.0' : pc.toFixed(1)) + '%';
          rClip.style.color = pc > 2 ? 'var(--sig)' : 'var(--fg)';
        }
      }
    };
  }

  /* ----------------------------------------------------------------------
     3. THE SUITE — hero grading station
     ---------------------------------------------------------------------- */
  function suite() {
    var well = document.getElementById('well');
    var cv = document.getElementById('mainCanvas');
    var img = document.getElementById('srcImg');
    var abBtn = document.getElementById('abBtn');
    var stateLabel = document.getElementById('stateLabel');
    if (!well || !cv || !img) return;

    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var scopes = new Scopes();
    var w = 0, h = 0;
    var base = null;                       // ImageData of the ungraded frame
    var showOriginal = false;
    var pending = false;

    var state = { exposure: 6, contrast: 18, saturation: -8, temperature: 10 };
    var extra = {};

    var ids = [
      ['cExp', 'oExp', 'exposure'],
      ['cCon', 'oCon', 'contrast'],
      ['cSat', 'oSat', 'saturation'],
      ['cTmp', 'oTmp', 'temperature']
    ];

    function sign(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v); }

    function size() {
      var r = well.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = Math.round(r.width); h = Math.round(r.height);
      cv.width = Math.round(w * DPR);
      cv.height = Math.round(h * DPR);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return true;
    }

    function capture() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      coverDraw(ctx, img, cv.width, cv.height);
      try { base = ctx.getImageData(0, 0, cv.width, cv.height); }
      catch (e) { base = null; }
    }

    function render() {
      if (!base) return;
      if (showOriginal) {
        ctx.putImageData(base, 0, 0);
      } else {
        var out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
        var g = {
          exposure: state.exposure, contrast: state.contrast,
          saturation: state.saturation, temperature: state.temperature,
          shadowR: extra.shadowR, shadowG: extra.shadowG, shadowB: extra.shadowB,
          highR: extra.highR, highG: extra.highG, highB: extra.highB
        };
        grade(out.data, g);
        ctx.putImageData(out, 0, 0);
      }
      scopes.update(cv);
      if (stateLabel) stateLabel.textContent = showOriginal ? 'Original' : 'Graded';
    }

    function schedule() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; render(); });
    }

    ids.forEach(function (t) {
      var el = document.getElementById(t[0]);
      var out = document.getElementById(t[1]);
      if (!el) return;
      el.value = String(state[t[2]]);
      if (out) out.textContent = sign(state[t[2]]);
      el.addEventListener('input', function () {
        state[t[2]] = parseFloat(el.value);
        if (out) out.textContent = sign(state[t[2]]);
        markLook(null);
        schedule();
      });
    });

    var chips = [].slice.call(document.querySelectorAll('[data-look]'));
    function markLook(name) {
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', String(c.getAttribute('data-look') === name));
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var look = LOOKS[c.getAttribute('data-look')];
        if (!look) return;
        state.exposure = look.exposure;
        state.contrast = look.contrast;
        state.saturation = look.saturation;
        state.temperature = look.temperature;
        extra = {
          shadowR: look.shadowR || 0, shadowG: look.shadowG || 0, shadowB: look.shadowB || 0,
          highR: look.highR || 0, highG: look.highG || 0, highB: look.highB || 0
        };
        ids.forEach(function (t) {
          var el = document.getElementById(t[0]);
          var out = document.getElementById(t[1]);
          if (el) el.value = String(state[t[2]]);
          if (out) out.textContent = sign(state[t[2]]);
        });
        markLook(c.getAttribute('data-look'));
        schedule();
      });
    });

    // A/B: hold to compare, click to toggle, keyboard accessible.
    if (abBtn) {
      var held = false;
      function setAB(v) {
        showOriginal = v;
        abBtn.setAttribute('aria-pressed', String(v));
        render();
      }
      abBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); held = true; setAB(true);
      });
      window.addEventListener('pointerup', function () {
        if (held) { held = false; setAB(false); }
      });
      abBtn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAB(!showOriginal); }
      });
    }

    whenImage(img, function () {
      if (!size()) return;
      capture();
      render();
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!size()) return;
        capture();
        render();
      }, 200);
    }, { passive: true });
  }

  /* ----------------------------------------------------------------------
     4. TECHNIQUE DEMOS
     Each returns a processed ImageData from a source ImageData.
     ---------------------------------------------------------------------- */
  var FX = {

    // Channel-weighted monochrome — not a flat desaturate.
    bw: function (src) {
      var p = src.data;
      for (var i = 0; i < p.length; i += 4) {
        // red-weighted mix: keeps skin bright and separated from background
        var v = 0.42 * p[i] + 0.44 * p[i + 1] + 0.14 * p[i + 2];
        v = clamp((v - 128) * 1.16 + 132, 0, 255);
        p[i] = p[i + 1] = p[i + 2] = v;
      }
      return src;
    },

    // Luminance-keyed extraction: subject lifted off a dark ground and
    // composited over a new background, preserving soft hair edges.
    mask: function (src) {
      var p = src.data, w = src.width, h = src.height;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var o = (y * w + x) * 4;
          var L = (0.2126 * p[o] + 0.7152 * p[o + 1] + 0.0722 * p[o + 2]) / 255;
          // soft alpha ramp across the low tones = the hair edge
          var a = clamp((L - 0.06) / 0.30, 0, 1);
          a = a * a * (3 - 2 * a);
          // replacement background: a vertical studio sweep
          var t = y / h;
          var bgR = 30 + t * 26, bgG = 92 + t * 52, bgB = 122 + t * 62;
          p[o]     = p[o]     * a + bgR * (1 - a);
          p[o + 1] = p[o + 1] * a + bgG * (1 - a);
          p[o + 2] = p[o + 2] * a + bgB * (1 - a);
        }
      }
      return src;
    },

    // Restoration: neutralise the age cast, then rebuild density from the
    // actual percentile range rather than a fixed curve.
    restore: function (src) {
      var p = src.data, n = p.length;
      var hr = new Uint32Array(256), hg = new Uint32Array(256), hb = new Uint32Array(256);
      var count = n / 4;
      for (var i = 0; i < n; i += 4) { hr[p[i]]++; hg[p[i + 1]]++; hb[p[i + 2]]++; }

      function bounds(hist) {
        var cut = count * 0.005, acc = 0, lo = 0, hi = 255;
        for (var a = 0; a < 256; a++) { acc += hist[a]; if (acc > cut) { lo = a; break; } }
        acc = 0;
        for (var z = 255; z >= 0; z--) { acc += hist[z]; if (acc > cut) { hi = z; break; } }
        return [lo, Math.max(lo + 1, hi)];
      }
      var br = bounds(hr), bg = bounds(hg), bb = bounds(hb);

      for (var j = 0; j < n; j += 4) {
        var r = ((p[j] - br[0]) / (br[1] - br[0])) * 255;
        var g = ((p[j + 1] - bg[0]) / (bg[1] - bg[0])) * 255;
        var b = ((p[j + 2] - bb[0]) / (bb[1] - bb[0])) * 255;
        // gentle S-curve to restore lost density
        r = clamp((r - 128) * 1.14 + 126, 0, 255);
        g = clamp((g - 128) * 1.14 + 126, 0, 255);
        b = clamp((b - 128) * 1.14 + 126, 0, 255);
        p[j] = r; p[j + 1] = g; p[j + 2] = b;
      }
      return src;
    },

    // Night grade: cool the shadows, hold the highlights warm.
    grade: function (src) {
      grade(src.data, {
        exposure: 4, contrast: 26, saturation: 10, temperature: -18,
        shadowR: -0.03, shadowG: 0.008, shadowB: 0.07,
        highR: 0.05, highG: 0.012, highB: -0.03
      });
      return src;
    },

    // Frequency separation, honestly: blur carries colour (low frequency),
    // the residual carries texture (high frequency). We smooth only the low
    // band and add the untouched detail back, so pores survive.
    skin: function (src) {
      var w = src.width, h = src.height, p = src.data;
      var lo = blurRGB(p, w, h, Math.max(2, Math.round(Math.min(w, h) / 110)));
      for (var i = 0; i < p.length; i += 4) {
        for (var k = 0; k < 3; k++) {
          var detail = p[i + k] - lo[i + k];      // high frequency
          // even out the low frequency toward its local blur, keep detail
          var smoothed = lo[i + k];
          p[i + k] = clamp(smoothed + detail * 1.0, 0, 255);
        }
      }
      return src;
    },

    // Photo -> print-ready line art: normalise, threshold with a soft edge.
    line: function (src) {
      var p = src.data, n = p.length, count = n / 4;
      var hist = new Uint32Array(256);
      var lum = new Float32Array(count);
      for (var i = 0, j = 0; i < n; i += 4, j++) {
        var L = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
        lum[j] = L; hist[L | 0]++;
      }
      var cut = count * 0.02, acc = 0, lo = 0, hi = 255;
      for (var a = 0; a < 256; a++) { acc += hist[a]; if (acc > cut) { lo = a; break; } }
      acc = 0;
      for (var z = 255; z >= 0; z--) { acc += hist[z]; if (acc > cut) { hi = z; break; } }
      var span = Math.max(1, hi - lo);

      for (var q = 0, o = 0; q < count; q++, o += 4) {
        var v = ((lum[q] - lo) / span) * 100;
        var d = (v - 52) / 8;
        var s = d < -1 ? 0 : d > 1 ? 1 : (d + 1) / 2;
        s = s * s * (3 - 2 * s);
        var g2 = 255 * s;
        p[o] = p[o + 1] = p[o + 2] = g2;
      }
      return src;
    }
  };

  // Separable box blur, 3 passes ~= gaussian. Returns a copy.
  function blurRGB(src, w, h, radius) {
    var out = new Uint8ClampedArray(src);
    var tmp = new Uint8ClampedArray(src.length);
    for (var pass = 0; pass < 3; pass++) {
      boxH(out, tmp, w, h, radius);
      boxV(tmp, out, w, h, radius);
    }
    return out;
  }
  function boxH(src, dst, w, h, r) {
    for (var y = 0; y < h; y++) {
      for (var c = 0; c < 3; c++) {
        var sum = 0, row = y * w;
        for (var i = -r; i <= r; i++) sum += src[(row + clamp(i, 0, w - 1)) * 4 + c];
        var div = r * 2 + 1;
        for (var x = 0; x < w; x++) {
          dst[(row + x) * 4 + c] = sum / div;
          var add = src[(row + clamp(x + r + 1, 0, w - 1)) * 4 + c];
          var sub = src[(row + clamp(x - r, 0, w - 1)) * 4 + c];
          sum += add - sub;
        }
      }
      for (var x2 = 0; x2 < w; x2++) dst[(y * w + x2) * 4 + 3] = 255;
    }
  }
  function boxV(src, dst, w, h, r) {
    for (var x = 0; x < w; x++) {
      for (var c = 0; c < 3; c++) {
        var sum = 0;
        for (var i = -r; i <= r; i++) sum += src[(clamp(i, 0, h - 1) * w + x) * 4 + c];
        var div = r * 2 + 1;
        for (var y = 0; y < h; y++) {
          dst[(y * w + x) * 4 + c] = sum / div;
          var add = src[(clamp(y + r + 1, 0, h - 1) * w + x) * 4 + c];
          var sub = src[(clamp(y - r, 0, h - 1) * w + x) * 4 + c];
          sum += add - sub;
        }
      }
      for (var y2 = 0; y2 < h; y2++) dst[(y2 * w + x) * 4 + 3] = 255;
    }
  }

  /* ---- plate: split comparator between source and processed ---- */
  function Plate(fig) {
    var wellEl = fig.querySelector('.plate__well');
    var cv = fig.querySelector('[data-cv]');
    var img = fig.querySelector('[data-src]');
    var divider = fig.querySelector('[data-div]');
    var rng = fig.querySelector('.plate__rng');
    var fxName = fig.getAttribute('data-fx');
    if (!wellEl || !cv || !img) return;

    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var w = 0, h = 0, split = 0.5;
    var original = null, processed = null;

    function size() {
      var r = wellEl.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = Math.round(r.width); h = Math.round(r.height);
      cv.width = Math.round(w * DPR);
      cv.height = Math.round(h * DPR);
      return true;
    }

    function build() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      coverDraw(ctx, img, cv.width, cv.height);
      try { original = ctx.getImageData(0, 0, cv.width, cv.height); }
      catch (e) { original = null; return; }

      var copy = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
      var fn = FX[fxName];
      processed = fn ? fn(copy) : copy;
    }

    function draw() {
      if (!original) return;
      var cut = Math.round(cv.width * split);
      ctx.putImageData(original, 0, 0);
      if (processed && cut < cv.width) {
        ctx.putImageData(processed, 0, 0, cut, 0, cv.width - cut, cv.height);
      }
      if (divider) divider.style.left = (split * 100) + '%';
    }

    function setSplit(v) {
      split = clamp(v, 0, 1);
      if (rng) rng.value = String(split * 100);
      draw();
    }

    var dragging = false;
    function fromEvent(e) {
      var r = wellEl.getBoundingClientRect();
      setSplit((e.clientX - r.left) / r.width);
    }
    wellEl.addEventListener('pointerdown', function (e) {
      dragging = true;
      if (wellEl.setPointerCapture) wellEl.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    wellEl.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    wellEl.addEventListener('pointerup', function () { dragging = false; });
    wellEl.addEventListener('pointercancel', function () { dragging = false; });
    if (rng) rng.addEventListener('input', function () { setSplit(parseFloat(rng.value) / 100); });

    this.init = function () {
      if (!size()) return;
      build();
      draw();
    };
    this.resize = function () {
      if (!size()) return;
      build();
      draw();
    };
    this.intro = function () {
      if (reduce) { setSplit(0.5); return; }
      var start = null, from = 0.97, to = 0.5, dur = 900;
      setSplit(from);
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        setSplit(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
  }

  var plates = [];
  function setupPlates() {
    document.querySelectorAll('[data-fx]').forEach(function (fig) {
      var img = fig.querySelector('[data-src]');
      if (!img) return;
      var p = new Plate(fig);
      whenImage(img, function () {
        p.init();
        plates.push(p);
        var seen = false;
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (es) {
            es.forEach(function (en) {
              if (en.isIntersecting && !seen) { seen = true; p.intro(); io.disconnect(); }
            });
          }, { threshold: 0.3 });
          io.observe(fig);
        }
      });
    });
  }

  /* ---- reveals ---- */
  function setupReveals() {
    var els = document.querySelectorAll('.hd, .plate, .craft li, .end__main, .end__meta');
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    els.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          var el = en.target;
          setTimeout(function () { el.classList.add('in'); }, Math.min(i * 45, 180));
          io.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });

    // Failsafe: never leave content invisible if the observer never fires.
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('in'); });
      io.disconnect();
    }, 2600);
  }

  var rt2;
  window.addEventListener('resize', function () {
    clearTimeout(rt2);
    rt2 = setTimeout(function () {
      plates.forEach(function (p) { p.resize(); });
    }, 220);
  }, { passive: true });

  function boot() {
    var y = document.getElementById('yr');
    if (y) y.textContent = String(new Date().getFullYear());
    suite();
    setupPlates();
    setupReveals();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
