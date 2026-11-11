import React, { useRef, useEffect, useCallback, useState } from 'react';

export interface FieldCanvasProps {
  dimension: 1 | 2;
  field: Float64Array | null;
  Nx: number;
  Ny: number;
  L: number;
  dx: number;
  dy?: number;
  selectedI: number;
  selectedJ: number | null;
  onSelectPoint: (i: number, j: number | null) => void;
}

export interface PlotBounds {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  barX?: number;
  barY?: number;
  barW?: number;
  barH?: number;
}

/**
 * Shared plot-bounds computation ensuring identical geometry between
 * canvas rendering and pointer-to-grid coordinate mapping.
 * 2D domain is strictly square (plotW === plotH === S).
 */
export function computePlotBounds(
  dimension: 1 | 2,
  width: number,
  height: number
): PlotBounds {
  if (dimension === 1) {
    const paddingLeft = 52;
    const paddingRight = 24;
    const paddingTop = 24;
    const paddingBottom = 40;
    const plotW = Math.max(10, width - paddingLeft - paddingRight);
    const plotH = Math.max(10, height - paddingTop - paddingBottom);
    return {
      plotX: paddingLeft,
      plotY: paddingTop,
      plotW,
      plotH,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
    };
  } else {
    // 2D Square physical domain [0, L] x [0, L] with aligned axes and colorbar
    const paddingLeft = 48; // for Y-axis ticks and rotated label
    const colorbarW = 14;
    const colorbarGap = 16;
    const colorbarLabelSpace = 48; // space for +1.0, 0.0, -1.0 text
    const paddingRight = colorbarW + colorbarGap + colorbarLabelSpace; // 78px
    const paddingTop = 22;
    const paddingBottom = 42; // for X-axis ticks and title

    const availW = Math.max(10, width - paddingLeft - paddingRight);
    const availH = Math.max(10, height - paddingTop - paddingBottom);
    // Physical geometry: enforce strictly square data area
    const S = Math.max(10, Math.min(availW, availH));

    // Center square in available region
    const plotX = paddingLeft + Math.floor((availW - S) / 2);
    const plotY = paddingTop + Math.floor((availH - S) / 2);
    const plotW = S;
    const plotH = S;

    const barX = plotX + plotW + colorbarGap;
    const barY = plotY;
    const barW = colorbarW;
    const barH = plotH;

    return {
      plotX,
      plotY,
      plotW,
      plotH,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      barX,
      barY,
      barW,
      barH,
    };
  }
}

