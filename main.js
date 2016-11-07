import './css/main.sass';
import * as THREE from 'three';
import PointerLockControls from './app/PointerLock';
import Loader from './app/Loader';

var camera, scene, renderer;
var geometry, material, mesh;
var controls;
var objects = [];
var raycaster;

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if ( havePointerLock ) {

  var element = document.body;

  var pointerlockchange = function ( event ) {

    if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

      controlsEnabled = true;
      controls.enabled = true;

      blocker.style.display = 'none';

    } else {

      controls.enabled = false;

      blocker.style.display = '-webkit-box';
      blocker.style.display = '-moz-box';
      blocker.style.display = 'box';

      instructions.style.display = '';

    }

  };

  var pointerlockerror = function ( event ) {

    instructions.style.display = '';

  };

  // Hook pointer lock state change events
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

  document.addEventListener( 'pointerlockerror', pointerlockerror, false );
  document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
  document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

  instructions.addEventListener( 'click', function ( event ) {

    instructions.style.display = 'none';

    // Ask the browser to lock the pointer
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

    if ( /Firefox/i.test( navigator.userAgent ) ) {

      var fullscreenchange = function ( event ) {

        if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

          document.removeEventListener( 'fullscreenchange', fullscreenchange );
          document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

          element.requestPointerLock();
        }

      };

      document.addEventListener( 'fullscreenchange', fullscreenchange, false );
      document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

      element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

      element.requestFullscreen();

    } else {

      element.requestPointerLock();

    }

  }, false );

} else {
  instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

init();
animate();

var controlsEnabled = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();

function init() {

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

  var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
  light.position.set( 0.5, 1, 0.75 );
  scene.add( light );

  controls = new THREE.PointerLockControls( camera );
  scene.add( controls.getObject() );

  var onKeyDown = function ( event ) {

    switch ( event.keyCode ) {

      case 38: // up
      case 87: // w
        moveForward = true;
        break;

      case 37: // left
      case 65: // a
        moveLeft = true; break;

      case 40: // down
      case 83: // s
        moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        moveRight = true;
        break;

      case 32: // space
        if ( canJump === true ) velocity.y += 350;
        canJump = false;
        break;

    }

  };

  var onKeyUp = function ( event ) {

    switch( event.keyCode ) {

      case 38: // up
      case 87: // w
        moveForward = false;
        break;

      case 37: // left
      case 65: // a
        moveLeft = false;
        break;

      case 40: // down
      case 83: // s
        moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        moveRight = false;
        break;

    }

  };

  document.addEventListener( 'keydown', onKeyDown, false );
  document.addEventListener( 'keyup', onKeyUp, false );

  raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

  // floor
  geometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
  geometry.rotateX( - Math.PI / 2 );
  material = new THREE.MeshBasicMaterial({color: 0xeeeeee});
  mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor( 0xffffff );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );

  Loader.loadMesh('theater_chair', function(mesh) {
    var scale = 0.6;
    for (var j=0; j < 50; j++) {
      for (var i=0; i < 200; i++) {
        var mesh_ = mesh.clone();
        mesh_.position.set(i * 10 * scale, (j+1)*5 * scale,j*10 * scale);
        mesh_.scale.set(scale, scale, scale);
        objects.push(mesh_);
        scene.add(mesh_);
      }
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

var rays = [
  new THREE.Vector3( 0, 0, -1), // front
  new THREE.Vector3( 1, 0, -1), // front-right
  new THREE.Vector3(-1, 0, -1), // front-left
  new THREE.Vector3( 0, 0,  1), // back
  new THREE.Vector3( 1, 0,  1), // back-right
  new THREE.Vector3(-1, 0,  1), // back-left
  new THREE.Vector3( 1, 0,  0), // right
  new THREE.Vector3(-1, 0,  0)  // left
];

function animate() {
  requestAnimationFrame( animate );

  if ( controlsEnabled ) {
    raycaster.ray.origin.copy( controls.getObject().position );
    raycaster.ray.origin.y -= 10; // this checks collision below

    var intersections = raycaster.intersectObjects( objects );

    var isOnObject = intersections.length > 0;

    var time = performance.now();
    var delta = ( time - prevTime ) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    if ( moveForward ) velocity.z -= 400.0 * delta;
    if ( moveBackward ) velocity.z += 400.0 * delta;

    if ( moveLeft ) velocity.x -= 400.0 * delta;
    if ( moveRight ) velocity.x += 400.0 * delta;

    // check collisions
    var distance = 10;
    for (var i = 0; i < rays.length; i += 1) {
      raycaster.set(controls.getObject().position,
        rays[i].clone().applyQuaternion(controls.getObject().quaternion));
      var collisions = raycaster.intersectObjects(objects);
      if (collisions.length > 0 && collisions[0].distance <= distance) {
        // front
        if ((i <= 2) && velocity.z < 0) {
          velocity.z = 0;

        // back
        } else if ((i <= 5) && velocity.z > 0) {
          velocity.z = 0;
        }

        // right
        if ((i === 1 || i === 4 || i === 6) && velocity.x > 0) {
          velocity.x = 0;

        // left
        } else if ((i === 2 || i === 5 || i === 7) && velocity.x < 0) {
          velocity.x = 0;
        }
      }
    }
    if ( isOnObject === true ) {
      velocity.y = Math.max( 0, velocity.y );
      canJump = true;
    }

    controls.getObject().translateX( velocity.x * delta );
    controls.getObject().translateY( velocity.y * delta );
    controls.getObject().translateZ( velocity.z * delta );

    if ( controls.getObject().position.y < 10 ) {
      velocity.y = 0;
      controls.getObject().position.y = 10;
      canJump = true;
    }
    prevTime = time;
  }

  renderer.render( scene, camera );

}