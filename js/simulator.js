var Simulator = function (elementId, planeWidth, planeHeight) {
  if (!Detector.webgl) Detector.addGetWebGLMessage();

  this.container = document.getElementById(elementId);
  this.planeWidth = planeWidth;
  this.planeHeight = planeHeight;
  this.animation = false;
  this.points = [];
  this.currentPointIndex = 0;
  this.interpolationCoefficient = 0.0;
  this.millSpeed = 75.0; // mm per second

  this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10000);
  this.camera.position.set(0, 3000, 0);

  this.controls = new THREE.OrbitControls(this.camera, this.container);
  this.controls.rotateSpeed = 2.0;
  this.controls.enablePan = true;
  this.controls.enableZoom = true;

  this.scene = new THREE.Scene();
  this.scene.rotation.set(deg2rad(-90), 0, 0);

  this.lines = new THREE.Object3D();
  this.scene.add(this.lines);

  this.lineMaterial = {
    jog: new THREE.LineBasicMaterial({color: 0xff0000}),
    move: new THREE.LineBasicMaterial({color: 0x0000ff}),
  };

  this.addHelpers();
  this.develop();

  // Lights
  this.scene.add(new THREE.HemisphereLight(0x444444, 0x222222));
  this.addShadowedLight(1, 1, 1, 0xdddddd, 0.5);
  this.addShadowedLight(0.5, 1, -1, 0xaaaaaa, 1);

  // renderer
  this.renderer = new THREE.WebGLRenderer({antialias:true});
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
  if (this.animate) {
    var p1 = this.points[this.currentPointIndex];
    var p2 = this.points[this.currentPointIndex + 1];
    var dist = p1.distanceTo(p2);
    var step = this.millSpeed / (dist * 60);

    var ic = clamp(this.interpolationCoefficient + step, 0, 1);
    this.interpolationCoefficient = ic;

    this.mill.position.set(
      (1 - ic) * p1.x + ic * p2.x,
      (1 - ic) * p1.y + ic * p2.y,
      (1 - ic) * p1.z + ic * p2.z
    );

    if (ic == 1) {
      this.interpolationCoefficient = 0;

      if (this.currentPointIndex < (this.points.length - 2)) {
        this.currentPointIndex += 1;
      } else {
        this.currentPointIndex = 0;
        this.animate = false;
      }
    }
  }

  this.controls.update();
  this.renderer.render(this.scene, this.camera);
};

Simulator.prototype.addHelpers = function () {
  // Axes
  var axesHelper = new THREE.AxesHelper(200);
  this.scene.add(axesHelper);

  // Plane
  var geometry = new THREE.PlaneGeometry(2745, 1372);
  var material = new THREE.MeshBasicMaterial({color: 0x777777, transparent: true, opacity: 0.1, side: THREE.DoubleSide});
  var plane = new THREE.Mesh(geometry, material);
  var px = 2745 / 2;
  var py = 1372 / 2;
  plane.position.set(px, py, 0);
  this.scene.add(plane);

  // Mill
  var geometry = new THREE.CylinderGeometry(3.175, 3.175, 80);
  var material = new THREE.MeshStandardMaterial({color: 0xbbbbbb, emissive: 0x555555, metalness: 1.0});
  var cylinder = new THREE.Mesh(geometry, material);
  cylinder.rotation.set(deg2rad(-90), 0, 0);
  cylinder.position.set(0, 0, 40);
  this.mill = new THREE.Object3D();
  this.mill.add(cylinder);
  this.scene.add(this.mill);
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

Simulator.prototype.addLine = function (start, end, lineType) {
  var material = this.lineMaterial[lineType];
  var geometry = new THREE.Geometry();
  geometry.vertices.push(start, end);

  var line = new THREE.Line(geometry, material);
  this.lines.add(line);
};

Simulator.prototype.loadSBP = function (data) {
  var lineType
  var rows = data.split('\n');
  var currentPosition = new THREE.Vector3(0, 0, 0);

  this.sbpData = data;
  this.points = [currentPosition.clone()];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var cols = row.split(',');
    var start = currentPosition.clone();
    var end = new THREE.Vector3().copy(start);

    switch (cols[0]) {
      case 'J2':
        end.x = parseFloat(cols[1]);
        end.y = parseFloat(cols[2]);
        lineType = 'jog';
        break;
      case 'J3':
        end.x = parseFloat(cols[1]);
        end.y = parseFloat(cols[2]);
        end.z = parseFloat(cols[3]);
        lineType = 'jog';
        break;
      case 'JX':
        end.x = parseFloat(cols[1]);
        lineType = 'jog';
        break;
      case 'JY':
        end.y = parseFloat(cols[1]);
        lineType = 'jog';
        break;
      case 'JZ':
        end.z = parseFloat(cols[1]);
        lineType = 'jog';
        break;
      case 'M2':
        end.x = parseFloat(cols[1]);
        end.y = parseFloat(cols[2]);
        lineType = 'move';
        break;
      case 'M3':
        end.x = parseFloat(cols[1]);
        end.y = parseFloat(cols[2]);
        end.z = parseFloat(cols[3]);
        lineType = 'move';
        break;
    }

    if (lineType) {
      currentPosition.copy(end);
      this.addLine(start, end, lineType);
      this.points.push(currentPosition.clone());
    }

    lineType = null;
  }
};