// Scientific diverging colormap: -1 -> #2b5c8f (Navy/Blue), 0 -> #ffffff (White), +1 -> #b83a24 (Terracotta/Red)
function getCoolwarmRGB(val: number): [number, number, number] {
  const v = Math.max(-1.0, Math.min(1.0, val));
  if (v < 0) {
    const t = v + 1.0; // 0 to 1
    const r = Math.round(43 + (255 - 43) * t);
    const g = Math.round(92 + (255 - 92) * t);
    const b = Math.round(143 + (255 - 143) * t);
    return [r, g, b];
  } else {
    const t = v; // 0 to 1
    const r = Math.round(255 + (184 - 255) * t);
    const g = Math.round(255 + (58 - 255) * t);
    const b = Math.round(255 + (36 - 255) * t);
    return [r, g, b];
  }
}

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  dimension,
  field,
  Nx,
  Ny,
  L,
  dx,
  selectedI,
  selectedJ,
  onSelectPoint,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 600, height: 380 });

  // ResizeObserver to track container dimension dynamically
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // 1D Rendering
  const render1D = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!field || field.length < Nx) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      const bounds = computePlotBounds(1, width, height);

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Y-range: [-1.3, 1.3]
      const yMin = -1.3;
      const yMax = 1.3;
      const toCanvasY = (val: number) =>
        bounds.plotY + (1.0 - (val - yMin) / (yMax - yMin)) * bounds.plotH;

      // Exact physical coordinate mapping on periodic domain [0, L)
      const toCanvasX = (i: number) =>
        bounds.plotX + ((i * dx) / L) * bounds.plotW;

      // Draw subtle grid lines
      ctx.strokeStyle = '#ebebe4';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      [-1.0, 0.0, 1.0].forEach((yVal) => {
        const cy = toCanvasY(yVal);
        ctx.beginPath();
        ctx.moveTo(bounds.plotX, cy);
        ctx.lineTo(bounds.plotX + bounds.plotW, cy);
        ctx.stroke();
      });

      // Frame border
      ctx.strokeStyle = '#d8d8cd';
      ctx.lineWidth = 1;
      ctx.strokeRect(bounds.plotX, bounds.plotY, bounds.plotW, bounds.plotH);

      // Tick labels on Y axis (darkened for accessible contrast)
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = '#545a50';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      [-1.0, 0.0, 1.0].forEach((yVal) => {
        const cy = toCanvasY(yVal);
        ctx.fillText(yVal.toFixed(1), bounds.plotX - 8, cy);
      });

      // Tick labels on X axis
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      [0, 0.25, 0.5, 0.75, 1.0].forEach((frac) => {
        const cx = bounds.plotX + frac * bounds.plotW;
        ctx.fillText((frac * L).toFixed(0), cx, bounds.plotY + bounds.plotH + 6);
      });

      // X and Y axis titles
      ctx.fillStyle = '#20241f';
      ctx.font = '500 12px -apple-system, sans-serif';
      ctx.fillText('Spatial Coordinate x ∈ [0, L)', bounds.plotX + bounds.plotW / 2, height - 12);

      ctx.save();
      ctx.translate(14, bounds.plotY + bounds.plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Order Parameter φ(x)', 0, 0);
      ctx.restore();

      // Draw field curve
      ctx.strokeStyle = '#b83a24'; // terracotta data red
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < Nx; i++) {
        const cx = toCanvasX(i);
        const cy = toCanvasY(field[i]);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Highlight selected point
      if (selectedI >= 0 && selectedI < Nx && field[selectedI] !== undefined && Number.isFinite(field[selectedI])) {
        const cx = toCanvasX(selectedI);
        const cy = toCanvasY(field[selectedI]);

        // Draw vertical indicator line
        ctx.strokeStyle = '#315646'; // forest green
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, bounds.plotY);
        ctx.lineTo(cx, bounds.plotY + bounds.plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw reticle circle
        ctx.fillStyle = '#315646';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tooltip badge
        const text = `i=${selectedI} (x=${(selectedI * dx).toFixed(2)}): φ=${field[selectedI].toFixed(4)}`;
        ctx.font = '11px "SF Mono", monospace';
        const tw = ctx.measureText(text).width;
        const bx = Math.min(Math.max(bounds.plotX, cx - tw / 2), width - bounds.paddingRight - tw);
        const by = cy > bounds.plotY + 30 ? cy - 24 : cy + 14;

        ctx.fillStyle = 'rgba(32, 36, 31, 0.92)';
        ctx.fillRect(bx - 4, by - 12, tw + 8, 18);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(text, bx, by);
      }
    },
    [field, Nx, L, dx, selectedI]
  );

  // 2D Rendering
  const render2D = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!field || field.length < Nx * Ny) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      const bounds = computePlotBounds(2, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // In Python: phi has shape (Nx, Ny). When plotting with imshow(phi.T, origin='lower'),
      // horizontal axis is x in [0, Nx-1], vertical axis is y in [0, Ny-1] with y=0 at bottom.
      // On canvas, y=0 is at top, so canvas row r corresponds to y_idx = Ny - 1 - r.
      const imgData = ctx.createImageData(Nx, Ny);
      const data = imgData.data;

      for (let r = 0; r < Ny; r++) {
        const j = Ny - 1 - r; // invert vertical axis so y=0 is at bottom
        for (let i = 0; i < Nx; i++) {
          const val = field[i * Ny + j];
          const [red, green, blue] = getCoolwarmRGB(val !== undefined && Number.isFinite(val) ? val : 0);
          const pixelIdx = (r * Nx + i) * 4;
          data[pixelIdx] = red;
          data[pixelIdx + 1] = green;
          data[pixelIdx + 2] = blue;
          data[pixelIdx + 3] = 255;
        }
      }

      // Draw ImageData scaled to square plot area via an offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = Nx;
      offscreen.height = Ny;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false; // crisp lattice cells
        ctx.drawImage(offscreen, bounds.plotX, bounds.plotY, bounds.plotW, bounds.plotH);
      }

      // Border around square plot area
      ctx.strokeStyle = '#d8d8cd';
      ctx.lineWidth = 1;
      ctx.strokeRect(bounds.plotX, bounds.plotY, bounds.plotW, bounds.plotH);

      // X tick labels
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = '#545a50';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      [0, 0.5, 1.0].forEach((frac) => {
        const cx = bounds.plotX + frac * bounds.plotW;
        ctx.fillText((frac * L).toFixed(0), cx, bounds.plotY + bounds.plotH + 5);
      });
      ctx.fillStyle = '#20241f';
      ctx.font = '500 12px -apple-system, sans-serif';
      ctx.fillText('Spatial Coordinate x', bounds.plotX + bounds.plotW / 2, bounds.plotY + bounds.plotH + 22);

      // Y tick labels
      ctx.fillStyle = '#545a50';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      [0, 0.5, 1.0].forEach((frac) => {
        const cy = bounds.plotY + (1.0 - frac) * bounds.plotH;
        ctx.fillText((frac * L).toFixed(0), bounds.plotX - 6, cy);
      });

      // Y axis title
      ctx.save();
      ctx.translate(bounds.plotX - 30, bounds.plotY + bounds.plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#20241f';
      ctx.font = '500 12px -apple-system, sans-serif';
      ctx.fillText('Spatial Coordinate y', 0, 0);
      ctx.restore();

      // Draw Colorbar on right of square plot
      const barX = bounds.barX!;
      const barY = bounds.barY!;
      const barW = bounds.barW!;
      const barH = bounds.barH!;

      const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      grad.addColorStop(0, '#b83a24'); // +1 (terracotta)
      grad.addColorStop(0.5, '#ffffff'); // 0 (white)
      grad.addColorStop(1, '#2b5c8f'); // -1 (blue)
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#d8d8cd';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // Colorbar labels
      ctx.fillStyle = '#545a50';
      ctx.font = '10px "SF Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('+1.0', barX + barW + 5, barY + 6);
      ctx.fillText(' 0.0', barX + barW + 5, barY + barH / 2);
      ctx.fillText('-1.0', barX + barW + 5, barY + barH - 6);

      // Colorbar title
      ctx.fillStyle = '#20241f';
      ctx.font = '500 11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('φ', barX + barW + 6, barY - 8);

      // Highlight selected (i, j) reticle
      if (selectedI >= 0 && selectedI < Nx && selectedJ !== null && selectedJ >= 0 && selectedJ < Ny) {
        const cellW = bounds.plotW / Nx;
        const cellH = bounds.plotH / Ny;
        const cx = bounds.plotX + selectedI * cellW;
        const cy = bounds.plotY + (Ny - 1 - selectedJ) * cellH;

        ctx.strokeStyle = '#20241f';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 1, cy - 1, cellW + 2, cellH + 2);

        // White crosshair
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, cy - 2, cellW + 4, cellH + 4);
      }
    },
    [field, Nx, Ny, L, selectedI, selectedJ]
  );

  // Main Draw Hook triggered whenever size, field, or selection changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    if (dimension === 1) {
      render1D(ctx, size.width, size.height);
    } else {
      render2D(ctx, size.width, size.height);
    }
  }, [dimension, field, size, render1D, render2D]);

  // Click handler to select coordinates with identical plot bounds
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !field) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dimension === 1) {
      const bounds = computePlotBounds(1, rect.width, rect.height);
      if (x >= bounds.plotX && x <= bounds.plotX + bounds.plotW) {
        const frac = (x - bounds.plotX) / bounds.plotW;
        const clickX = frac * L;
        const idx = Math.min(Math.max(0, Math.round(clickX / dx)), Nx - 1);
        onSelectPoint(idx, null);
      }
    } else {
      const bounds = computePlotBounds(2, rect.width, rect.height);
      if (
        x >= bounds.plotX &&
        x <= bounds.plotX + bounds.plotW &&
        y >= bounds.plotY &&
        y <= bounds.plotY + bounds.plotH
      ) {
        const fracX = (x - bounds.plotX) / bounds.plotW;
        const fracY = (y - bounds.plotY) / bounds.plotH;
        const ix = Math.min(Math.max(0, Math.floor(fracX * Nx)), Nx - 1);
        const jy = Math.min(Math.max(0, Ny - 1 - Math.floor(fracY * Ny)), Ny - 1); // inverted vertical
        onSelectPoint(ix, jy);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
      }}
    >
      <canvas
        id="tdgl-field-canvas"
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
          borderRadius: 'var(--radius-sm)',
        }}
      />
    </div>
  );
};
