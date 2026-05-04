import { useEffect, useRef } from "react";
import Phaser from "phaser";

export default function PhaserCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return;

    class MainScene extends Phaser.Scene {
      constructor() {
        super("MainScene");
      }

      preload() {
        this.load.image("sun", "images/sun.png");

        this.load.on("filecomplete-image-sun", () => {
          console.log("SUN LOADED");
        });

        this.load.on("loaderror", (file: any) => {
          console.log("LOAD ERROR:", file?.src);
        });
      }

      create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX - 100, 40, "Tap the Sun!", {
          fontSize: "32px",
          color: "#000000",
        });

        if (this.textures.exists("sun")) {
          const sun = this.add.image(centerX, centerY, "sun");
          sun.setDisplaySize(250, 250);
        } else {
          this.add.text(centerX - 120, centerY, "sun image failed to load", {
            fontSize: "24px",
            color: "#ff0000",
          });
        }
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: "#87ceeb",
      parent: containerRef.current,
      scene: MainScene,
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: 800, height: 600, margin: "0 auto" }} />;
}