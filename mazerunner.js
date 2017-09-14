// Establezco el volumen d ela música de fondo
document.getElementById("music").volume= "0.1";

//SHADER DE VÉRTICES
var VSHADER_SOURCE =
  'attribute highp vec3 a_VertexPosition;\n' +
  'attribute highp vec2 a_TextureCoord;\n' +
  'attribute highp vec3 a_VertexNormal;\n' +

  'uniform highp mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'varying highp vec2 v_TextureCoord;\n' +
  'varying highp vec4 v_vertexPosition;\n' +
  'varying highp vec4 v_TransformedNormal;\n' +

  'varying highp vec4 v_viewSpace;\n' +

  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_VertexPosition, 1.0);\n' + // POSICIÓN EN EL CANVAS

  '  v_TextureCoord = a_TextureCoord;\n' +
  '  v_vertexPosition = u_ModelMatrix * vec4(a_VertexPosition, 1.0);\n' + // POSICIÓN EN EL ESPACIO DE LOS VÉRTICES
  '  v_TransformedNormal = u_NormalMatrix * vec4(a_VertexNormal, 1.0);\n' +

  '  v_viewSpace = u_ViewMatrix * u_ModelMatrix * vec4(a_VertexPosition, 1.0);\n' +

	'}\n';

// SHADER DE FRAGMENTOS
var FSHADER_SOURCE =
  'varying highp vec2 v_TextureCoord;\n' +
  'varying highp vec4 v_vertexPosition;\n' +
  'varying highp vec4 v_TransformedNormal;\n' +
  'varying highp vec4 v_viewSpace;\n' +

  'uniform sampler2D u_Sampler;\n' +
  'uniform sampler2D u_Sampler1;\n' +
  'uniform highp vec4 u_pointLightPosition;\n' +

  'const highp vec3 fogColor = vec3(0.3, 0.3, 0.3);\n' +
	'uniform highp float u_FogDensity;\n' + // Para niebla exponencial
	'const highp float fogStart = -0.09;\n' +
	'const highp float fogEnd = 0.5;\n' +

  'void main() {\n' +
	'  highp vec3 ambientLight = vec3(0.0, 0.0, 0.0);\n' +  // COLORES DE LAS LUCES
	'  highp vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);\n' +
	'  highp vec3 PointLightingSpecularColor = vec3(1.0, 1.0, 1.0);\n' +

	'  highp float materialShiness = 1.0;\n' +

  '	 highp float dist = length(v_viewSpace);\n' +
  '	 highp float fogFactor = ((((v_vertexPosition.z/v_vertexPosition.w)-fogStart) / (fogEnd - fogStart)) * (1.0 /exp(dist * 1.5*u_FogDensity)));\n' +
	'	 fogFactor = clamp(fogFactor, 0.0, 1.0);\n' +

	'  highp vec4 pointLightPosition = u_pointLightPosition;\n' +

	'  highp vec3 normal = normalize(v_TransformedNormal.xyz);\n'+
	'  highp vec3 eyeDirection = normalize(pointLightPosition.xyz-v_vertexPosition.xyz);\n'+ 

	'  highp vec3 lightDirection = normalize((pointLightPosition - v_vertexPosition).xyz);\n' + // VECTOR INCIDENCIA
	'  highp vec3 reflectionDirection = reflect(-lightDirection, normal);\n'+

	'  highp float specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), materialShiness);\n'+
	'  highp float directionalW = max(dot(v_TransformedNormal.xyz, lightDirection), 0.0);\n' +

    '  highp vec3 v_Lighting = ambientLight + (PointLightingSpecularColor * specularLightWeighting) + (2.0*directionalLightColor * directionalW);\n' + //

    '  highp vec4 texelColor = texture2D(u_Sampler, vec2(v_TextureCoord.s, v_TextureCoord.t));\n' +
    '  highp vec4 texelColor1 = texture2D(u_Sampler1, vec2(v_TextureCoord.s, v_TextureCoord.t));\n' +

    '  gl_FragColor = vec4(fogColor*(1.0-fogFactor), 1.0) + fogFactor*vec4(texelColor.rgb * texelColor1.rgb * v_Lighting.rgb, texelColor.a);\n' +
  '}\n';


var buffers, textures, obstacle, bullets, headshot;
var t0, starthour, timing, steps_sound, po_sound;
var mazeMatrix, mouseposprev;
var points = 0, level = 1, timeleft = 4*60;

