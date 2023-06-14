import { AmbientLight, DirectionalLight, Group, OrthographicCamera, Vector3 } from "three";

export class Lights {
  private onLoadCallback: (subgroup: Group) => void;
  private ambientLight: AmbientLight;
  private directionalLight: DirectionalLight;

  public group: Group = new Group();

  constructor(onLoadCallback: (subgroup: Group) => void) {
    this.onLoadCallback = onLoadCallback;

    this.ambientLight = new AmbientLight(0xffffff, 0.1);
    this.directionalLight = new DirectionalLight(0xffffff, 1.1);
    this.directionalLight.position.set(0, 15, -6);
    this.directionalLight.updateMatrixWorld();

    const direction = new Vector3();
    direction
      .subVectors(this.directionalLight.position, this.directionalLight.target.position)
      .normalize();
    const scaleFactor = 120;
    direction.multiplyScalar(scaleFactor);
    const center = new Vector3(0, 0, 0);
    const newCameraPosition = new Vector3().addVectors(center, direction);

    this.directionalLight.position.copy(newCameraPosition);
    const shadowCamera = new OrthographicCamera(
      -scaleFactor / 2,
      scaleFactor / 2,
      scaleFactor / 2,
      -scaleFactor / 2,
      0.1,
      scaleFactor * 2,
    );
    this.directionalLight.shadow.camera = shadowCamera;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.castShadow = true;

    this.group.add(this.ambientLight);
    this.group.add(this.directionalLight);
    this.onLoadCallback(this.group);
  }
}
