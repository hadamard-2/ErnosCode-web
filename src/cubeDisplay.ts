import { CUBE_COLORS, CUBE_INDICES, CUBE_VERTICES } from "./geometry";
import { create3dPosColorVAO, createProgram, createStaticIndexBuffer, createStaticBuffer, getContext, showError } from "./gl-utils";
import { glMatrix, mat4, vec3, quat } from "gl-matrix";

const vertexShaderSourceCode = `#version 300 es
precision mediump float;

in vec3 vertexPosition;
in vec3 vertexColor;

out vec3 fragmentColor;

uniform mat4 matWorld;
uniform mat4 matProjView;

void main() {
  fragmentColor = vertexColor;

  gl_Position = matProjView * matWorld * vec4(vertexPosition, 1.0);
}`;

const fragmentShaderSourceCode = `#version 300 es
precision mediump float;

in vec3 fragmentColor;
out vec4 outputColor;

void main() {
  outputColor = vec4(fragmentColor, 1.0);
}`;

class Cubie {
    static vao: WebGLVertexArrayObject;
    private worldMatrix: mat4 = mat4.create();
    public positionVec: vec3;
    private scaleVec: vec3 = vec3.fromValues(1, 1, 1);
    private rotationQuat: quat = quat.create();

    public readonly location: string[];

    constructor(posX: number, posY: number, posZ: number, location: string[]) {
        this.positionVec = vec3.fromValues(posX, posY, posZ);
        this.location = location;
    }

