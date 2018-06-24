var Simulator = function (elementId, planeWidth, planeHeight, millSpeed) {
  if (!Detector.webgl) Detector.addGetWebGLMessage();

  this.container = document.getElementById(elementId);
  this.planeWidth = planeWidth;
  this.planeHeight = planeHeight;

  // Animation settings
  this.animation = false;
  this.currentPointIndex = 0;
  this.interpolationCoefficient = 0.0;
  this.points = [];

  // Mill settings
  this.millSpeed = millSpeed; // mm per second
  this.millDiameter = 6.35;
  this.millRadius = this.millDiameter / 2;
  this.millHeight = 80;

  // Camera
  this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
  this.camera.position.set(0, 10, 0);

  this.controls = new THREE.OrbitControls(this.camera, this.container);
  this.controls.rotateSpeed = 2.0;
  this.controls.enablePan = true;
  this.controls.enableZoom = true;

  this.scene = new THREE.Scene();
  this.scene.rotation.set(deg2rad(-90), 0, 0);
  this.scene.scale.set(0.01, 0.01, 0.01);

  // Objects
  this.materials = {
    jog: new THREE.LineBasicMaterial({color: 0xff0000}),
    move: new THREE.LineBasicMaterial({color: 0x0000ff}),
    sheet: new THREE.MeshLambertMaterial({color: 0xffd54f, emissive: 0x777777}),
  };
  this.toolpath = new THREE.Object3D();
  this.shopbot = new THREE.Object3D();
  this.scene.add(this.toolpath);
  this.scene.add(this.shopbot);
  this.addHelpers();
  this.addSheet();
  this.addShopbot();

  // Lights
  this.scene.add(new THREE.HemisphereLight(0x444444, 0x222222));
  this.addShadowedLight(-1, -1, 2, 0xdddddd, 0.5);
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

      if (p2.lineType == 'move') {
        var sheetBSP = this.sheetBSP.subtract(this.getToolpathBSP(p1, p2));
        var mesh = new THREE.Mesh(sheetBSP.toGeometry(), this.materials.sheet);
        this.scene.add(mesh);
        this.scene.remove(this.sheetMesh);
        this.sheetMesh.geometry.dispose();
        this.sheetBSP = sheetBSP;
        this.sheetMesh = mesh;
      }

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
  var radius = this.millRadius;
  var height = this.millHeight;
  var geometry = new THREE.CylinderGeometry(radius, radius, height);
  var material = new THREE.MeshStandardMaterial({color: 0xbbbbbb, emissive: 0x555555, metalness: 1.0});
  var cylinder = new THREE.Mesh(geometry, material);
  cylinder.rotation.set(deg2rad(-90), 0, 0);
  cylinder.position.set(0, 0, height / 2);
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

Simulator.prototype.addSheet = function () {
  var sheetBSP = this.getSheetBSP();
  var material = this.materials.sheet;
  var mesh = new THREE.Mesh(sheetBSP.toGeometry(), material);
  this.sheetBSP = sheetBSP;
  this.sheetMesh = mesh;
  this.scene.add(mesh);
};

Simulator.prototype.addShopbot = function () {
  
};

Simulator.prototype.addLine = function (start, end, lineType) {
  var material = this.materials[lineType];
  var geometry = new THREE.Geometry();
  geometry.vertices.push(start, end);

  var line = new THREE.Line(geometry, material);
  this.toolpath.add(line);
};

Simulator.prototype.removeLines = function () {
  var line;
  var lines = this.toolpath;

  for (var i = lines.children.length - 1; i >= 0; i--) {
    line = lines.children[i];
    lines.remove(line);
    line.geometry.dispose();
  }

  line = null;
};

Simulator.prototype.loadSBP = function (data) {
  var lineType;
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
      var point = currentPosition.clone();
      point.lineType = lineType;
      this.points.push(point);
      this.addLine(start, end, lineType);
    }

    lineType = null;
  }
};

