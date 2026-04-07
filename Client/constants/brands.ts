import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

export type IconFamily = "Ionicons" | "MaterialCommunityIcons" | "FontAwesome5";

export interface BrandVisuals {
  keywords: string[];
  iconFamily: IconFamily;
  iconName: string;
  color: string;
}

export const BRAND_DICTIONARY: BrandVisuals[] = [
  // --- ENTERTAINMENT ---
  { keywords: ["netflix"], iconFamily: "MaterialCommunityIcons", iconName: "netflix", color: "#E50914" },
  { keywords: ["spotify"], iconFamily: "MaterialCommunityIcons", iconName: "spotify", color: "#1DB954" },
  { keywords: ["youtube", "yt premium"], iconFamily: "MaterialCommunityIcons", iconName: "youtube", color: "#FF0000" },
  { keywords: ["disney", "hotstar"], iconFamily: "MaterialCommunityIcons", iconName: "disney", color: "#113CCF" },
  { keywords: ["prime", "amazon prime"], iconFamily: "FontAwesome5", iconName: "amazon", color: "#00A8E1" },
  { keywords: ["apple music", "apple one"], iconFamily: "MaterialCommunityIcons", iconName: "apple", color: "#FAFAFA" }, // Typically silver/black, use light gray/white for visibility
  { keywords: ["vidio"], iconFamily: "MaterialCommunityIcons", iconName: "television-play", color: "#E42A28" },
  { keywords: ["hbo", "hbo go"], iconFamily: "MaterialCommunityIcons", iconName: "television-classic", color: "#501CAE" },

  // --- PRODUCTIVITY & CLOUD ---
  { keywords: ["google one", "google drive"], iconFamily: "MaterialCommunityIcons", iconName: "google-drive", color: "#0F9D58" },
  { keywords: ["icloud", "apple icloud"], iconFamily: "MaterialCommunityIcons", iconName: "apple-icloud", color: "#007AFF" },
  { keywords: ["microsoft", "office 365", "m365"], iconFamily: "MaterialCommunityIcons", iconName: "microsoft-windows", color: "#00A4EF" },
  { keywords: ["canva"], iconFamily: "MaterialCommunityIcons", iconName: "draw-pen", color: "#00C4CC" },
  { keywords: ["zoom"], iconFamily: "MaterialCommunityIcons", iconName: "video", color: "#2D8CFF" },
  { keywords: ["notion"], iconFamily: "MaterialCommunityIcons", iconName: "cube-outline", color: "#1A1A1A" },
  { keywords: ["figma"], iconFamily: "FontAwesome5", iconName: "figma", color: "#F24E1E" },
  { keywords: ["adobe", "photoshop", "illustrator", "premiere"], iconFamily: "MaterialCommunityIcons", iconName: "adobe", color: "#FF0000" },

  // --- UTILITIES (TAGIHAN) ---
  { keywords: ["pln", "listrik", "token"], iconFamily: "MaterialCommunityIcons", iconName: "lightning-bolt", color: "#F2C94C" },
  { keywords: ["pdam", "air"], iconFamily: "MaterialCommunityIcons", iconName: "water", color: "#3498DB" },
  { keywords: ["bpjs", "kesehatan"], iconFamily: "MaterialCommunityIcons", iconName: "hospital-box-outline", color: "#00A651" },
  { keywords: ["indihome", "telkom"], iconFamily: "MaterialCommunityIcons", iconName: "router-wireless", color: "#E3000F" },
  { keywords: ["biznet"], iconFamily: "MaterialCommunityIcons", iconName: "router-network", color: "#009ADA" },
  { keywords: ["first media", "firstmedia"], iconFamily: "MaterialCommunityIcons", iconName: "wifi", color: "#FFDE00" },
  { keywords: ["myrepublic"], iconFamily: "MaterialCommunityIcons", iconName: "rocket-launch", color: "#A81E99" },
  { keywords: ["telkomsel", "kartu halo"], iconFamily: "MaterialCommunityIcons", iconName: "signal-cellular-3", color: "#ED1C24" },

  // --- GAMING & OTHERS ---
  { keywords: ["playstation", "ps plus", "psn"], iconFamily: "FontAwesome5", iconName: "playstation", color: "#003087" },
  { keywords: ["xbox", "game pass"], iconFamily: "FontAwesome5", iconName: "xbox", color: "#107C10" },
  { keywords: ["nintendo"], iconFamily: "MaterialCommunityIcons", iconName: "nintendo-switch", color: "#E60012" },
  { keywords: ["steam"], iconFamily: "MaterialCommunityIcons", iconName: "steam", color: "#171A21" },
  { keywords: ["discord", "nitro"], iconFamily: "FontAwesome5", iconName: "discord", color: "#5865F2" },
  { keywords: ["chatgpt", "openai"], iconFamily: "MaterialCommunityIcons", iconName: "robot-outline", color: "#10A37F" },
  { keywords: ["gym", "fitness", "yoga"], iconFamily: "MaterialCommunityIcons", iconName: "dumbbell", color: "#1E1E1E" },
];

export const getBrandVisuals = (name: string): BrandVisuals | undefined => {
  const lowerName = name.toLowerCase();
  return BRAND_DICTIONARY.find(brand =>
    brand.keywords.some(kw => lowerName.includes(kw))
  );
};
