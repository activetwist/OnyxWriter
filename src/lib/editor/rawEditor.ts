import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";

const language = new Compartment();

export function createRawEditorState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: rawEditorExtensions(),
  });
}

export function rawEditorExtensions(): Extension[] {
  return [
    lineNumbers(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
    language.of([markdown(), yaml()]),
  ];
}
