import PhaserGame from "../PhaserGame";

export default function Play() {
  return (
    <div>
      <h1>Play Page</h1>
      <p>Tap the sun!</p>

      {/* THIS LINE MAKES THE GAME ACTUALLY SHOW */}
      <PhaserGame />
    </div>
  );
}