Simulator.prototype.getHexahedronPolygons = function (v0, v1, v2, v3, v4, v5, v6, v7) {
  /**
   * Vertex indices
   *
   *   6____5
   * 7/|__4/|           Z
   * | 2__|_1           | X
   * 3/___0/       Y ___|/
   *
   */
  var vertices = [
    new ThreeBSP.Vertex(v0.x, v0.y, v0.z),
    new ThreeBSP.Vertex(v1.x, v1.y, v1.z),
    new ThreeBSP.Vertex(v2.x, v2.y, v2.z),
    new ThreeBSP.Vertex(v3.x, v3.y, v3.z),
    new ThreeBSP.Vertex(v4.x, v4.y, v4.z),
    new ThreeBSP.Vertex(v5.x, v5.y, v5.z),
    new ThreeBSP.Vertex(v6.x, v6.y, v6.z),
    new ThreeBSP.Vertex(v7.x, v7.y, v7.z)
  ];

  var polygons = [
    new ThreeBSP.Polygon([vertices[3], vertices[2], vertices[1], vertices[0]]),
    new ThreeBSP.Polygon([vertices[4], vertices[5], vertices[6], vertices[7]]),
    new ThreeBSP.Polygon([vertices[0], vertices[1], vertices[5], vertices[4]]),
    new ThreeBSP.Polygon([vertices[2], vertices[3], vertices[7], vertices[6]]),
    new ThreeBSP.Polygon([vertices[0], vertices[4], vertices[7], vertices[3]]),
    new ThreeBSP.Polygon([vertices[1], vertices[2], vertices[6], vertices[5]])
  ];

  return polygons;
};

Simulator.prototype.getSheetBSP = function () {
  var s = 20; // shift xy
  var x = this.planeWidth + s;
  var y = this.planeHeight + s;
  var z = 24;

  var v0 = new ThreeBSP.Vertex(s, s, 0);
  var v1 = new ThreeBSP.Vertex(x, s, 0);
  var v2 = new ThreeBSP.Vertex(x, y, 0);
  var v3 = new ThreeBSP.Vertex(s, y, 0);
  var v4 = new ThreeBSP.Vertex(s, s, z);
  var v5 = new ThreeBSP.Vertex(x, s, z);
  var v6 = new ThreeBSP.Vertex(x, y, z);
  var v7 = new ThreeBSP.Vertex(s, y, z);

  var polygons = this.getHexahedronPolygons(v0, v1, v2, v3, v4, v5, v6, v7);
  var node = new ThreeBSP.Node(polygons);
  return new ThreeBSP(node);
};

Simulator.prototype.getToolpathBSP = function (p1, p2) {
  var v0, v1, v2, v3, v4, v5, v6, v7;
  var z = 100;

  var va = new THREE.Vector3().subVectors(p2, p1);
  var vb = new THREE.Vector3(0, 0, 1);
  var cross = new THREE.Vector3().crossVectors(va, vb);

  if (cross.x == 0 && cross.y == 0) {
    var millRadius = this.millRadius;

    v0 = new THREE.Vector3(p2.x - millRadius, p2.y - millRadius, p2.z);
    v1 = new THREE.Vector3(p2.x + millRadius, p2.y - millRadius, p2.z);
    v2 = new THREE.Vector3(p2.x + millRadius, p2.y + millRadius, p2.z);
    v3 = new THREE.Vector3(p2.x - millRadius, p2.y + millRadius, p2.z);
    v4 = v0.clone().setZ(z);
    v5 = v1.clone().setZ(z);
    v6 = v2.clone().setZ(z);
    v7 = v3.clone().setZ(z);
  } else {
    cross.normalize();
    cross.multiplyScalar(this.millRadius);

    var crossInv = cross.clone().negate();

    v0 = new THREE.Vector3().addVectors(p1, crossInv);
    v1 = new THREE.Vector3().addVectors(p1, cross);
    v2 = new THREE.Vector3().addVectors(p2, cross);
    v3 = new THREE.Vector3().addVectors(p2, crossInv);
    v4 = v0.clone().setZ(z);
    v5 = v1.clone().setZ(z);
    v6 = v2.clone().setZ(z);
    v7 = v3.clone().setZ(z);
  }

  var polygons = this.getHexahedronPolygons(v0, v1, v2, v3, v4, v5, v6, v7);
  var node = new ThreeBSP.Node(polygons);
  return new ThreeBSP(node);
}
