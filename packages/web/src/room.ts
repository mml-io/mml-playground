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

export class Room {
  private onLoadCallback: (group: Group) => void;

  private floorSize = 100;
  private floorTexture: Texture | null = null;
  private floorGeometry = new CircleGeometry(this.floorSize, 32);
  private floorMaterial: MeshStandardMaterial | null = null;
  private floorMesh: Mesh | null = null;

  public group: Group = new Group();

  constructor(onLoadCallback: (group: Group) => void) {
    this.onLoadCallback = onLoadCallback;

    this.floorTexture = new TextureLoader(new LoadingManager()).load(
      "/assets/textures/checker.png",
      () => {
        this.floorTexture!.wrapS = RepeatWrapping;
        this.floorTexture!.wrapT = RepeatWrapping;
        this.floorTexture!.magFilter = NearestFilter;
        this.floorTexture!.repeat.set(this.floorSize / 1.5, this.floorSize / 1.5);
        this.floorMaterial = new MeshStandardMaterial({
          color: 0xcccccc,
          side: FrontSide,
          map: this.floorTexture,
          metalness: 0.3,
          roughness: 0.3,
        });
        this.floorMesh = new Mesh(this.floorGeometry, this.floorMaterial);
        this.floorMesh.receiveShadow = true;
        this.floorMesh.rotation.x = Math.PI * -0.5;
        this.floorMesh.position.y = 0.01;

        this.group.add(this.floorMesh);
        this.onLoadCallback(this.group);
      },
    );
  }
}
