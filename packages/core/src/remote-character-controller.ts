import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoadingManager,
  Object3D,
  Quaternion,
  Vector2,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";




















































        (error) => console.error(`Error loading ${animationFile}: ${error}`),










        (error) => console.error(`Error loading ${animationFile}: ${error}`),














      targetAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(transitionDuration)
        .play();



























