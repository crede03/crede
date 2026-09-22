// 3D FlowerBox Authentic Screensaver Engine (forked & ported from kevin-shannon/3D-FlowerBox)
(function() {
    // Vector & Matrix Utilities
    function vec3(x, y, z) {
        if (Array.isArray(x)) return [x[0] || 0, x[1] || 0, x[2] || 0];
        return [x || 0, y || 0, z || 0];
    }
    function vec4(x, y, z, w) {
        if (Array.isArray(x)) return [x[0] || 0, x[1] || 0, x[2] || 0, x[3] !== undefined ? x[3] : 1];
        return [x || 0, y || 0, z || 0, w !== undefined ? w : 1];
    }
    function add(u, v) {
        return [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
    }
    function subtract(u, v) {
        return [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
    }
    function multVectors(u, v) {
        return [u[0] * v[0], u[1] * v[1], u[2] * v[2], (u[3] !== undefined && v[3] !== undefined) ? u[3] * v[3] : 1];
    }
    function dot(u, v) {
        return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    }
    function cross(u, v) {
        return [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];
    }
    function length(v) {
        return Math.sqrt(dot(v, v));
    }
    function normalize(v) {
        const len = length(v);
        if (len === 0) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    }
    function mix(u, v, s) {
        return [
            (1 - s) * u[0] + s * v[0],
            (1 - s) * u[1] + s * v[1],
            (1 - s) * u[2] + s * v[2]
        ];
    }
    function flatten(v) {
        const res = [];
        // If it's a 4x4 matrix, transpose to column-major for WebGL
        if (v.length === 4 && Array.isArray(v[0]) && v[0].length === 4) {
            for (let c = 0; c < 4; c++) {
                for (let r = 0; r < 4; r++) {
                    res.push(v[r][c]);
                }
            }
        } else {
            for (let i = 0; i < v.length; i++) {
                if (Array.isArray(v[i])) {
                    for (let j = 0; j < v[i].length; j++) res.push(v[i][j]);
                } else {
                    res.push(v[i]);
                }
            }
        }
        return new Float32Array(res);
    }
    function mat4() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }
    function mult(A, B) {
        const C = mat4();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) sum += A[i][k] * B[k][j];
                C[i][j] = sum;
            }
        }
        return C;
    }
    function rotateX(theta) {
        const rad = (theta * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [1, 0, 0, 0],
            [0, c, -s, 0],
            [0, s, c, 0],
            [0, 0, 0, 1]
        ];
    }
    function rotateY(theta) {
        const rad = (theta * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [c, 0, s, 0],
            [0, 1, 0, 0],
            [-s, 0, c, 0],
            [0, 0, 0, 1]
        ];
    }
    function rotateZ(theta) {
        const rad = (theta * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [c, -s, 0, 0],
            [s, c, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }
    function translate(x, y, z) {
        return [
            [1, 0, 0, x],
            [0, 1, 0, y],
            [0, 0, 1, z],
            [0, 0, 0, 1]
        ];
    }
    function scalem(x, y, z) {
        return [
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, 1]
        ];
    }
    function lookAt(eye, at, up) {
        let f = normalize(subtract(at, eye));
        let s = normalize(cross(f, up));
        let u = cross(s, f);
        return [
            [s[0], s[1], s[2], -dot(s, eye)],
            [u[0], u[1], u[2], -dot(u, eye)],
            [-f[0], -f[1], -f[2], dot(f, eye)],
            [0, 0, 0, 1]
        ];
    }
    function perspective(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan((fovy * Math.PI) / 360);
        const d = near - far;
        return [
            [f / aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (near + far) / d, (2 * near * far) / d],
            [0, 0, -1, 0]
        ];
    }

    // Geometry Generation
    const subdiv = 14;
    class Surface {
        constructor(x0, x1, y0, y1, xdiv, ydiv) {
            this.x_initial = x0;
            this.x_final = x1;
            this.y_initial = y0;
            this.y_final = y1;
            this.x_divisions = xdiv;
            this.y_divisions = ydiv;
            this.numIndices = (xdiv - 1) * (ydiv - 1) * 6;
        }
    }
    const square = new Surface(-1, 1, -1, 1, subdiv, subdiv);

    function generateGeometry(surface, time) {
        const vertices = [];
        const normals = [];
        const dx = (surface.x_final - surface.x_initial) / (surface.x_divisions - 1);
        const dy = (surface.y_final - surface.y_initial) / (surface.y_divisions - 1);

        const xInterval = [];
        const yInterval = [];
        for (let i = 0; i < surface.x_divisions; i++) xInterval.push(dx * i + surface.x_initial);
        for (let i = 0; i < surface.y_divisions; i++) yInterval.push(dy * i + surface.y_initial);

        // Morphing geometry calculation
        for (const x of xInterval) {
            for (const y of yInterval) {
                const p1 = vec3(x, y, 1.0);
                const p2 = normalize(p1);
                const morph = -Math.abs(1.6 * (time % 7.5) - 6) + 5;
                vertices.push(mix(p1, p2, morph));
            }
        }

        // Calculate surface normals
        for (let i = 0; i < surface.x_divisions; i++) {
            for (let j = 0; j < surface.y_divisions; j++) {
                const v = vertices[i * surface.y_divisions + j];
                const viprev = vertices[i * surface.y_divisions + j - 1] || v;
                const vinext = vertices[i * surface.y_divisions + j + 1] || v;
                const vjprev = vertices[(i - 1) * surface.y_divisions + j] || v;
                const vjnext = vertices[(i + 1) * surface.y_divisions + j] || v;

                let partial_y, partial_x;
                if (j === 0) partial_y = subtract(vinext, v);
                else if (j === surface.y_divisions - 1) partial_y = subtract(v, viprev);
                else partial_y = add(subtract(vinext, v), subtract(v, viprev));

                if (i === 0) partial_x = subtract(vjnext, v);
                else if (i === surface.x_divisions - 1) partial_x = subtract(v, vjprev);
                else partial_x = add(subtract(vjnext, v), subtract(v, vjprev));

                const n = normalize(cross(partial_x, partial_y));
                normals.push(vec4(n[0], n[1], n[2], 0.0));
            }
        }

        return { vertices, normals };
    }

    function generateIndices(surface) {
        const indices = [];
        for (let i = 0; i < surface.x_divisions - 1; i++) {
            for (let j = 0; j < surface.y_divisions - 1; j++) {
                const a = i * surface.y_divisions + j;
                const b = i * surface.y_divisions + j + 1;
                const c = (i + 1) * surface.y_divisions + j + 1;
                const d = (i + 1) * surface.y_divisions + j;
                indices.push(a, d, c);
                indices.push(a, c, b);
            }
        }
        return indices;
    }

    const indicesArray = generateIndices(square);

    const materials = {
        cyan:    { ambient: [0.0, 1.0, 1.0, 1.0], diffuse: [0.0, 1.0, 1.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] },
        magenta: { ambient: [1.0, 0.0, 1.0, 1.0], diffuse: [1.0, 0.0, 1.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] },
        yellow:  { ambient: [1.0, 1.0, 0.0, 1.0], diffuse: [1.0, 1.0, 0.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] },
        red:     { ambient: [1.0, 0.0, 0.0, 1.0], diffuse: [1.0, 0.0, 0.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] },
        green:   { ambient: [0.0, 1.0, 0.0, 1.0], diffuse: [0.0, 1.0, 0.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] },
        blue:    { ambient: [0.0, 0.2, 1.0, 1.0], diffuse: [0.0, 0.2, 1.0, 1.0], specular: [1.0, 1.0, 1.0, 1.0] }
    };

    const faces = {
        front:  { orientation: [0, 0],   material: 'cyan' },
        left:   { orientation: [0, 90],  material: 'magenta' },
        back:   { orientation: [0, 180], material: 'yellow' },
        right:  { orientation: [0, 270], material: 'blue' },
        top:    { orientation: [90, 0],  material: 'red' },
        bottom: { orientation: [270, 0], material: 'green' }
    };

    const vsSource = `
        attribute vec3 a_vertexPosition;
        attribute vec4 a_vertexNormal;
        uniform vec4 u_lightPosition;
        uniform vec4 u_ambientProduct;
        uniform vec4 u_diffuseProduct;
        uniform vec4 u_specularProduct;
        uniform float u_shininess;
        uniform mat4 u_mvMatrix;
        uniform mat4 u_projMatrix;
        varying vec4 fColor;

        void main() {
            vec3 eye = vec3(0.0, 0.0, 0.0);
            vec3 position = (u_mvMatrix * vec4(a_vertexPosition, 1.0)).xyz;
            vec3 light = u_lightPosition.xyz;
            vec3 L = normalize(light - position);
            vec3 E = normalize(eye - position);
            vec3 H = normalize(L + E);
            vec3 N = normalize((u_mvMatrix * a_vertexNormal).xyz);

            vec4 ambient = u_ambientProduct;
            float Kd = max(dot(L, N), 0.0);
            vec4 diffuse = Kd * u_diffuseProduct;
            float Ks = pow(max(dot(N, H), 0.0), u_shininess);
            vec4 specular = u_specularProduct * Ks;

            gl_Position = u_projMatrix * u_mvMatrix * vec4(a_vertexPosition, 1.0);
            fColor = ambient + diffuse + specular;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec4 fColor;
        void main() {
            gl_FragColor = fColor;
        }
    `;

    function initWebGL(canvas) {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('FlowerBox shader failed to compile');
            return null;
        }

        gl.useProgram(prog);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        const iBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesArray), gl.STATIC_DRAW);

        const vBuffer = gl.createBuffer();
        const nBuffer = gl.createBuffer();

        const locs = {
            prog: prog,
            vBuffer: vBuffer,
            nBuffer: nBuffer,
            iBuffer: iBuffer,
            vPosition: gl.getAttribLocation(prog, "a_vertexPosition"),
            vNormal: gl.getAttribLocation(prog, "a_vertexNormal"),
            u_mvMatrix: gl.getUniformLocation(prog, "u_mvMatrix"),
            u_projMatrix: gl.getUniformLocation(prog, "u_projMatrix"),
            u_lightPosition: gl.getUniformLocation(prog, "u_lightPosition"),
            u_ambientProduct: gl.getUniformLocation(prog, "u_ambientProduct"),
            u_diffuseProduct: gl.getUniformLocation(prog, "u_diffuseProduct"),
            u_specularProduct: gl.getUniformLocation(prog, "u_specularProduct"),
            u_shininess: gl.getUniformLocation(prog, "u_shininess")
        };

        return { gl, locs };
    }

    // Main Exported Renderer
    function runFlowerBox(canvas, getIsRunning) {
        const setup = initWebGL(canvas);
        if (!setup) return;
        const { gl, locs } = setup;

        let time = 0.625;
        const delta_t = 0.012;
        const sz = 0.55;
        const pos = [0, 0];
        let speed_x = -0.007;
        let speed_y = 0.007;
        const speed_r = 65;
        const max_x = 1.8;
        const max_y = 1.4;

        const light = {
            position: [0.0, 0.0, 0.0, 1.0],
            ambient:  [0.2, 0.2, 0.2, 1.0],
            diffuse:  [0.9, 0.9, 0.9, 1.0],
            specular: [0.6, 0.6, 0.6, 1.0]
        };

        const viewer = {
            eye: vec3(0.0, 0.0, 4.8),
            at:  vec3(0.0, 0.0, 0.0),
            up:  vec3(0.0, 1.0, 0.0)
        };

        function renderFrame() {
            if (!getIsRunning()) return;

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            time += delta_t;
            pos[0] += speed_x;
            pos[1] += speed_y;

            if (Math.abs(pos[0]) > max_x) speed_x = -speed_x;
            if (Math.abs(pos[1]) > max_y) speed_y = -speed_y;

            const aspect = canvas.width / Math.max(1, canvas.height);
            const geom = generateGeometry(square, time);

            // Upload Vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, locs.vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(geom.vertices), gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(locs.vPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(locs.vPosition);

            // Upload Normals
            gl.bindBuffer(gl.ARRAY_BUFFER, locs.nBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(geom.normals), gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(locs.vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(locs.vNormal);

            // Projection
            const pjMatrix = perspective(58, aspect, 0.01, 10);
            gl.uniformMatrix4fv(locs.u_projMatrix, false, flatten(pjMatrix));

            // Foundation Transform
            let mvFoundation = lookAt(viewer.eye, viewer.at, viewer.up);
            mvFoundation = mult(mvFoundation, scalem(sz / aspect, sz, sz));
            mvFoundation = mult(mvFoundation, rotateY(speed_r * time));
            mvFoundation = mult(mvFoundation, rotateZ(speed_r * time * 0.7));

            // Draw all 6 colored faces
            for (const faceKey in faces) {
                const face = faces[faceKey];
                let mv = mult(mvFoundation, rotateX(face.orientation[0]));
                mv = mult(mv, rotateY(face.orientation[1]));
                mv = mult(translate(pos[0], pos[1], 0), mv);

                gl.uniformMatrix4fv(locs.u_mvMatrix, false, flatten(mv));

                const mat = materials[face.material];
                const ambientProduct = multVectors(light.ambient, mat.ambient);
                const diffuseProduct = multVectors(light.diffuse, mat.diffuse);
                const specularProduct = multVectors(light.specular, mat.specular);

                gl.uniform4fv(locs.u_lightPosition, flatten(light.position));
                gl.uniform4fv(locs.u_ambientProduct, flatten(ambientProduct));
                gl.uniform4fv(locs.u_diffuseProduct, flatten(diffuseProduct));
                gl.uniform4fv(locs.u_specularProduct, flatten(specularProduct));
                gl.uniform1f(locs.u_shininess, 30.0);

                gl.drawElements(gl.TRIANGLES, square.numIndices, gl.UNSIGNED_SHORT, 0);
            }

            requestAnimationFrame(renderFrame);
        }

        requestAnimationFrame(renderFrame);
    }

    window.FlowerBoxEngine = {
        run: runFlowerBox
    };
})();
