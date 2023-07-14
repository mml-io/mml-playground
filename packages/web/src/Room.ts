import {
  CircleGeometry,
  FrontSide,
  Group,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  RepeatWrapping,
  Texture,
  TextureLoader,
} from "three";

export class Room extends Group {
  private readonly floorSize = 100;
  private readonly floorTexture: Texture | null = null;
  private readonly floorGeometry = new CircleGeometry(this.floorSize, 32);
  private readonly floorMaterial: MeshStandardMaterial;
  private readonly floorMesh: Mesh | null = null;

  constructor() {
    super();

    this.floorMaterial = new MeshStandardMaterial({
      color: 0xcccccc,
      side: FrontSide,
      metalness: 0.3,
      roughness: 0.3,
    });
    this.floorMesh = new Mesh(this.floorGeometry, this.floorMaterial);
    this.floorMesh.receiveShadow = true;
    this.floorMesh.rotation.x = Math.PI * -0.5;
    this.floorMesh.position.y = 0.01;
    this.add(this.floorMesh);

    this.floorTexture = new TextureLoader(new LoadingManager()).load(
      "/assets/textures/checker.png",
      () => {
        this.floorTexture!.wrapS = RepeatWrapping;
        this.floorTexture!.wrapT = RepeatWrapping;
        this.floorTexture!.magFilter = NearestFilter;
        this.floorTexture!.repeat.set(this.floorSize / 1.5, this.floorSize / 1.5);
        this.floorMaterial.map = this.floorTexture;
      },
    );
  }
}
