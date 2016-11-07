import $ from 'jquery';
import * as THREE from 'three';
import PointerLockControls from './PointerLock';

class Scene {
  constructor() {
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }
}

export default Scene;