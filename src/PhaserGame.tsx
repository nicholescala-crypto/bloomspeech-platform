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
  mode?: "word" | "sentence";
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

export default function PhaserGame({ words, onComplete, mode = "word" }: Props) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [equipped] = useState(() => readEquipped());

  const bgColor = (equipped.background && BG_COLORS[equipped.background]) ?? "#eef7ff";
  const rocketEmoji = equipped.rocket ? ROCKET_EMOJIS[equipped.rocket] : null;
  const avatarEmoji = equipped.avatar ? AVATAR_EMOJIS[equipped.avatar] : null;

  useEffect(() => {
    if (mode === "sentence") return;
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
        this.load.audio(item.sound, [
          `/audio/${item.key}.mp3`,
          `/audio/${item.key}.m4a`,
        ]);
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
  }, [words, onComplete, bgColor, rocketEmoji, avatarEmoji, mode]);

  if (mode === "sentence") {
    return (
      <SentenceFlashcard
        sentences={words}
        onComplete={onComplete}
        bgColor={bgColor}
        avatarEmoji={avatarEmoji}
        rocketEmoji={rocketEmoji}
      />
    );
  }

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

function SentenceFlashcard({
  sentences,
  onComplete,
  bgColor,
  avatarEmoji,
  rocketEmoji,
}: {
  sentences: string[];
  onComplete?: (stars: number) => void;
  bgColor: string;
  avatarEmoji: string | null;
  rocketEmoji: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [showRocket, setShowRocket] = useState(false);

  function handleNext() {
    if (rocketEmoji) {
      setShowRocket(true);
      setTimeout(() => setShowRocket(false), 700);
    }

    if (current + 1 >= sentences.length) {
      setDone(true);
      setTimeout(() => onComplete?.(sentences.length), 1000);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <div
      style={{
        width: "800px",
        height: "620px",
        margin: "0 auto",
        background: bgColor,
        border: "2px solid #cbd5e1",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {showRocket && rocketEmoji && (
        <div
          style={{
            position: "absolute",
            top: "42%",
            right: 24,
            fontSize: 52,
            pointerEvents: "none",
          }}
        >
          {rocketEmoji}
        </div>
      )}

      <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        {done ? "" : `Sentence ${current + 1} of ${sentences.length}`}
      </div>

      <div style={{ color: "#374151", fontSize: 22, fontWeight: 600, marginBottom: 32 }}>
        {done ? "Great job! All done! 🎉" : "Say this sentence:"}
      </div>

      {!done && (
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: "32px 40px",
            fontSize: 26,
            fontWeight: 700,
            color: "#163b3f",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxWidth: 580,
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          {sentences[current]}
        </div>
      )}

      {!done && (
        <button
          onClick={handleNext}
          style={{
            padding: "16px 48px",
            borderRadius: 16,
            border: "none",
            background: "#163b3f",
            color: "white",
            fontSize: 20,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Got it! ✓
        </button>
      )}

      {avatarEmoji && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            fontSize: 44,
          }}
        >
          {avatarEmoji}
        </div>
      )}
    </div>
  );
}
