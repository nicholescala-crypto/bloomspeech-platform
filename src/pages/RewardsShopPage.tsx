import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
};

type RewardProgress = {
  badges: Badge[];
  totalStars: number;
  unlockedItems?: string[];
  selectedRocket?: string;
  selectedBackground?: string;
  selectedAvatar?: string;
};

type ChildProfile = {
  id: string;
  name: string;
  createdAt: string;
};

type ShopItem = {
  id: string;
  name: string;
  emoji: string;
  type: "rocket" | "background" | "avatar";
  cost: number;
};

const CHILDREN_KEY = "bloom-child-profiles-v1";

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

function getRewardKey(childId: string) {
  return `bloom-rewards-${childId}`;
}

function loadChildren(): ChildProfile[] {
  return safeParse<ChildProfile[]>(CHILDREN_KEY, [
    { id: "child-1", name: "Child 1", createdAt: new Date().toLocaleString() },
  ]);
}

function loadRewards(childId: string): RewardProgress {
  return safeParse<RewardProgress>(getRewardKey(childId), {
    badges: [],
    totalStars: 0,
    unlockedItems: [],
    selectedRocket: "rocket-red",
    selectedBackground: "bg-moon",
    selectedAvatar: "avatar-cat",
  });
}

export default function RewardsShopPage() {
  const navigate = useNavigate();
  const children = useMemo(() => loadChildren(), []);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");
  const [message, setMessage] = useState("");

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];
  const [rewards, setRewards] = useState<RewardProgress>(() =>
    selectedChild ? loadRewards(selectedChild.id) : { badges: [], totalStars: 0, unlockedItems: [] },
  );

  function switchChild(childId: string) {
    setSelectedChildId(childId);
    setRewards(loadRewards(childId));
    setMessage("");
  }

  function save(nextRewards: RewardProgress) {
    if (!selectedChild) return;
    setRewards(nextRewards);
    localStorage.setItem(getRewardKey(selectedChild.id), JSON.stringify(nextRewards));
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
  <button onClick={() => navigate("/parent")} style={navButton}>
    Parent Dashboard
  </button>

  <button onClick={() => navigate("/clinician")} style={navButton}>
    Clinician Dashboard
  </button>

  <button onClick={() => navigate("/play")} style={navButton}>
    Play Game
  </button>
</div>

        <button onClick={() => navigate("/parent")} style={smallButton}>
          Back to Parent Dashboard
        </button>

        <h2>Choose Child</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => switchChild(child.id)}
              style={{
                ...childButton,
                border:
                  selectedChildId === child.id
                    ? "3px solid #2563eb"
                    : "1px solid #d1d5db",
              }}
            >
              {child.name}
            </button>
          ))}
        </div>

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

        <h2>Badges</h2>
        {rewards.badges.length === 0 ? (
          <p>No badges yet.</p>
        ) : (
          <div style={gridStyle}>
            {rewards.badges.map((badge) => (
              <div key={badge.id} style={cardStyle}>
                <div style={{ fontSize: 42 }}>{badge.emoji}</div>
                <strong>{badge.name}</strong>
                <p>{badge.description}</p>
              </div>
            ))}
          </div>
        )}
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

const childButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "white",
  cursor: "pointer",
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