Simulator.prototype.removeLines = function () {
  var line;
  var lines = this.lines;

  for (var i = lines.children.length - 1; i >= 0; i--) {
    line = lines.children[i];
    lines.remove(line);
    line.geometry.dispose();
  }

  line = null;
};

Simulator.prototype.develop = function () {
  var scope = this;

  function getBoxBSP() {
    var o = 20;
    var x = scope.planeWidth;
    var y = scope.planeHeight;
    var z = 24;

    var vertices = [
      new ThreeBSP.Vertex(o, o, 0),
      new ThreeBSP.Vertex(x, o, 0),
      new ThreeBSP.Vertex(x, y, 0),
      new ThreeBSP.Vertex(o, y, 0),
      new ThreeBSP.Vertex(o, o, z),
      new ThreeBSP.Vertex(x, o, z),
      new ThreeBSP.Vertex(x, y, z),
      new ThreeBSP.Vertex(o, y, z)
    ];

    var polygons = [
      new ThreeBSP.Polygon([vertices[3], vertices[2], vertices[1], vertices[0]]),
      new ThreeBSP.Polygon([vertices[4], vertices[5], vertices[6], vertices[7]]),
      new ThreeBSP.Polygon([vertices[0], vertices[1], vertices[5], vertices[4]]),
      new ThreeBSP.Polygon([vertices[2], vertices[3], vertices[7], vertices[6]]),
      new ThreeBSP.Polygon([vertices[0], vertices[4], vertices[7], vertices[3]]),
      new ThreeBSP.Polygon([vertices[1], vertices[2], vertices[6], vertices[5]])
    ];

    var node = new ThreeBSP.Node(polygons);
    return new ThreeBSP(node);
  }

  function getFrustumBSP() {
    var vertices = [
      new ThreeBSP.Vertex(0, 0, 10),
      new ThreeBSP.Vertex(100, 0, 10),
      new ThreeBSP.Vertex(100, 100, 10),
      new ThreeBSP.Vertex(0, 100, 10),
      new ThreeBSP.Vertex(0, 0, 100),
      new ThreeBSP.Vertex(100, 0, 100),
      new ThreeBSP.Vertex(100, 100, 100),
      new ThreeBSP.Vertex(0, 100, 100)
    ];

    var polygons = [
      new ThreeBSP.Polygon([vertices[3], vertices[2], vertices[1], vertices[0]]),
      new ThreeBSP.Polygon([vertices[4], vertices[5], vertices[6], vertices[7]]),
      new ThreeBSP.Polygon([vertices[0], vertices[1], vertices[5], vertices[4]]),
      new ThreeBSP.Polygon([vertices[2], vertices[3], vertices[7], vertices[6]]),
      new ThreeBSP.Polygon([vertices[0], vertices[4], vertices[7], vertices[3]]),
      new ThreeBSP.Polygon([vertices[1], vertices[2], vertices[6], vertices[5]])
    ];

    var node = new ThreeBSP.Node(polygons);
    return new ThreeBSP(node);
  }

  var result = getBoxBSP().subtract(getFrustumBSP());
  var material = new THREE.MeshLambertMaterial({color: 0xffd54f, emissive: 0x777777});
  var mesh = new THREE.Mesh(result.toGeometry(), material);
  this.scene.add(mesh);
};