    draw(
        gl: WebGL2RenderingContext,
        matWorldUniform: WebGLUniformLocation,
        rotationAngle = 0,
        rotationAxis: vec3 = vec3.fromValues(1, 0, 0)
    ) {
        // Apply Transformations
        mat4.fromRotationTranslationScale(
            this.worldMatrix,
            this.rotationQuat,
            this.positionVec,
            this.scaleVec
        );

        if (rotationAngle !== 0) {
            const tempRotationMatrix = mat4.create();
            mat4.fromRotation(tempRotationMatrix, glMatrix.toRadian(rotationAngle), rotationAxis);
            mat4.multiply(this.worldMatrix, tempRotationMatrix, this.worldMatrix);
        }

        gl.uniformMatrix4fv(matWorldUniform, false, this.worldMatrix);
        gl.bindVertexArray(Cubie.vao);
        gl.drawElements(gl.TRIANGLES, CUBE_INDICES.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    applyRotation(worldRotationAngle: number, rotationAxis: vec3) {
        const incrementalQuat = quat.create();
        quat.setAxisAngle(incrementalQuat, rotationAxis, glMatrix.toRadian(worldRotationAngle));
        quat.multiply(this.rotationQuat, incrementalQuat, this.rotationQuat);
        
        // Update positionVec by applying the rotation
        const rotationMatrix = mat4.create();
        mat4.fromQuat(rotationMatrix, incrementalQuat);
        vec3.transformMat4(this.positionVec, this.positionVec, rotationMatrix);
        
        // Round the positionVec to handle floating-point precision
        this.positionVec[0] = Math.round(this.positionVec[0] * 100) / 100;
        this.positionVec[1] = Math.round(this.positionVec[1] * 100) / 100;
        this.positionVec[2] = Math.round(this.positionVec[2] * 100) / 100;
    }

    toString() {
        return `x: ${this.positionVec[0]},
            y: ${this.positionVec[1]},
            z: ${this.positionVec[2]}`;
    }
}

function initializeGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    const gl = getContext(canvas);
    if (!gl) {
        showError("WebGL not supported in this browser.");
        return null;
    }
    return gl;
}

function initializeProgram(gl: WebGL2RenderingContext) {
    const program = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
    if (!program) {
        showError("Failed to create WebGL program.");
        return null;
    }
    return program;
}

function initializeBuffers(gl: WebGL2RenderingContext) {
    const vertexBuffer = createStaticBuffer(gl, CUBE_VERTICES);
    const indexBuffer = createStaticIndexBuffer(gl, CUBE_INDICES);
    const colorBuffer = createStaticBuffer(gl, CUBE_COLORS);
    if (!vertexBuffer || !colorBuffer || !indexBuffer) {
        showError("Error creating vertex or index buffers.");
        return null;
    }
    return { vertexBuffer, colorBuffer, indexBuffer };
}

function initializeVAO(gl: WebGL2RenderingContext, program: WebGLProgram, buffers: { vertexBuffer: WebGLBuffer, colorBuffer: WebGLBuffer, indexBuffer: WebGLBuffer }) {
    const posAttrib = gl.getAttribLocation(program, "vertexPosition");
    const colorAttrib = gl.getAttribLocation(program, "vertexColor");

    if (posAttrib < 0 || colorAttrib < 0) {
        showError("Failed to get attribute locations.");
        return null;
    }

    const vao = create3dPosColorVAO(gl, buffers.vertexBuffer, buffers.colorBuffer, buffers.indexBuffer, posAttrib, colorAttrib);
    if (!vao) {
        showError("Failed to create VAO.");
        return null;
    }
    Cubie.vao = vao;

    return vao;
}

let layerToRotate: string;
let turns = 0;

// NOTE - testing
// sideToRotate = "back";
// turns = 1;


function loadScene() {
    const horizontalSlider = document.querySelector(".horizontal") as HTMLInputElement;
    const verticalSlider = document.querySelector(".vertical") as HTMLInputElement;

    if (!horizontalSlider || !verticalSlider) return;

    const canvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
    if (!canvas) {
        showError("Canvas not found.");
        return;
    }

    const { cubies, sideIndices } = createCubies();
    const sideRotationAxes = getSideRotationAxes();

    const gl = initializeGLContext(canvas);
    if (!gl) return;

    const program = initializeProgram(gl);
    if (!program) return;

    const buffers = initializeBuffers(gl);
    if (!buffers) return;

    const vao = initializeVAO(gl, program, buffers);
    if (!vao) return;

    const matProjViewUniform = gl.getUniformLocation(program, "matProjView");
    const matWorldUniform = gl.getUniformLocation(program, "matWorld");

    if (!matProjViewUniform || !matWorldUniform) {
        showError("Failed to get uniform locations.");
        return;
    }

    const matView = mat4.create();
    const matProj = mat4.create();

    let angle = 0;
    const speed = 1.5;
    let cubiesToRotate: number[] = [];
    let axisOfRotation: vec3;

    // NOTE - testing
    // showError(`${sideIndices[sideToRotate]}`);

    const renderScene = () => {
        // Check for ongoing rotation
        if (turns !== 0) {
            angle += speed;
            if (angle >= 90) {
                angle = 90; // Clamp the angle to 90 degrees
            }
        } else if (rotationQueue.length > 0) {
            // Get the next rotation from the queue if no ongoing rotation
            const { layer, direction } = rotationQueue.shift()!;

            switch (direction) {
                case "CW":
                    turns = -1;
                    break;
                case "CCW":
                    turns = 1;
                    break;
                case 2:
                    turns = 2;
                    break;
                default:
                    turns = 0;
            }

            layerToRotate = layer;
        }

        setupCanvas(gl, canvas);
        gl.useProgram(program);

        const radius = 42;  // Fixed distance from the target
        const angleX = Number(horizontalSlider.value) * Math.PI / 180;  // Horizontal rotation
        const angleY = Number(verticalSlider.value) * Math.PI / 180;  // Vertical rotation

        const x = radius * Math.cos(angleY) * Math.sin(angleX);
        const y = radius * Math.sin(angleY);  // Vertical movement
        const z = radius * Math.cos(angleY) * Math.cos(angleX);

        mat4.lookAt(
            matView,
            vec3.fromValues(x, y, z),
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0)
        );
        mat4.perspective(
            matProj,
            glMatrix.toRadian(30),
            canvas.width / canvas.height,
            0.1, 100.0
        );

        const matProjView = mat4.create();
        mat4.multiply(matProjView, matProj, matView);
        gl.uniformMatrix4fv(matProjViewUniform, false, matProjView);

        for (let i = 0; i < cubies.length; i++) {
            if (turns === 0) {
                cubies[i].draw(gl, matWorldUniform);
            } else {
                cubiesToRotate = sideIndices[layerToRotate];
                axisOfRotation = sideRotationAxes[layerToRotate];

                if (cubiesToRotate.includes(i)) {
                    cubies[i].draw(gl, matWorldUniform, turns * angle, axisOfRotation);
                } else {
                    cubies[i].draw(gl, matWorldUniform);
                }
            }
        }

        if (angle >= 90) {
            cubiesToRotate.forEach(index => cubies[index].applyRotation(turns * 90, axisOfRotation));
            angle = 0;
            turns = 0;
        
            // Update sideIndices after rotation
            updateSideIndices(cubies, sideIndices);
        }

        requestAnimationFrame(renderScene);
    }

