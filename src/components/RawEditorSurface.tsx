import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { rawEditorExtensions } from "../lib/editor/rawEditor";

interface RawEditorSurfaceProps {
  raw: string;
  onChange: (raw: string) => void;
}

export function RawEditorSurface({ raw, onChange }: RawEditorSurfaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: raw,
      extensions: [
        ...rawEditorExtensions(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === raw) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: raw },
    });
  }, [raw]);

  return <div className="raw-editor" ref={hostRef} />;
}
