import { AmbientLight, DirectionalLight, Group, OrthographicCamera, Vector3 } from "three";

export class Lights extends Group {
  private readonly ambientLight: AmbientLight;
  private readonly directionalLight: DirectionalLight;

  constructor() {
    super();

    this.ambientLight = new AmbientLight(0xffffff, 0.1);
    this.directionalLight = new DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(0, 15, -8);
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
    this.directionalLight.shadow.camera = new OrthographicCamera(
      -scaleFactor / 2,
      scaleFactor / 2,
      scaleFactor / 2,
      -scaleFactor / 2,
      0.1,
      scaleFactor * 2,
    );
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.castShadow = true;

    this.add(this.ambientLight);
    this.add(this.directionalLight);
  }
}