    requestAnimationFrame(renderScene);
}

function setupCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
}

function updateSideIndices(cubies: Cubie[], sideIndices: Record<string, number[]>) {
    // Clear existing indices
    for (let key in sideIndices) {
        sideIndices[key] = [];
    }

    cubies.forEach((cubie, index) => {
        const [x, y, z] = cubie.positionVec.map(coord => Math.round(coord));

        // Update for x-axis
        if (x < 0) {
            sideIndices["left"].push(index);
        } else if (x === 0) {
            sideIndices["middle"].push(index);
        } else {
            sideIndices["right"].push(index);
        }

        // Update for y-axis
        if (y < 0) {
            sideIndices["bottom"].push(index);
        } else if (y === 0) {
            sideIndices["equator"].push(index);
        } else {
            sideIndices["top"].push(index);
        }

        // Update for z-axis
        if (z < 0) {
            sideIndices["back"].push(index);
        } else if (z === 0) {
            sideIndices["standing"].push(index);
        } else {
            sideIndices["front"].push(index);
        }
    });
}

function createCubies() {
    const COORDINATES = [-2.25, 0, 2.25];
    const cubies: Cubie[] = [];

    // Initialize empty sideIndices
    const sideIndices: Record<string, number[]> = {
        "left": [], "middle": [], "right": [],
        "bottom": [], "equator": [], "top": [],
        "back": [], "standing": [], "front": [],
    };

    // Populate initial sideIndices
    let index = 0;
    for (let x of COORDINATES) {
        for (let y of COORDINATES) {
            for (let z of COORDINATES) {
                cubies.push(new Cubie(x, y, z, []));
                index++;
            }
        }
    }

    updateSideIndices(cubies, sideIndices);

    return { cubies, sideIndices };
}

function getSideRotationAxes(): Record<string, vec3> {
    return {
        front: vec3.fromValues(0, 0, 1),
        standing: vec3.fromValues(0, 0, 1),
        back: vec3.fromValues(0, 0, 1),
        top: vec3.fromValues(0, 1, 0),
        equator: vec3.fromValues(0, 1, 0),
        bottom: vec3.fromValues(0, 1, 0),
        right: vec3.fromValues(1, 0, 0),
        middle: vec3.fromValues(1, 0, 0),
        left: vec3.fromValues(1, 0, 0)
    };
}

document.addEventListener("DOMContentLoaded", loadScene);


// function handleRotation(key: string, side: string) {
//     turns = key === key.toLowerCase() ? -1 : 1;
//     sideToRotate = side;
// }

// window.addEventListener("keydown", (event) => {
//     const keyMap: Record<string, string> = {
//         "f": "front",
//         "s": "standing",
//         "k": "back",
//         "t": "top",
//         "e": "equator",
//         "b": "bottom",
//         "r": "right",
//         "m": "middle",
//         "l": "left"
//     };

//     const side = keyMap[event.key.toLowerCase()];
//     if (side) {
//         handleRotation(event.key, side);
//     }
// });

let rotationQueue: { layer: string, direction: string | number }[] = [];

export function rotate(layer: string, direction: string | number) {
    const possibleLayers = ["front", "back", "top", "bottom", "right", "left", "middle", "equator", "standing"];
    const possibleDirections = ["CW", "CCW", 2];

    if (!possibleLayers.includes(layer)) {
        console.error("Invalid layer input!");
        return;
    }

    if (!possibleDirections.includes(direction)) {
        console.error("Invalid direction input!");
        return;
    }

    // Add the rotation to the queue
    rotationQueue.push({ layer, direction });
}

// rotate("top", "CW");
// rotate("right", "CCW");