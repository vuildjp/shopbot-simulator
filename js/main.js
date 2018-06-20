var simulator;

$(window).on('load', function() {
  simulator = new Simulator('canvas', 2440, 1220);
  animate();

  $('[name="sbp"]').on('change', function(evt) {
    var files = evt.target.files;

    if (files.length > 0) {
      var file = files[0];
      var reader = new FileReader();

      reader.onload = function(evt) {
        simulator.loadSBP(evt.target.result);
      };

      reader.readAsText(file);
    }
  });
});

$(window).on('resize', function() {
  simulator.resize();
});

function animate() {
  requestAnimationFrame(animate);
  simulator.render();
}
