

  IMMLScene,








} from "mml-web";














    camera: PerspectiveCamera,















      addCollider: () => {},
      updateCollider: () => {},
      removeCollider: () => {},






























    setGlobalMScene(this.mmlScene as IMMLScene);

    this.clickTrigger = MMLClickTrigger.init(
      document,
      this.elementsHolder,
      this.mmlScene as IMMLScene,
    );



