import { useEffect, useRef } from "react";
import Phaser from "phaser";

type Item = {
  key: string;
  sound: string;
};

type Card = {
  frame: Phaser.GameObjects.Rectangle;
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  item: Item | null;
};

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const items: Item[] = [
      { key: "sun", sound: "sunSound" },
      { key: "ball", sound: "ballSound" },
      { key: "cat", sound: "catSound" },
      { key: "dog", sound: "dogSound" },
    ];

    let currentChoices: Item[] = [];
    let currentTarget: Item | null = null;
    let score = 0;
    let round = 1;
    const totalRounds = 5;
    let locked = false;

    let promptText!: Phaser.GameObjects.Text;
    let feedbackText!: Phaser.GameObjects.Text;
    let scoreText!: Phaser.GameObjects.Text;

    const cards: Card[] = [];

    function preload(this: Phaser.Scene) {
      this.load.image("sun", "/Images/sun.png");
      this.load.image("ball", "/Images/ball.png");
      this.load.image("cat", "/Images/cat.png");
      this.load.image("dog", "/Images/dog.png");

      this.load.audio("sunSound", "/audio/sun.mp3");
      this.load.audio("ballSound", "/audio/ball.mp3");
      this.load.audio("catSound", "/audio/cat.mp3");
      this.load.audio("dogSound", "/audio/dog.mp3");
    }

    function create(this: Phaser.Scene) {
      this.cameras.main.setBackgroundColor("#eef7ff");

      this.add
        .text(400, 25, "Speech Sound Practice", {
          fontSize: "28px",
          color: "#1f2937",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      promptText = this.add
        .text(400, 65, "", {
          fontSize: "24px",
          color: "#111827",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      feedbackText = this.add
        .text(400, 100, "", {
          fontSize: "20px",
          color: "#16a34a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      scoreText = this.add
        .text(400, 130, "Score: 0", {
          fontSize: "20px",
          color: "#2563eb",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const positions = [
        { x: 220, y: 280 },
        { x: 580, y: 280 },
        { x: 220, y: 470 },
        { x: 580, y: 470 },
      ];

      positions.forEach((pos) => {
        const frame = this.add
          .rectangle(pos.x, pos.y, 170, 170, 0xffffff)
          .setStrokeStyle(4, 0x94a3b8);

        const image = this.add
          .image(pos.x, pos.y, "sun")
          .setDisplaySize(120, 120);

        cards.push({
          frame,
          image,
          x: pos.x,
          y: pos.y,
          item: null,
        });
      });

      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        const px = pointer.x;
        const py = pointer.y;

        for (const card of cards) {
          if (
            px >= card.x - 85 &&
            px <= card.x + 85 &&
            py >= card.y - 85 &&
            py <= card.y + 85
          ) {
            handleCardClick(this, card);
            return;
          }
        }
      });

      startRound(this);
    }

    function startRound(scene: Phaser.Scene) {
      locked = false;
      feedbackText.setText("");

      currentChoices = Phaser.Utils.Array.Shuffle([...items]).slice(0, 4);
      currentTarget = Phaser.Utils.Array.GetRandom(currentChoices);

      if (!currentTarget) return;

      promptText.setText(`Round ${round}/${totalRounds} - Find ${currentTarget.key}`);
      scene.sound.play(currentTarget.sound);

      currentChoices.forEach((item, i) => {
        const card = cards[i];
        card.item = item;
        card.frame.setStrokeStyle(4, 0x94a3b8);
        card.image.setTexture(item.key);
        card.image.setDisplaySize(120, 120);
        card.image.setPosition(card.x, card.y);
        card.image.setAngle(0);
      });
    }

    function handleCardClick(scene: Phaser.Scene, card: Card) {
      if (locked || !currentTarget || !card.item) return;

      scene.sound.play(card.item.sound);

      if (card.item.key === currentTarget.key) {
        locked = true;
        score += 1;
        scoreText.setText(`Score: ${score}`);
        feedbackText.setColor("#16a34a");
        feedbackText.setText(`Correct! Say: ${currentTarget.key}`);
        card.frame.setStrokeStyle(6, 0x22c55e);

        scene.tweens.add({
          targets: card.image,
          displayWidth: 130,
          displayHeight: 130,
          duration: 120,
          yoyo: true,
          onComplete: () => {
            card.image.setDisplaySize(120, 120);
          },
        });

        scene.time.delayedCall(1000, () => {
          round += 1;

          if (round > totalRounds) {
            promptText.setText("Session complete!");
            feedbackText.setText(`Final score: ${score}`);
            locked = true;
            return;
          }

          startRound(scene);
        });
      } else {
        feedbackText.setColor("#dc2626");
        feedbackText.setText(`Try again. Find ${currentTarget.key}.`);
        card.frame.setStrokeStyle(6, 0xef4444);

        scene.tweens.add({
          targets: card.image,
          x: card.x + 6,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            card.image.setPosition(card.x, card.y);
          },
        });
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 620,
      parent: "game-container",
      backgroundColor: "#eef7ff",
      scene: {
        preload,
        create,
      },
      scale: {
        mode: Phaser.Scale.NONE,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      id="game-container"
      style={{
        width: "800px",
        height: "620px",
        margin: "0 auto",
        overflow: "hidden",
        border: "2px solid #cbd5e1",
        background: "#eef7ff",
      }}
    />
  );
}