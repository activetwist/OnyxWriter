import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { renderMermaidSvg } from "../lib/visualization/mermaid";
import { DEFAULT_VIEWPORT, fitViewport, panViewport, zoomViewport, type ViewportTransform } from "../lib/visualization/viewport";

interface MermaidDiagramProps {
  id: string;
  source: string;
}

export function MermaidDiagram({ id, source }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");
    void renderMermaidSvg(id, source)
      .then((nextSvg) => {
        if (!cancelled) setSvg(nextSvg);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : String(nextError));
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setViewport(fitViewport(720, 420, frame.clientWidth, frame.clientHeight));
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const previous = dragRef.current;
    if (!previous) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setViewport((current) => panViewport(current, event.clientX - previous.x, event.clientY - previous.y));
  }, []);

  return (
    <section className="mermaid-diagram" aria-label="Mermaid diagram preview">
      <div className="diagram-toolbar">
        <span>Mermaid</span>
        <div className="diagram-actions">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setViewport((current) => zoomViewport(current, 0.84))}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setViewport((current) => zoomViewport(current, 1.18))}>
            <Plus size={15} />
          </button>
          <button type="button" aria-label="Fit diagram" title="Fit diagram" onClick={fit}>
            <Maximize2 size={15} />
          </button>
          <button type="button" aria-label="Reset diagram" title="Reset diagram" onClick={() => setViewport(DEFAULT_VIEWPORT)}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div
        className="diagram-viewport"
        ref={frameRef}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {error ? (
          <div className="diagram-error">
            <strong>Could not render diagram.</strong>
            <span>{error}</span>
          </div>
        ) : (
          <div
            className="diagram-svg"
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
            dangerouslySetInnerHTML={{ __html: svg || "<p>Rendering diagram.</p>" }}
          />
        )}
      </div>
    </section>
  );
}
