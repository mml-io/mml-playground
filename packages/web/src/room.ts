
  CircleGeometry,



  MathUtils,

  MeshPhongMaterial,
  NearestFilter,
  PMREMGenerator,

  Scene,



  WebGLRenderTarget,
  WebGLRenderer,

import { Sky } from "three/examples/jsm/objects/Sky.js";



  private floorSize = 200;
  private floorTexture: Texture | null = null;
  private floorGeometry = new CircleGeometry(this.floorSize, 32);
  private floorMaterial: MeshPhongMaterial | null = null;
  private floorMesh: Mesh | null = null;

  private sky: Sky | null = null;
  private skyParameters = {
    elevation: 45,
    azimuth: 180,

  private sunPosition = new Vector3();
  private pmremGenerator: PMREMGenerator | null = null;
  private skyRenderTarget: WebGLRenderTarget | null = null;

  public group: Group = new Group();

  constructor(scene: Scene, renderer: WebGLRenderer, onLoadCallback: (room: Group) => void) {

    this.floorTexture = new TextureLoader(new LoadingManager()).load(
      "/assets/textures/checker.png",
      () => {
        this.floorTexture!.wrapS = RepeatWrapping;
        this.floorTexture!.wrapT = RepeatWrapping;
        this.floorTexture!.magFilter = NearestFilter;
        this.floorTexture!.repeat.set(this.floorSize / 1.5, this.floorSize / 1.5);
        this.floorMaterial = new MeshPhongMaterial({
          color: 0xffffff,
          side: FrontSide,
          map: this.floorTexture,

        this.floorMesh = new Mesh(this.floorGeometry, this.floorMaterial);
        this.floorMesh.receiveShadow = true;
        this.floorMesh.rotation.x = Math.PI * -0.5;
        this.floorMesh.position.y = 0.01;

        this.sky = new Sky();
        this.sky.scale.setScalar(10000);
        this.pmremGenerator = new PMREMGenerator(renderer);
        const phi = MathUtils.degToRad(90 - this.skyParameters.elevation);
        const theta = MathUtils.degToRad(this.skyParameters.azimuth);
        this.sunPosition.setFromSphericalCoords(1, phi, theta);
        this.sky.material.uniforms.sunPosition.value.copy(this.sunPosition);
        this.sky.material.uniforms.turbidity.value = 10;
        this.sky.material.uniforms.rayleigh.value = 2;
        this.sky.material.uniforms.mieCoefficient.value = 0.005;
        this.sky.material.uniforms.mieDirectionalG.value = 0.8;
        if (this.skyRenderTarget !== null) this.skyRenderTarget.dispose();
        this.skyRenderTarget = this.pmremGenerator.fromScene(this.sky as unknown as Scene);
        scene.environment = this.skyRenderTarget.texture;

        this.group.add(this.floorMesh);
        this.group.add(this.sky);
        this.onLoadCallback(this.group);




