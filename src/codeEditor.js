// Code Editor - CodeMirror 6
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { closeBrackets } from "@codemirror/autocomplete";
import { rotate } from "./cubeDisplay.ts";

// Create an initial state with some default code
const initialState = EditorState.create({
    doc: "// control your Rubik's Cube with code",
    extensions: [
        keymap.of(defaultKeymap),
        javascript(),
        oneDark,
        lineNumbers(),
        EditorView.lineWrapping,
        closeBrackets()
    ]
});

// Create the editor view and attach it to the DOM element
const view = new EditorView({
    state: initialState,
    parent: document.getElementById("editor")
});

async function executeCode() {
    const code = view.state.doc.toString();

    try {
        const execute = new Function('rotate', code); 
        execute(rotate);
    } catch (error) {
        console.error("Error executing code:", error);
    }
}


document.querySelector(".run-button").addEventListener("click", executeCode);