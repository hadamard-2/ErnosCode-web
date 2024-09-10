import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

// Create an initial state with some default code
const initialState = EditorState.create({
    doc: "def foo():\n    print(123)",
    extensions: [keymap.of(defaultKeymap), python(), oneDark]
});

// Create the editor view and attach it to the DOM element
const view = new EditorView({
    state: initialState,
    parent: document.getElementById("editor")
});
