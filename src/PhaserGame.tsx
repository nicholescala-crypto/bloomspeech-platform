import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

type Item = {
  key: string;
  sound: string;
};

type Card = {
  frame: Phaser.GameObjects.Rectangle;
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  item: Item | null;
};

type Props = {
  words: string[];
  onComplete?: (stars: number) => void;
};

const BG_COLORS: Record<string, string> = {
  "bg-moon": "#d6e8f5",
  "bg-mars": "#fdd5b5",
  "bg-galaxy": "#dfd4f5",
};

const ROCKET_EMOJIS: Record<string, string> = {
  "rocket-red": "🚀",
  "rocket-star": "🌟",
  "rocket-fire": "🔥",
};

const AVATAR_EMOJIS: Record<string, string> = {
  "avatar-cat": "🐱",
  "avatar-dog": "🐶",
  "avatar-star": "⭐",
};

function readEquipped() {
  try {
    const email = localStorage.getItem("currentParentEmail") || "guest";
    const saved = JSON.parse(localStorage.getItem(`bloom-rewards-${email}`) || "null") ?? {};
    return {
      rocket: saved.selectedRocket as string | undefined,
      background: saved.selectedBackground as string | undefined,
      avatar: saved.selectedAvatar as string | undefined,
    };
  } catch {
    return { rocket: undefined, background: undefined, avatar: undefined };
  }
}

export default function PhaserGame({ words, onComplete }: Props) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [equipped] = useState(() => readEquipped());

  const bgColor = (equipped.background && BG_COLORS[equipped.background]) ?? "#eef7ff";
  const rocketEmoji = equipped.rocket ? ROCKET_EMOJIS[equipped.rocket] : null;
  const avatarEmoji = equipped.avatar ? AVATAR_EMOJIS[equipped.avatar] : null;

  useEffect(() => {
    if (gameRef.current) return;

    const items: Item[] = words.map((word) => ({
      key: word.toLowerCase(),
      sound: word.toLowerCase() + "Sound",
    }));

    const cardCount = Math.min(items.length, 4);

    let currentChoices: Item[] = [];
    let currentTarget: Item | null = null;
    let score = 0;
    let round = 1;
    const totalRounds = Math.min(10, items.length * 2);
    let locked = false;

    let promptText!: Phaser.GameObjects.Text;
    let feedbackText!: Phaser.GameObjects.Text;
    let scoreText!: Phaser.GameObjects.Text;

    const cards: Card[] = [];

    function preload(this: Phaser.Scene) {
      items.forEach((item) => {
        this.load.image(item.key, `/Images/${item.key}.png`);
        this.load.audio(item.sound, `/audio/${item.key}.mp3`);
      });
    }

    function create(this: Phaser.Scene) {
      this.cameras.main.setBackgroundColor(bgColor);

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

      const allPositions = [
        { x: 220, y: 280 },
        { x: 580, y: 280 },
        { x: 220, y: 470 },
        { x: 580, y: 470 },
      ];

      const positions = allPositions.slice(0, cardCount);

      positions.forEach((pos) => {
        const frame = this.add
          .rectangle(pos.x, pos.y, 170, 170, 0xffffff)
          .setStrokeStyle(4, 0x94a3b8);

        const image = this.add
          .image(pos.x, pos.y - 15, items[0].key)
          .setDisplaySize(110, 110);

        const label = this.add
          .text(pos.x, pos.y + 65, "", {
            fontSize: "18px",
            color: "#1f2937",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        cards.push({ frame, image, label, x: pos.x, y: pos.y, item: null });
      });

      if (avatarEmoji) {
        this.add.text(16, 600, avatarEmoji, { fontSize: "44px" }).setOrigin(0, 1);
      }

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

      const shuffled = Phaser.Utils.Array.Shuffle([...items]);
      currentChoices = shuffled.slice(0, cardCount);
      currentTarget = Phaser.Utils.Array.GetRandom(currentChoices);

      if (!currentTarget) return;

      promptText.setText(
        `Round ${round}/${totalRounds} — Tap: "${currentTarget.key}"`
      );

      try {
        scene.sound.play(currentTarget.sound);
      } catch {
        // audio may not be available for all words
      }

      currentChoices.forEach((item, i) => {
        const card = cards[i];
        card.item = item;
        card.frame.setStrokeStyle(4, 0x94a3b8);
        card.image.setTexture(item.key);
        card.image.setDisplaySize(110, 110);
        card.image.setPosition(card.x, card.y - 15);
        card.image.setAngle(0);
        card.label.setText(item.key);
      });
    }

    function handleCardClick(scene: Phaser.Scene, card: Card) {
      if (locked || !currentTarget || !card.item) return;

      try {
        scene.sound.play(card.item.sound);
      } catch {
        // audio may not be available
      }

      if (card.item.key === currentTarget.key) {
        locked = true;
        score += 1;
        scoreText.setText(`Score: ${score}`);
        feedbackText.setColor("#16a34a");
        feedbackText.setText(`Correct! Say: "${currentTarget.key}"`);
        card.frame.setStrokeStyle(6, 0x22c55e);

        scene.tweens.add({
          targets: card.image,
          displayWidth: 130,
          displayHeight: 130,
          duration: 120,
          yoyo: true,
          onComplete: () => {
            card.image.setDisplaySize(110, 110);
          },
        });

        if (rocketEmoji) {
          const yPos = 260 + Math.random() * 120;
          const rocket = scene.add.text(-60, yPos, rocketEmoji, { fontSize: "52px" });
          scene.tweens.add({
            targets: rocket,
            x: 860,
            duration: 700,
            ease: "Power2",
            onComplete: () => rocket.destroy(),
          });
        }

        scene.time.delayedCall(1200, () => {
          round += 1;

          if (round > totalRounds) {
            promptText.setText("Great job! Session complete!");
            feedbackText.setText(`Final score: ${score}/${totalRounds}`);
            locked = true;
            if (onComplete) {
              scene.time.delayedCall(800, () => onComplete(score));
            }
            return;
          }

          startRound(scene);
        });
      } else {
        feedbackText.setColor("#dc2626");
        feedbackText.setText(`Try again! Find "${currentTarget.key}".`);
        card.frame.setStrokeStyle(6, 0xef4444);

        scene.tweens.add({
          targets: card.image,
          x: card.x + 6,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            card.image.setPosition(card.x, card.y - 15);
          },
        });
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 620,
      parent: "game-container",
      backgroundColor: bgColor,
      scene: { preload, create },
      scale: { mode: Phaser.Scale.NONE },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [words, onComplete, bgColor, rocketEmoji, avatarEmoji]);

  return (
    <div
      id="game-container"
      style={{
        width: "800px",
        height: "620px",
        margin: "0 auto",
        overflow: "hidden",
        border: "2px solid #cbd5e1",
        background: bgColor,
        borderRadius: 16,
      }}
    />
  );
}