// FUNCIÓN QUE GESTIONA LA POSICIÓN DLE RATÓN
function mousePosition(evt) {
      var mousePos = getMousePos(buffers.canvas, evt);
      if (mouseposprev == undefined) {mouseposprev = mousePos;}

      var desp_x = mousePos.x - mouseposprev.x;
      var desp_y = mousePos.y - mouseposprev.y;

      var thetax = desp_x/(buffers.canvas.width/2);
      var thetay = desp_y/(buffers.canvas.height/0.5);

      buffers.theta += thetax;
      buffers.thetay -= thetay;

      mouseposprev = mousePos;
}

// FUNCIÓN PARA MOSTRAR LOS CONTROLES DEL JUEGO
function showControls() {
    alert('Use:\n'+
          ' - Arrow Keys to move forwards/backwards or turn left/right.\n'+
          ' - LEFT CLIK ON MOUSE AND MOUSE MOVE for 3D view and 3D movement instead of left and right arrows.\n'+
          ' - Space Key for 2 diferent upwards view.\n'+
          " - 'X' Key for shooting.");
}

// PARA MOSTRAR INFORMACIÓN DE AUTORÍA
function showInfo() {

    alert("THIS CODE MADE BY: Carlos Awadallah Estévez\nSUBJECT: Gráficos y Visualización en 3D\nURJC, Ing. Sistemas Audiovisuales y Multimedia.");
}

// FUNCIÓN PARA INICIALIZAR LA APARIENCIA DE LA VENTANA PRINCIPAL DEL JUEGO
function init() {
    // Elimino todos los elementos del html a partir de 'menu-buttons'
    var menu = document.getElementById('menu-buttons');
    var father = menu.parentNode;
    father.removeChild(menu);
    // Muestro y añado atributos a los demás elementos, hasta ahora ocultos
    var m = document.getElementById('game');
    m.style = "display: block";
    document.getElementById('statistics').style = "margin: 100px 0 0 -200px";
    document.body.style.background = "black";
    document.getElementById("music").volume = "0.4";
    document.getElementById("music").src = "thriller.mp3";
    document.getElementById("title").style = "font-size: 80%";
    main(); // ejecuto función principal 
}

