import { AnimationClip, LoadingManager, Object3D } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ModelLoader {
  private debug: boolean = false;
  private loadingManager: LoadingManager;
  private fbxLoader: FBXLoader;
  private gltfLoader: GLTFLoader;

  constructor() {
    this.loadingManager = new LoadingManager();
    this.fbxLoader = new FBXLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
  }

  async load(
    fileUrl: string,
    fileType: "model" | "animation",
  ): Promise<Object3D | AnimationClip | undefined> {
    const extension = fileUrl.split(".").pop();
    if (typeof extension === "undefined") {
      console.error(`Unable to identify model type from ${fileUrl}`);
      return;
    }
    const name = fileUrl.split("/").pop()!.replace(`.${extension!}`, "");
    if (this.debug === true) {
      console.log(`Loading ${extension} model ${name} from ${fileUrl}`);
    }
    if (["gltf", "glb"].includes(extension)) {
      return new Promise((resolve, reject) => {
        this.gltfLoader.load(
          fileUrl,
          (object: GLTF) => {
            if (fileType === "model") {
              resolve(object.scene as Object3D);
            } else if (fileType === "animation") {
              resolve(object.animations[0] as AnimationClip);
            } else {
              const error = `Trying to load unknown ${fileType} type of element from file ${fileUrl}`;
              console.error(error);
              reject(error);
            }
          },
          undefined,
          (error) => {
            console.error(`Error loading GL(B|TF) from ${fileUrl}: ${error}`);
            reject(error);
          },
        );
      });
    } else if (extension === "fbx") {
      return new Promise((resolve, reject) => {
        this.fbxLoader.load(
          fileUrl,
          (object: Object3D) => {
            resolve(object as Object3D);
          },
          undefined,
          (error) => {
            console.error(`Error loading FBX from ${fileUrl}: ${error}`);
            reject(error);
          },
        );
      });
    }
  }
}
