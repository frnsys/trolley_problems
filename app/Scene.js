import _ from 'underscore';
import * as THREE from 'three';
import PointerLockControls from './PointerLock';

// these rays are relative to the WORLD
const RAYS = [
  new THREE.Vector3( 0,  0, -1), // back
  new THREE.Vector3( 1,  0, -1), // back-left
  new THREE.Vector3(-1,  0, -1), // back-right
  new THREE.Vector3( 0,  0,  1), // forward
  new THREE.Vector3( 1,  0,  1), // forward-left
  new THREE.Vector3(-1,  0,  1), // forward-right
  new THREE.Vector3( 1,  0,  0), // left
  new THREE.Vector3(-1,  0,  0), // right
  new THREE.Vector3( 0, -1,  0), // bottom
];

var overlay = document.getElementById('overlay');
var instructions = document.getElementById('instructions');

// var lightColor = 0xeeeeff;
var lightColor = 0x000000;
// var fogColor = 0xffffff;
var fogColor = 0x000000;
// var skyColor = 0xffffff;
var skyColor = 0x000000;
var groundColor = 0x151206;
var fogDistance = 200;

class Scene {
  constructor() {
    this.height = 10;
    this.collidable = [];
    this.collisionDistance = 15;
    this.moving = {
      forward: false,
      backward: false,
      right: false,
      left: false
    };
    this.canJump = true;

    this.prevTime = performance.now();
    this.velocity = new THREE.Vector3();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(fogColor, 0, fogDistance);
    var light = new THREE.HemisphereLight(lightColor, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    this.scene.add(light);

    this.controls = new THREE.PointerLockControls(this.camera);
    this.scene.add(this.controls.getObject());
    this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, this.height);

    // setup floor
    var geometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    geometry.rotateX(-Math.PI/2);
    var material = new THREE.MeshLambertMaterial({color: groundColor});
    var mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(skyColor);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);

    this.setupPointerLock();
  }

  onKeyDown(ev) {
    switch (ev.keyCode) {
      case 38: // up
      case 87: // w
        this.moving.forward = true;
        break;

      case 37: // left
      case 65: // a
        this.moving.left = true;
        break;

      case 40: // down
      case 83: // s
        this.moving.backward = true;
        break;

      case 39: // right
      case 68: // d
        this.moving.right = true;
        break;

      case 32: // space
        if (this.canJump === true) this.velocity.y += 350;
        break;
    }
  }

  onKeyUp(ev) {
    switch(ev.keyCode) {
      case 38: // up
      case 87: // w
        this.moving.forward = false;
        break;

      case 37: // left
      case 65: // a
        this.moving.left = false;
        break;

      case 40: // down
      case 83: // s
        this.moving.backward = false;
        break;

      case 39: // right
      case 68: // d
        this.moving.right = false;
        break;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth/window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupPointerLock() {
    var hasPointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    var element = document.body;
    if (hasPointerLock) {
      instructions.addEventListener('click', function (event) {
        instructions.style.display = 'none';

        // ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

        if (/Firefox/i.test(navigator.userAgent)) {
          var onFullScreenChange = function (event) {
            if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
              document.removeEventListener('onFullScreenChange', onFullScreenChange);
              document.removeEventListener('mozonFullScreenChange', onFullScreenChange);
              element.requestPointerLock();
            }
          };

          document.addEventListener('onFullScreenChange', onFullScreenChange, false);
          document.addEventListener('mozonFullScreenChange', onFullScreenChange, false);
          element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
          element.requestFullscreen();
        } else {
          element.requestPointerLock();
        }
      }, false);

      document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
      document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this), false);
      document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this), false);

      document.addEventListener('pointerlockerror', this.onPointerLockError, false);
      document.addEventListener('mozpointerlockerror', this.onPointerLockError, false);
      document.addEventListener('webkitpointerlockerror', this.onPointerLockError, false);
    } else {
      instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
    }
  }

  onPointerLockError(ev) {
    alert('');
  }

  onPointerLockChange(ev) {
    var element = document.body;
    if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
      this.controls.enabled = true;
      overlay.style.display = 'none';

    } else {
      this.controls.enabled = false;
      overlay.style.display = 'block';
      instructions.style.display = '';
    }
  }

  render() {
    requestAnimationFrame(this.render.bind(this));
    if (this.controls.enabled) {
      var time = performance.now();
      var delta = (time - this.prevTime)/1000;

      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;
      this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

      if (this.moving.forward) this.velocity.z -= 400.0 * delta;
      if (this.moving.backward) this.velocity.z += 400.0 * delta;
      if (this.moving.left) this.velocity.x -= 400.0 * delta;
      if (this.moving.right) this.velocity.x += 400.0 * delta;

      this.detectCollisions();

      this.controls.getObject().translateX(this.velocity.x * delta);
      this.controls.getObject().translateY(this.velocity.y * delta);
      this.controls.getObject().translateZ(this.velocity.z * delta);

      if (this.controls.getObject().position.y < this.height) {
        this.velocity.y = 0;
        this.controls.getObject().position.y = this.height;
      }
      this.prevTime = time;
    }

    this.renderer.render(this.scene, this.camera);
  }

  detectCollisions() {
    var quaternion = this.controls.getObject().quaternion,
        adjVel = this.velocity.clone();
    adjVel.z *= -1;

    var pos = this.controls.getObject().position.clone();

    // we detect collisions about halfway up the player's height
    // if an object is positioned below or above this height (and is too small to cross it)
    // it will NOT be collided with
    pos.y -= this.height/2;

    var worldVelocity = adjVel.applyQuaternion(quaternion.clone().inverse());
    _.each(RAYS, (ray, i) => {
      this.raycaster.set(pos, ray);
      var collisions = this.raycaster.intersectObjects(this.collidable);
      if (collisions.length > 0 && collisions[0].distance <= this.collisionDistance) {
        switch (i) {
          case 0:
            // console.log('object in true back');
            if (worldVelocity.z > 0) worldVelocity.z = 0;
            break;
          case 1:
            // console.log('object in true back-left');
            if (worldVelocity.z > 0) worldVelocity.z = 0;
            if (worldVelocity.x > 0) worldVelocity.x = 0;
            break;
          case 2:
            // console.log('object in true back-right');
            if (worldVelocity.z > 0) worldVelocity.z = 0;
            if (worldVelocity.x < 0) worldVelocity.x = 0;
            break;
          case 3:
            // console.log('object in true front');
            if (worldVelocity.z < 0) worldVelocity.z = 0;
            break;
          case 4:
            // console.log('object in true front-left');
            if (worldVelocity.z < 0) worldVelocity.z = 0;
            if (worldVelocity.x > 0) worldVelocity.x = 0;
            break;
          case 5:
            // console.log('object in true front-right');
            if (worldVelocity.z < 0) worldVelocity.z = 0;
            if (worldVelocity.x < 0) worldVelocity.x = 0;
            break;
          case 6:
            // console.log('object in true left');
            if (worldVelocity.x > 0) worldVelocity.x = 0;
            break;
          case 7:
            // console.log('object in true right');
            if (worldVelocity.x < 0) worldVelocity.x = 0;
            break;
          case 8:
            // console.log('object in true bottom');
            if (worldVelocity.y < 0) worldVelocity.y = 0;
            break;
        }
      }
    });
    this.velocity = worldVelocity.applyQuaternion(quaternion);
    this.velocity.z *= -1;
  }
}

export default Scene;