// FUNCIÓN PRINCIPAL (DE INICIALIZACIÓN)
function main() {
    // Varía el tamaño del laberinto y el tiempo en función del nivel actual
    if (level < 5) {MAZESZ = 10 * (level/2)} else {MAZESZ = 20; timeleft = (4*60-((level-4)*10))}
    buffers = {};
    textures = {};
    obstacle = {};
    bullets = [];
    // Inicializo las variables de tiempo y creo el laberinto
    // ----------------------------------------------------
    t0 = new Date();
    starthour = new Date();
    t0 = t0.getTime();
    mazeMatrix = {
    my_maze: new Maze(MAZESZ),
    };
    gameTime();
    timing = setInterval(gameTime, 1000);
    // ----------------------------------------------------
    // Inicializo sonidos
    // ----------------------------------------------------
    steps_sound = document.getElementById("steps");
    steps_sound.volume="0.35";
    po_sound = document.getElementById("po");
    po_sound.volume="0.5";
    // ----------------------------------------------------
    headshot = false;
    var canvas = document.getElementById('webgl');
    var canvas2d = document.getElementById('2d');
    var ctx_2d = canvas2d.getContext('2d');

    gl = getWebGLContext(canvas); // Extraigo el contexto 3D
    if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
    }

    // Objeto para almacenar ls variables de datos necesarias
    buffers.vertices = gl.createBuffer();
    buffers.textures = gl.createBuffer();
    buffers.indices = gl.createBuffer();
    buffers.floorVertices = gl.createBuffer();
    buffers.floorTextures = gl.createBuffer();
    buffers.floorIndices = gl.createBuffer();
    buffers.vertexNormalsBuffer = gl.createBuffer();
    buffers.floorNormalsBuffer = gl.createBuffer();
    buffers.gl = gl;
    buffers.canvas = canvas;
    buffers.canvas2d = canvas2d;
    buffers.ctx_2d = ctx_2d;
    buffers.despx = 0;
    buffers.despy = 0;
    buffers.despz = 0;
    buffers.theta = 0;
    buffers.thetay = 0;
    buffers.enter = true;
    buffers.up = 0;

    // Roto la miniatura del laberinto
    buffers.ctx_2d.clearRect(0, 0, buffers.canvas.width, buffers.canvas.height);
    buffers.ctx_2d.translate(50,58);
    buffers.ctx_2d.rotate(Math.PI);
    buffers.ctx_2d.translate(-50,-58);

    mazeMatrix.my_maze.randPrim(new Pos(0, 0)); // 0,0 SERÁ LA SALIDA
    // Genera una posición aleatoria de inicio en una posición mayor o igual al [10,10]
    do {
        buffers.camx = Math.floor(Math.random()*MAZESZ/2+MAZESZ/2);
        buffers.camy = Math.floor(Math.random()*MAZESZ/2+MAZESZ/2);
    } while(mazeMatrix.my_maze.rooms[buffers.camx][buffers.camy] == false)

    // Posición aleatoria para el obstáculo
    do {
        obstacle.x = Math.floor(Math.random()*MAZESZ);
        obstacle.y = Math.floor(Math.random()*MAZESZ);
        obstacle.z = 0;
    } while((mazeMatrix.my_maze.rooms[obstacle.x][obstacle.y] == false) || (buffers.camx == obstacle.x && buffers.camy == obstacle.y))
    // sumo 0.5 para aparecer en el centro de la casilla
    buffers.camx += 0.5;
    buffers.camy += 0.5;
    buffers.camz = 1;
    // Posición del punto rojo en la miniatura del laberinto
    mazeMatrix.my_maze.pos.x = buffers.camx;
    mazeMatrix.my_maze.pos.y = buffers.camy;
    // Inicialización de los shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
    }
    // Establezco la Matriz de perspectiva (fija durante todo el programa)
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    if (!u_ProjMatrix) {
        console.log('Failed to get the storage location of u_ProjMatrix');
        return;
    }
    var projMatrix = new Matrix4();
    projMatrix.setPerspective(100, canvas.width/canvas.height, 0.0001, 500);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    //Limpia el canvas 3D
    if (gl) {
        gl.clearColor(0.3, 0.3, 0.3, 1);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Añado un manejador de enventos para cuando se pulse una tecla
        document.addEventListener('keydown', keyHandler, false);
        // Inicializo texturas para cada nivel
        if (level == 1 || level == 5) {
          textures.texture1 = initTextures("pared.png");
          textures.texture3 = initTextures("sangre.jpg");
          textures.texture2 = initTextures("baldosas.jpg");
          textures.texture6 = initTextures("baldosas.jpg");
        } else if (level==2 || level == 6) {
          textures.texture1 = initTextures("madera.png")
          textures.texture3 = initTextures("sangre.jpg");
          textures.texture2 = initTextures("roto.png");
          textures.texture6 = initTextures("roto.png");
        } else if (level==3 || level == 7){
          textures.texture1 = initTextures("metal.png")
          textures.texture3 = initTextures("metal.png");
          textures.texture2 = initTextures("baldosas.jpg");
          textures.texture6 = initTextures("agujero.png");
        } else {
          textures.texture1 = initTextures("cristal.png")
          textures.texture3 = initTextures("cristal.png");
          textures.texture2 = initTextures("arena.png");
          textures.texture6 = initTextures("arena.png");
        }
        textures.texture4 = initTextures(undefined);
        textures.texture5 = initTextures("zombie.png");

        // Añado un manejador de eventos para capturar el movimiento del ratón
        addEventListener("mousedown", function(evt) {
          addEventListener("mousemove", mousePosition, false);
        }, false);
        addEventListener("mouseup", function(){
            removeEventListener("mousemove", mousePosition);
            mouseposprev = undefined;
        }, false);

        requestAnimationFrame(drawScene);
     }
}

// FUNCIÓN PARA OBTENER LA POSICIÓN DEL RATÓN EN EL CANVAS 2D
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

// FUNCIÓN DE INICIALIZACIÓN DE TEXTURAS
function initTextures(resource) {

  var texture1 = buffers.gl.createTexture(); //CREO LA TEXTURA
  buffers.gl.bindTexture(buffers.gl.TEXTURE_2D, texture1);
  buffers.gl.texImage2D(buffers.gl.TEXTURE_2D, 0, buffers.gl.RGBA, 1, 1, 0, buffers.gl.RGBA, buffers.gl.UNSIGNED_BYTE,
              new Uint8Array([255, 0, 0, 255])); //TEXTURA POR DEFECTO (ROJA)
  if (resource != undefined) {
    var img = new Image(); // SI SE QUIERE PONER UNA IMAGEN...
    img.src = resource;
    img.onload = function() { handleTextureLoaded(img, texture1); }
  }
  return texture1;
}

