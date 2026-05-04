import Phaser from 'phaser';

export default class SplashGame extends Phaser.Scene {
  constructor() {
    super('SplashGame');
  }

  preload() {
    this.load.image('sun', '/Images/sun.png');
  }

  create() {
    this.cameras.main.setBackgroundColor(0xeaf6ff);

    this.add.text(100, 60, 'Tap the image', {
      fontSize: '28px',
      color: 'black',
    });

    const sun = this.add.image(400, 250, 'sun').setDisplaySize(160, 160);

    sun.setInteractive({ useHandCursor: true });

    sun.on('pointerdown', () => {
      console.log('sun clicked');
    });
  }
}