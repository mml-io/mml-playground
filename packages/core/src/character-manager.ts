

























  spawnCharacter(
    characterDescription: CharacterDescription,
    id: number,
    group: Group,
    isLocal: boolean = false,
  ) {












          this.character.controller.setAnimationFromFile(
            "idle",
            characterDescription.idleAnimationFileUrl,
          );
          this.character.controller.setAnimationFromFile(
            "walk",
            characterDescription.jogAnimationFileUrl,
          );
          this.character.controller.setAnimationFromFile(
            "run",
            characterDescription.sprintAnimationFileUrl,
          );























    group: Group,
















