// FUNCIÓN DE GESTIÓN DE TEXTURAS
function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
  gl.UNSIGNED_BYTE, image); //IMAGEN COMO TEXTURA
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); // Repetición de la textura en el eje S
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); // Repetición de la textura en el eje T
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // PARA CUANDO TE ACERCAS: INTERPOLACIÓN LINEAL
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); //PARA CUANDO TE ALEJAS: EL MÁS CERCANO

  gl.generateMipmap(gl.TEXTURE_2D); // ESCALADO DE LA TEXTURA PARA CASOS EN QUE NOS ELEJEMOS O ACERQUEMOS
  gl.bindTexture(gl.TEXTURE_2D, null); // SE HACE UN BIND A NULL POR SI SE QUIERE USAR OTRA TEXTURA
}

// FUNCIÓN INICIALIZADORA DE BUFFERS
function initVertexBuffers(gl, option) {
    //       cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3

    var vertices = new Float32Array([
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,   // Front face
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5,   // Back face
    -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,   // Top face
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,   // Bottom face
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,   // Right face
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5    // Left face
    ]);


    var textureCoordinates = new Float32Array([
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0,  // Front
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0,// Back
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0,  // Top
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0,  // Bottom
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0, // Right
    0.0,  0.0,     1.00,  0.0,     1.0,  1.00,  0.0, 1.0,   // Left
    ]);

    var zombieTextureCoordinates = new Float32Array([
    0.0,  0.1,     0.00,  0.0,     1.0,  0.00,  1.0, 1.0,  // Front
    0.0,  0.1,     0.00,  0.0,     1.0,  0.00,  1.0, 1.0,  // Back
    1.0,  1.0,     1.00,  0.0,     0.0,  0.0,   0.0, 1.0,  // Top
    0.0,  1.0,     1.00,  1.0,     1.0,  0.0,   0.0, 0.0,  // Bottom
    0.0,  1.0,     1.00,  1.0,     1.0,  0.0,   0.0, 0.0,   // Left
    0.0,  1.0,     0.00,  0.0,     1.0,  0.0,   1.0, 1.0,   // Right
    ]);


    var vertexNormals = new Float32Array([
    0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,   // Front face
    0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,   // Back face
    0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,   // Top face
    0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,   // Bottom face
    1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,   // Right face
    -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0   // Left face
    ]);


    var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,
     4, 5, 6,   4, 6, 7,
     8, 9,10,   8,10,11,
    12,13,14,  12,14,15,
    16,17,18,  16,18,19,
    20,21,22,  20,22,23
    ]);

    var floorVertices = new Float32Array([
          -0.5, 0.5, 0,
          -0.5,-0.5, 0,
           0.5, 0.5, 0,

           0.5, 0.5, 0,
           0.5,-0.5, 0,
          -0.5,-0.5, 0,
    ]);

    var floorTextureCoordinates = new Float32Array([
    0.0,  0.0,    5.00,  0.0,     0.0,  5.00,
    0.0,  5.0,    5.0,   5.00,    5.0,  0.0,
    ]);

    var floorNormals = new Float32Array([
    0.0,  0.0,  1.0,     0.0,  0.0,  1.0,     0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,     0.0,  0.0,  1.0,     0.0,  0.0,  1.0
    ]);
    var floorIndices = new Uint8Array([
    0,  1,  2,      3,  4,  5
    ]);

    // Se enganchan unos u otros buffers en función de si se llama a este método para pintar las paredes, suelo, obstáculos, ...
    if (option == "walls" || option == "zombie") {

        if (!initArrayBuffer(gl, vertices, buffers.vertices, 3, gl.FLOAT, 'a_VertexPosition'))
        return -1;

        if (!initArrayBuffer(gl, vertexNormals, buffers.vertexNormalsBuffer, 3, gl.FLOAT, 'a_VertexNormal'))
        return -1;

        if (option == "walls") {
          if (!initArrayBuffer(gl, textureCoordinates, buffers.textures, 2, gl.FLOAT, "a_TextureCoord"))
          return -1;
        } else {
          if (!initArrayBuffer(gl, zombieTextureCoordinates, buffers.textures, 2, gl.FLOAT, "a_TextureCoord"))
          return -1;
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        return indices.length;

    } else if (option == "floor") {

        if (!initArrayBuffer(gl, floorVertices, buffers.floorVertices, 3, gl.FLOAT, 'a_VertexPosition'))
        return -1;

        if (!initArrayBuffer(gl, floorNormals, buffers.floorNormalsBuffer, 3, gl.FLOAT, 'a_VertexNormal'))
        return -1;

        if (!initArrayBuffer(gl, floorTextureCoordinates, buffers.floorTextures, 2, gl.FLOAT, "a_TextureCoord"))
        return -1;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.floorIndices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, floorIndices, gl.STATIC_DRAW);

        return floorIndices.length;
    }
}

