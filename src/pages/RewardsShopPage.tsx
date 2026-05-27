import { useState } from "react";

type RewardProgress = {
  totalStars: number;
  unlockedItems?: string[];
  selectedRocket?: string;
  selectedBackground?: string;
  selectedAvatar?: string;
};

type ShopItem = {
  id: string;
  name: string;
  emoji: string;
  type: "rocket" | "background" | "avatar";
  cost: number;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: "rocket-red", name: "Red Rocket", emoji: "🚀", type: "rocket", cost: 5 },
  { id: "rocket-star", name: "Star Rocket", emoji: "🌟", type: "rocket", cost: 10 },
  { id: "rocket-fire", name: "Fire Rocket", emoji: "🔥", type: "rocket", cost: 15 },

  { id: "bg-moon", name: "Moon Base", emoji: "🌙", type: "background", cost: 5 },
  { id: "bg-mars", name: "Mars World", emoji: "🪐", type: "background", cost: 10 },
  { id: "bg-galaxy", name: "Galaxy Sky", emoji: "🌌", type: "background", cost: 15 },

  { id: "avatar-cat", name: "Space Cat", emoji: "🐱", type: "avatar", cost: 5 },
  { id: "avatar-dog", name: "Space Dog", emoji: "🐶", type: "avatar", cost: 10 },
  { id: "avatar-star", name: "Star Buddy", emoji: "⭐", type: "avatar", cost: 15 },
];

function safeParse<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function getRewardKey(): string {
  const email = localStorage.getItem("currentParentEmail") || "guest";
  return `bloom-rewards-${email}`;
}

function loadRewards(): RewardProgress {
  return safeParse<RewardProgress>(getRewardKey(), {
    totalStars: 0,
    unlockedItems: [],
    selectedRocket: undefined,
    selectedBackground: undefined,
    selectedAvatar: undefined,
  });
}

export default function RewardsShopPage() {
  const [message, setMessage] = useState("");
  const [rewards, setRewards] = useState<RewardProgress>(() => loadRewards());

  function save(nextRewards: RewardProgress) {
    setRewards(nextRewards);
    localStorage.setItem(getRewardKey(), JSON.stringify(nextRewards));
  }

  function buyItem(item: ShopItem) {
    const unlocked = rewards.unlockedItems ?? [];

    if (unlocked.includes(item.id)) {
      setMessage(`${item.name} is already unlocked.`);
      return;
    }

    if (rewards.totalStars < item.cost) {
      setMessage(`Not enough stars for ${item.name}.`);
      return;
    }

    const nextRewards: RewardProgress = {
      ...rewards,
      totalStars: rewards.totalStars - item.cost,
      unlockedItems: [...unlocked, item.id],
    };

    save(nextRewards);
    setMessage(`Unlocked ${item.emoji} ${item.name}!`);
  }

  function equipItem(item: ShopItem) {
    const unlocked = rewards.unlockedItems ?? [];

    if (!unlocked.includes(item.id)) {
      setMessage("Unlock this reward first.");
      return;
    }

    const nextRewards: RewardProgress = {
      ...rewards,
      selectedRocket: item.type === "rocket" ? item.id : rewards.selectedRocket,
      selectedBackground:
        item.type === "background" ? item.id : rewards.selectedBackground,
      selectedAvatar: item.type === "avatar" ? item.id : rewards.selectedAvatar,
    };

    save(nextRewards);
    setMessage(`Equipped ${item.emoji} ${item.name}!`);
  }

  function isEquipped(item: ShopItem) {
    if (item.type === "rocket") return rewards.selectedRocket === item.id;
    if (item.type === "background") return rewards.selectedBackground === item.id;
    return rewards.selectedAvatar === item.id;
  }

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <h1>🏪 Reward Shop</h1>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
  <button onClick={() => window.location.href = "/parent"} style={navButton}>
    Parent Dashboard
  </button>

  <button onClick={() => window.location.href = "/clinician"} style={navButton}>
    Clinician Dashboard
  </button>

  <button onClick={() => window.location.href = "/parent"} style={navButton}>
    Play Game
  </button>
</div>

        <button onClick={() => { window.location.href = "/parent"; }} style={smallButton}>
          Back to Parent Dashboard
        </button>

        <div style={starsBox}>
          <div style={{ fontSize: 18 }}>Stars Available</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>⭐ {rewards.totalStars}</div>
        </div>

        {message && <div style={messageStyle}>{message}</div>}

        <h2>Rockets</h2>
        <ShopGrid
          items={SHOP_ITEMS.filter((item) => item.type === "rocket")}
          rewards={rewards}
          buyItem={buyItem}
          equipItem={equipItem}
          isEquipped={isEquipped}
        />

        <h2>Backgrounds</h2>
        <ShopGrid
          items={SHOP_ITEMS.filter((item) => item.type === "background")}
          rewards={rewards}
          buyItem={buyItem}
          equipItem={equipItem}
          isEquipped={isEquipped}
        />

        <h2>Avatars</h2>
        <ShopGrid
          items={SHOP_ITEMS.filter((item) => item.type === "avatar")}
          rewards={rewards}
          buyItem={buyItem}
          equipItem={equipItem}
          isEquipped={isEquipped}
        />

      </div>
    </div>
  );
}

function ShopGrid({
  items,
  rewards,
  buyItem,
  equipItem,
  isEquipped,
}: {
  items: ShopItem[];
  rewards: RewardProgress;
  buyItem: (item: ShopItem) => void;
  equipItem: (item: ShopItem) => void;
  isEquipped: (item: ShopItem) => boolean;
}) {
  return (
    <div style={gridStyle}>
      {items.map((item) => {
        const unlocked = rewards.unlockedItems?.includes(item.id) ?? false;
        const equipped = isEquipped(item);

        return (
          <div key={item.id} style={cardStyle}>
            <div style={{ fontSize: 48 }}>{item.emoji}</div>
            <h3>{item.name}</h3>
            <p>Cost: ⭐ {item.cost}</p>

            {equipped ? (
              <div style={equippedStyle}>Equipped</div>
            ) : unlocked ? (
              <button onClick={() => equipItem(item)} style={equipButton}>
                Equip
              </button>
            ) : (
              <button onClick={() => buyItem(item)} style={buyButton}>
                Unlock
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#eef2ff",
  padding: 32,
};

const panelStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  background: "white",
  padding: 32,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 28,
};

const cardStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
};

const starsBox: React.CSSProperties = {
  margin: "24px 0",
  padding: 20,
  borderRadius: 18,
  background: "#fef3c7",
  border: "1px solid #facc15",
};

const buyButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const equipButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const equippedStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 800,
};

const smallButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  padding: 12,
  marginBottom: 20,
  borderRadius: 12,
  background: "#dbeafe",
  color: "#1e3a8a",
  fontWeight: 700,
};
const navButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#0f172a",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};