import './css/main.sass';
import * as THREE from 'three';
import Scene from './app/Scene';
import Loader from './app/Loader';

var scene = new Scene();
Loader.loadMesh('theater_chair', function(mesh) {
  var scale = 0.65,
      nPerRow = 100;

  // rows
  for (var j=0; j < 50; j++) {
    for (var i=0; i < nPerRow; i++) {
      var mesh_ = mesh.clone();
      mesh_.position.set(
        i * 10 * scale + (5 * (j%2) * scale),
        (j+1)*5 * scale,
        j * (10 + 10) * scale);
      mesh_.scale.set(scale, scale, scale);
      scene.collidable.push(mesh_);
      scene.scene.add(mesh_);
    }
    var height = 5 * j * scale,
        geometry = new THREE.BoxGeometry(10 * nPerRow, height, 20*scale),
      material = new THREE.MeshLambertMaterial({ color: 0x22222 }),
        rowMesh = new THREE.Mesh(geometry, material);
    rowMesh.position.set(0, height/2, (j*20*scale - 5));
    scene.collidable.push(rowMesh);
    scene.scene.add(rowMesh);
  }
});
scene.render();