// FUNCIÓN DE INICIALIZACIÓN Y ENGANCHE DE BUFFERS
function initArrayBuffer(gl, data, buffer, num, type, attribute) {
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

// FUNCIÓN PARA PINTAR LAS PAREDES
function drawWalls(enter) {
    // Texturas que se van a usar
    var textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textures);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.texture1); // ASOCIAMOS textures.textures1 A LA TEXTURA 0
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.texture3);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler1"), 1);
    // Obtengo matrices de modelo yvista respectivamente
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ModelMatrix || !u_ViewMatrix)
    {
        console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
        return;
    }
    var modelMatrix = new Matrix4(); // M
    var viewMatrix = new Matrix4();  // V
    // variables para controlar el movimiento en función del tiempo y evitar el movimiento lagueado
    var now = new Date();
    now = now.getTime();
    var dt = now - t0;
    t0 = now;

    // Componentes del vector de vista V(vx,vy,vz)
    var vx = Math.sin(buffers.theta)*dt/1000;
    var vy = Math.cos(buffers.theta)*dt/1000;
    var vz = Math.sin(buffers.thetay)*dt/1000;
    // Componentes de posición de la cámara C(cx,cy,cz)
    var tsin = new Date(); // Utilizo un seno para simular el movimiento de una persona al caminar
    var tsin = tsin.getTime();
    buffers.camx += buffers.despx*Math.sin(buffers.theta);
    buffers.camy += buffers.despy*Math.cos(buffers.theta);
    buffers.camz += buffers.despz*Math.sin(tsin*10/1000); // efecto de caminar

    if (buffers.up == 0) // Dependiendo de si se esta usando la vista desde arriba o la vista en 1ª persona
    {
        if (!crashWithSomething()) //Función para comprobar colisiones
        {
            viewMatrix.setLookAt(buffers.camx, buffers.camy, buffers.camz, buffers.camx+vx, buffers.camy+vy, buffers.camz+vz, 0, 0, 1);
        } else {
            steps_sound.pause();
            // si se colisiona se deshace el movimiento
            buffers.camx -= buffers.despx*Math.sin(buffers.theta);
            buffers.camy -= buffers.despy*Math.cos(buffers.theta);
            buffers.camz -= buffers.despz*Math.sin(tsin*10/1000);
            viewMatrix.setLookAt(buffers.camx, buffers.camy, buffers.camz, buffers.camx+vx, buffers.camy+vy, buffers.camz+vz, 0, 0, 1);
        }
        // ACTIVAR LA NIEBLA
        var u_FogDensity = gl.getUniformLocation(gl.program, 'u_FogDensity');
        gl.uniform1f(u_FogDensity, 1.00);

    } else {
        steps_sound.pause();
        // DESACTIVAR LA NIEBLA
        var u_FogDensity = gl.getUniformLocation(gl.program, 'u_FogDensity');
        gl.uniform1f(u_FogDensity, 0.00);
        if (crashWithSomething()){ // sigo comprobando colisiones, ya que el programa continua en ejecución normal
            buffers.camx -= buffers.despx*Math.sin(buffers.theta);
            buffers.camy -= buffers.despy*Math.cos(buffers.theta);
            buffers.camz -= buffers.despz*Math.sin(tsin*10/1000);
        }
        if (buffers.up == 1){ // establezco vista desde arriba
            viewMatrix.setLookAt(MAZESZ/2, MAZESZ/2, 11, 0, 0, -200, 0, 1, 0);
        } else if (buffers.up == 2) {
            viewMatrix.setLookAt(buffers.camx, buffers.camy, 4, 0, 0, -200, 0, 1, 0);
        }
    }
    // Obtengo localización del uniform utilizado para la luz puntual
    var u_pointLightPosition = gl.getUniformLocation(gl.program, 'u_pointLightPosition');
    if (!u_pointLightPosition)
    {
        console.log('Failed to Get the storage location of u_pointLightPosition');
        return;
    }
    gl.uniform4fv(u_pointLightPosition,[buffers.camx,buffers.camy,buffers.camz, 1.00]); // establezco el punto en el mismo sitio que la cámara

    // Pinto las paredes
    for (var i=0;i<mazeMatrix.my_maze.rooms.length;i++) {
        for (var j=0;j<mazeMatrix.my_maze.rooms.length;j++) {
            if (mazeMatrix.my_maze.rooms[i][j] == false)
            {
                modelMatrix.setTranslate(i+0.5, j+0.5, 1).scale(1, 1, 2);
                gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

                if(enter){gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);}
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

                var normalMatrix = new Matrix4();
                normalMatrix.set(modelMatrix);
                normalMatrix.invert();
                normalMatrix.transpose();
                var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
                gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

                gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_BYTE, 0);
            }
       }
    }
}

