import { DirectionalLight, Group, OrthographicCamera, Vector3 } from "three";

export class Sun extends Group {
  private readonly sunOffset: Vector3 = new Vector3(50, 80, 35);
  private readonly shadowResolution: number = 16384;
  private readonly shadowCamFrustum: number = 150;

  private readonly shadowCamera: OrthographicCamera;
  private readonly directionalLight: DirectionalLight;

  public target: Vector3 | null = null;

  constructor() {
    super();
    this.shadowCamera = new OrthographicCamera(
      -this.shadowCamFrustum,
      this.shadowCamFrustum,
      this.shadowCamFrustum,
      -this.shadowCamFrustum,
      0.5,
      500,
    );
    this.directionalLight = new DirectionalLight(0xffffff, 1);
    this.directionalLight.shadow.camera = this.shadowCamera;
    this.directionalLight.shadow.mapSize.set(this.shadowResolution, this.shadowResolution);
    this.directionalLight.castShadow = true;

    this.updateCharacterPosition(new Vector3(0, 0, 0));

    this.add(this.directionalLight);
  }

  public updateCharacterPosition(position: Vector3 | undefined) {
    if (!position) return;
    const newSunPosition = position.clone().add(this.sunOffset);
    this.directionalLight.position.set(newSunPosition.x, newSunPosition.y, newSunPosition.z);
    this.directionalLight.target.position.copy(position.clone());
    this.directionalLight.target.updateMatrixWorld();
  }
}
