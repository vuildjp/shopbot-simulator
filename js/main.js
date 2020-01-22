var simulator;
var $positionX, $positionY, $positionZ;
// var polyfill = new WebVRPolyfill();

$(window).on('load', function() {
  $positionX = $('[name="positionX"]');
  $positionY = $('[name="positionY"]');
  $positionZ = $('[name="positionZ"]');

  var millSpeed = parseFloat($('[name="millSpeed"]').val());
  simulator = new Simulator('canvas', millSpeed);
  animate();

  $('[name="sbp"]').on('change', function(evt) {
    var files = evt.target.files;

    if (files.length > 0) {
      var file = files[0];
      var reader = new FileReader();

      reader.onload = function(evt) {
        simulator.loadSbp(evt.target.result);
      };

      reader.readAsText(file);
    }
  });

  $('[name="start"]').on('click', function(evt) {
    simulator.animate = true;
  });

  $('[name="stop"]').on('click', function(evt) {
    simulator.animate = false;
  });

  $('[name="millSpeed"]').on('change', function(evt) {
    simulator.millSpeed = parseFloat(evt.target.value);
  });

  $('[name="visibility"]').on('change', function(evt) {
    switch (evt.target.value) {
      case 'sheet':
        simulator.sheetMesh.visible = evt.target.checked;
        break;
      case 'toolpath':
        simulator.toolpath.visible = evt.target.checked;
        break;
      case 'shopbot':
        simulator.shopbot.visible = evt.target.checked;
        break;
    }
  });

  $(window).on('resize', function() {
    simulator.resize();
  });
});

function animate() {
  requestAnimationFrame(animate);
  simulator.render();

  if (simulator.animate && simulator.interpolationCoefficient == 0) {
    $positionX.val(simulator.mill.position.x);
    $positionY.val(simulator.mill.position.y);
    $positionZ.val(simulator.mill.position.z);
  }
}

function requestSbp(url) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.addEventListener('load', function () {
    simulator.loadSbp(xhr.response)
  })
  xhr.send()
}

function loadToolpath(data) {
  $('#responsetext').text(data)
  data = JSON.parse(data)
  for (var i = 0; i < data.sbps.length; i++) {
    var url = data.sbps[i]
    requestSbp(url)
  }
}