// FUNCIÓN QUE PINTA EL SUELO
function drawFloor() {

    // Funcionalidad análoga a drawWalls

    var textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.floorTextures);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.texture2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.texture6); 
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler1"), 1);
    // Obtengo sólo la matriz de modelo, para este caso no necesito cambiar la vista
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix)
    {
        console.log('Failed to Get the storage location of u_ModelMatrix');
        return;
    }
    var modelMatrix = new Matrix4();
    // Traslado el suelo al centro del laberinto y lo escalo para que ocupe toda su extensión
    modelMatrix.setTranslate(MAZESZ/2,MAZESZ/2,0).scale(MAZESZ, MAZESZ, 1);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.floorIndices);

    var normalMatrix = new Matrix4();
    normalMatrix.set(modelMatrix);
    normalMatrix.invert();
    normalMatrix.transpose();
    var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
    gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

    gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_BYTE, 0)
}

// FUNCIÓN PARA PINTAR LA CASILLA DE SALIDA
function drawExit() {
      /* Misma función y mismos buffers que drawFloor() cambiando únicamente algunos
         detalles como la textura utilizada y la posición                          */

      var textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
      gl.enableVertexAttribArray(textureCoordAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.floorTextures);
      gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.texture4); // utilizo texura por defecto
      gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);

      // Obtengo sólo la matriz de modelo, para este caso no necesito cambiar la vista
      var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
      if (!u_ModelMatrix)
      {
        console.log('Failed to Get the storage location of u_ModelMatrix');
        return;
      }
      var modelMatrix = new Matrix4();
      // Traslado a la posición de salida
      modelMatrix.setTranslate(0.5,0.5,0.01);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.floorIndices);

      var normalMatrix = new Matrix4();
      normalMatrix.set(modelMatrix);
      normalMatrix.invert();
      normalMatrix.transpose();
      var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
      gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

      gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_BYTE, 0)

}

// FUNCIÓN QUE PINTA DISTINTOS CUBOS (Para visualización desde arriba, obstáculos y balas)
function drawCube(option) {
    // Texturas que se van a usar
    if (option == "CAMERA") {
        var texel = textures.texture4;
        var scaleFactor = [0.4, 0.4, 0.4];
        var translateTo = [buffers.camx, buffers.camy, 2];
    }
    else if (option == "OBSTACLE") {
        var texel = textures.texture5; //zombie
        var scaleFactor = [0.5, 0.5, 1.5];
        var translateTo = [obstacle.x+0.5, obstacle.y+0.5, 0.8];
    }
    else if (option == "BULLET") {
        if (bullets.length == 0) {return;}
            for (i=0;i<bullets.length;i++) {
                bullets[i].update();
            }
        var texel = textures.texture4; //bala
        var scaleFactor = [0.05, 0.05, 0.05];
    }
    else {
        return;
    }

    var textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textures);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texel);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texel);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler1"), 1);

    // Obtengo matrices de modelo yvista respectivamente
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix)
    {
        console.log('Failed to Get the storage locations of u_ModelMatrix');
        return;
    }
    var modelMatrix = new Matrix4(); // M
    if (option == "BULLET") {
        // Pinto las balas, cuyos datos están almacenados en el objeto bullets
        for (i=0;i<bullets.length;i++) {
            modelMatrix.setTranslate(bullets[i].x, bullets[i].y, bullets[i].z).rotate(0,0,bullets[i].angle,1).scale(scaleFactor[0],scaleFactor[1],scaleFactor[2]);
            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

            var normalMatrix = new Matrix4();
            normalMatrix.set(modelMatrix);
            normalMatrix.invert();
            normalMatrix.transpose();
            var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
            gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

            gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_BYTE, 0);
      }
  } else {
        modelMatrix.setTranslate(translateTo[0], translateTo[1], translateTo[2]).scale(scaleFactor[0],scaleFactor[1],scaleFactor[2]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        var normalMatrix = new Matrix4();
        normalMatrix.set(modelMatrix);
        normalMatrix.invert();
        normalMatrix.transpose();
        var nUniform = gl.getUniformLocation(gl.program, "u_NormalMatrix");
        gl.uniformMatrix4fv(nUniform, false, normalMatrix.elements);

        gl.drawElements(gl.TRIANGLES, buffers.n, gl.UNSIGNED_BYTE, 0);  
  }
  
}

