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
    doc: "// you can perform rotations here",
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

function executeCode() {
    // Get the code from the editor
    const code = view.state.doc.toString();
    // const imports = 'import { rotate } from "cubeDisplay.ts" \n';

    try {
        // Directly execute the code using `new Function`
        const execute = new Function('rotate', code); 
        // Pass the `rotate` function as an argument
        execute(rotate);
    } catch (error) {
        console.error("Error executing code:", error);
    }
}


document.querySelector(".run-button").addEventListener("click", executeCode);