var Simulator = function (elementId, planeWidth, planeHeight) {
  if (!Detector.webgl) Detector.addGetWebGLMessage();

  this.container = document.getElementById(elementId);
  this.planeWidth = planeWidth;
  this.planeHeight = planeHeight;

  this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10000);
  this.camera.position.set(0, 3000, 0);

  this.controls = new THREE.OrbitControls(this.camera, this.container);
  this.controls.rotateSpeed = 2.0;
  this.controls.enablePan = true;
  this.controls.enableZoom = true;

  this.scene = new THREE.Scene();
  this.scene.rotation.set(deg2rad(-90), 0, 0);

  this.jogLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
  this.moveLineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff});
  this.currentPosition = new THREE.Vector3(0, 0, 0);
  this.addHelpers();

  // Lights
  this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122));
  this.addShadowedLight(1, 1, 1, 0xdddddd, 0.5);
  this.addShadowedLight(0.5, 1, -1, 0xaaaaaa, 1);

  // renderer
  this.renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  this.renderer.setClearColor(0xffffff);
  this.renderer.setPixelRatio(window.devicePixelRatio);
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.renderer.gammaInput = true;
  this.renderer.gammaOutput = true;
  this.renderer.shadowMap.enabled = true;
  this.container.appendChild(this.renderer.domElement);
};

Simulator.prototype.resize = function () {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
};

Simulator.prototype.render = function () {
  this.controls.update();
  this.renderer.render(this.scene, this.camera);
};

Simulator.prototype.addHelpers = function () {
  // Axes
  var axesHelper = new THREE.AxesHelper(200);
  this.scene.add(axesHelper);

  // Plane
  var geometry = new THREE.PlaneGeometry(this.planeWidth, this.planeHeight);
  var material = new THREE.MeshBasicMaterial({color: 0x777777, transparent: true, opacity: 0.1, side: THREE.DoubleSide});
  var plane = new THREE.Mesh(geometry, material);
  var px = this.planeWidth / 2;
  var py = this.planeHeight / 2;
  plane.position.set(px, py, 0);
  this.scene.add(plane);
};

Simulator.prototype.addShadowedLight = function (x, y, z, color, intensity) {
  var directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  directionalLight.shadow.camera.left = -1;
  directionalLight.shadow.camera.right = 1;
  directionalLight.shadow.camera.top = 1;
  directionalLight.shadow.camera.bottom = -1;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 4;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.bias = -0.005;
  directionalLight.castShadow = true;
  this.scene.add(directionalLight);
};

Simulator.prototype.addJogLine = function (start, end) {
  var material = this.jogLineMaterial;
  var geometry = new THREE.Geometry();
  geometry.vertices.push(start, end);

  var line = new THREE.Line(geometry, material);
  this.scene.add(line);
};

Simulator.prototype.addMoveLine = function (start, end) {
  var material = this.moveLineMaterial;
  var geometry = new THREE.Geometry();
  geometry.vertices.push(start, end);

  var line = new THREE.Line(geometry, material);
  this.scene.add(line);
};

Simulator.prototype.loadSBP = function (data) {
  var lines = data.split('\n');
  var currentPosition = this.currentPosition;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (line.startsWith('J')) {
      var cols = line.split(',');

      if (cols.length == 4) {
        var x = parseFloat(cols[1]);
        var y = parseFloat(cols[2]);
        var z = parseFloat(cols[3]);
        var target = new THREE.Vector3(x, y, z);
        this.addJogLine(currentPosition.clone(), target);
        currentPosition.set(x, y, z);
      }
    }

    if (line.startsWith('M')) {
      var cols = line.split(',');

      if (cols.length == 4) {
        var x = parseFloat(cols[1]);
        var y = parseFloat(cols[2]);
        var z = parseFloat(cols[3]);
        var target = new THREE.Vector3(x, y, z);
        this.addMoveLine(currentPosition.clone(), target);
        currentPosition.set(x, y, z);
      }
    }
  }
};