// FUNCIÓN QUE INVOCA Y CONTIENE LO NECESARIO PARA PINTAR
function drawScene() {
    buffers.gl.clear(buffers.gl.COLOR_BUFFER_BIT | buffers.gl.DEPTH_BUFFER_BIT); // Limpia lienzo y buffer de profundidad

    // Obtengo nº de vértices
    n = initVertexBuffers(buffers.gl, "walls");
    if (n < 0) {
      console.log('Failed to set the vertex information');
      return;
    } else {
      buffers.n = n;
    }
    drawWalls(buffers.enter); // Pinto muros
    drawCube("CAMERA");       // Pinto cubo que representa la cámara
    drawCube("BULLET");       // Pinto balas
    // Compruebo si las balas impactan con el obstáculos después de actualizar su posición
    if (!headshot){
        for (i=0;i<bullets.length;i++) {
          if (Math.floor(bullets[i].x) == Math.floor(obstacle.x) && Math.floor(bullets[i].y) == Math.floor(obstacle.y)) {
              headshot = true;
              points += 50;
              document.getElementById("p_points").innerHTML = "points: " + points + " pts.";
              bullets.splice(i,1);
          }
        }
    }
    // Compruebo que las balas choquen con los muros
    for (var i=0;i<mazeMatrix.my_maze.rooms.length;i++) {
      for (var j=0;j<mazeMatrix.my_maze.rooms.length;j++) {
        for (x=0;x<bullets.length;x++){
          if (i == Math.floor(bullets[x].x) && j == Math.floor(bullets[x].y) && mazeMatrix.my_maze.rooms[i][j] == false)
          {
            bullets.splice(x,1);
          }
        }
      }
    }
    // Pinto el obstáculo si sigue vivo
    if (headshot == false) {
        n = initVertexBuffers(buffers.gl, "zombie");
        drawCube("OBSTACLE");
    }

    // Obtengo nº de vértices para el suelo
    n = initVertexBuffers(buffers.gl, "floor");
    if (n < 0) {
      console.log('Failed to set the vertex information');
      return;
    } else {
      buffers.n = n;
    }
    drawFloor(); // Pinto suelo
    drawExit();  // Pinto casilla de salida
    // Actualizo y pinto la posición del punto rojo en la miniatura
    buffers.ctx_2d.clearRect(0, 0, buffers.canvas.width, buffers.canvas.height);
    mazeMatrix.my_maze.pos.x = Math.floor(buffers.camx);
    mazeMatrix.my_maze.pos.y = Math.floor(buffers.camy);
    mazeMatrix.my_maze.draw(buffers.ctx_2d, 0, 0, 5, 0);
    // Compruebo si se ha llegado al final del laberinto
    if (mazeMatrix.my_maze.pos.x == 0 && mazeMatrix.my_maze.pos.y == 0) {
        finishGame("WIN");
    } else {
        requestAnimationFrame(drawScene);
    }
}

// FUNCIÓN DE DETECCIÓN DE COLISIONES
function crashWithSomething() {
  var crashed = false;
  for (var i=0;i<mazeMatrix.my_maze.rooms.length;i++) {
    for (var j=0;j<mazeMatrix.my_maze.rooms.length;j++) {
      if (i == Math.floor(buffers.camx+0.1) && j == Math.floor(buffers.camy) && mazeMatrix.my_maze.rooms[i][j] == false)
      {
        crashed = true;
        console.log("crashed");
      } else if (i == Math.floor(buffers.camx) && j == Math.floor(buffers.camy+0.1) && mazeMatrix.my_maze.rooms[i][j] == false){
        crashed = true;
        console.log("crashed");
      } else if (i == Math.floor(buffers.camx-0.1) && j == Math.floor(buffers.camy) && mazeMatrix.my_maze.rooms[i][j] == false){
        crashed = true;
        console.log("crashed");
      } else if (i == Math.floor(buffers.camx) && j == Math.floor(buffers.camy-0.1) && mazeMatrix.my_maze.rooms[i][j] == false){
        crashed = true;
        console.log("crashed");
      }
    }
  }
  if (!headshot) {
    console.log("zombie");
    if (Math.floor(buffers.camx) == Math.floor(obstacle.x) && Math.floor(buffers.camy) == Math.floor(obstacle.y)) {crashed=true;}
  }

  return crashed;
}

