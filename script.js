const view = cm6.createEditorView(undefined, document.getElementById("editor"));
const initialState = cm6.createEditorState("function foo() {\n    console.log(123);\n}", { oneDark: true });

view.setState(initialState);