// CONSTRUCTOR DE BALAS
function Bullet() {
    this.x = buffers.camx;
    this.y = buffers.camy;
    this.z = 1;
    this.angle = buffers.theta;

    this.update = function() {
        this.y += 0.05*Math.cos(this.angle);
        this.x += 0.05*Math.sin(this.angle);
    }
}

// FUNCIÓN DE FINALIZACIÓN DEL JUEGO
function finishGame(option) {

    clearInterval(timing);
    steps_sound.pause();
    if (option == "WIN") {
      // Se muestra uno u otro mensaje dependiendo del nivel actual
      document.getElementById("msg").innerHTML = "exit of level " + level + " reached."
      var nextLevel = level +1;
      if (nextLevel < 5) {
          var nextMazeSize = 10 * (nextLevel/2);
          document.getElementById("help").innerHTML = "Help: remember that maze size will be " + nextMazeSize+"x"+nextMazeSize + " in level " + nextLevel + ".";
      } else if (nextLevel == 5){
          document.getElementById("help").innerHTML = "Help: HURRY UP! from now on, you will have 10 seconds less for each level, with 20x20 maze size";
      } else {
          document.getElementById("help").innerHTML = "Help: HURRY UP! you will have 10 seconds left in level " + nextLevel + ".";
      }
    } else if (option == "LOSE") {
      // Mostrar mensaje en caso de que se agote el tiempo
      document.getElementById("msg").innerHTML = "TIME'S UP :("
      document.getElementById("help").innerHTML = "";
      document.getElementById("next_stats").innerHTML = "Show Statistics";
      document.getElementById("next_stats").onclick = function() {
        document.getElementById("help").innerHTML = "your statistics: <br>   LEVEL: " + level + "<br>   SCORE: " + points
        document.getElementById("next_stats").onclick = nextLevel();
      }
    } else {return;}

    displayModal();
}

// FUNCIÓN QUE GESTIONA EL CAMBIO DE NIVEL
function nextLevel() {

  points += 100;
  level += 1;
  document.getElementById("p_points").innerHTML = "points: " + points + " pts.";
  document.getElementById("p_level").innerHTML = "level: " + level;
  var modal = document.getElementById('myModal');
  modal.style.display = "none"; // oculto la ventana modal

  main();
}

// FUNCIÓN PARA DESPLEGAR LA VENTANA MODAL
function displayModal() {
    var modal = document.getElementById('myModal');
    modal.style.display = "block";
}

// FUNCIÓN QUE CONTROLA EL TIEMPO DE JUEGO
function gameTime() {
    var msecPerMinute = 1000 * 60;
    var dateMsec = starthour.getTime();

    var actual = new Date();
    var diference = 1000*timeleft - (actual.getTime()-dateMsec);
    // Calculate the hours, minutes, and seconds.

    var minutes = Math.floor(diference / msecPerMinute );
    diference = diference - (minutes * msecPerMinute );

    var seconds = Math.floor(diference / 1000 );

    // Muestro el tiempo
    var hour = 0 + " : " + minutes + " : " + seconds;
    document.getElementById("timing").innerHTML = hour;
    if (minutes==0 && seconds==0 || minutes<0)
    {
        finishGame("LOSE");
    }
}

// MANEJADOR DE EVENTOS (pulsar tecla)
function keyHandler(event) {
  buffers.enter = true;
  switch(event.key) {
    case "ArrowUp":
      steps_sound.play();
      buffers.despx = 0.0085;
      buffers.despy = 0.0085;
      buffers.despz = 0.01;

      break;
    case "ArrowDown":
      steps_sound.play();
      buffers.despx = -0.0085;
      buffers.despy = -0.0085;
      buffers.despz = 0.01;

      break;
    case "ArrowLeft":
      steps_sound.pause();
      buffers.despx = 0;
      buffers.despy = 0;
      buffers.despz = 0;
      buffers.theta = (buffers.theta - 0.05);

      break;
    case "ArrowRight":
      steps_sound.pause();
      buffers.despx = 0;
      buffers.despy = 0;
      buffers.despz = 0;
      buffers.theta = buffers.theta + 0.05;

      break;
    case " ":
      buffers.up += 1;
      if (buffers.up == 3) {
        buffers.up = 0;
      }
      break;
    case "x":
      po_sound.pause();
      bullets.push(new Bullet());
      po_sound.play();
      break;
    default:
      console.log("Key not handled");
  }
}
