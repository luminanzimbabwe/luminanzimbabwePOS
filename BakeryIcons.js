const IconWrapper = (children) => `
  <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#634f44" strokeWidth="3">
    ${children}
  </svg>
`;

const BreadLoafIcon = () => IconWrapper(`
    <ellipse cx="32" cy="28" rx="18" ry="12" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
    <path d="M14 28c0-8 6-14 18-14h8c12 0 18 6 18 14v10H14V28z" fill="#F4A460" stroke="#8B4513" stroke-width="1"/>
    <path d="M20 20c-2 0-4 2-4 4M44 20c2 0 4 2 4 4" stroke="#654321" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 32h32" stroke="#8B4513" stroke-width="1"/>
    <ellipse cx="24" cy="24" rx="1" ry="1.5" fill="#654321"/>
    <ellipse cx="40" cy="26" rx="1.5" ry="1" fill="#654321"/>
  `);

const CroissantIcon = () => IconWrapper(`
    <path d="M16 40c-4-12 8-24 24-24 8 0 16 4 16 12-4 4-12 4-16 0-12 4-20 16-24 12z" fill="#F4A460" stroke="#8B4513" stroke-width="2"/>
    <path d="M20 28c-2-6 4-12 12-12 4 0 8 2 8 6-2 2-6 2-8 0-6 2-10 8-12 6z" fill="#DEB887" stroke="#8B4513" stroke-width="1"/>
    <ellipse cx="35" cy="20" rx="2" ry="1" fill="#654321"/>
    <ellipse cx="25" cy="35" rx="1.5" ry="1" fill="#654321"/>
  `);

const CookieIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="20" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
    <circle cx="25" cy="25" r="2" fill="#654321"/>
    <circle cx="40" cy="30" r="2.5" fill="#654321"/>
    <circle cx="32" cy="42" r="2" fill="#654321"/>
    <circle cx="28" cy="35" r="1.5" fill="#654321"/>
    <path d="M22 28c1-1 2-1 3 0M38 38c1 1 1 2 0 3" stroke="#654321" stroke-width="1" stroke-linecap="round"/>
  `);

const CakeSliceIcon = () => IconWrapper(`
    <path d="M12 44l20-8 20 8-20 12z" fill="#FFB6C1" stroke="#DC143C" stroke-width="1"/>
    <path d="M12 44V24l20-8v20" fill="#FFFACD" stroke="#DC143C" stroke-width="1"/>
    <path d="M32 16l20 8v20" fill="#FFE4E1" stroke="#DC143C" stroke-width="1"/>
    <circle cx="32" cy="28" r="2" fill="#FF69B4"/>
    <circle cx="28" cy="32" r="1.5" fill="#FF69B4"/>
    <circle cx="36" cy="35" r="1" fill="#FF69B4"/>
  `);

const DonutIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="18" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
    <circle cx="32" cy="32" r="8" fill="#FFF8DC" stroke="#8B4513" stroke-width="1"/>
    <circle cx="32" cy="32" r="10" fill="none" stroke="#654321" stroke-width="1" stroke-dasharray="2,2"/>
  `);

const PieIcon = () => IconWrapper(`
    <path d="M12 32c0 11 9 20 20 20s20-9 20-20H12z" fill="#CD853F" stroke="#8B4513" stroke-width="2"/>
    <path d="M12 32L32 12l20 20" stroke="#654321" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="32" cy="32" rx="3" ry="2" fill="#654321"/>
    <ellipse cx="25" cy="35" rx="2" ry="1.5" fill="#654321"/>
    <ellipse cx="40" cy="30" rx="1.5" ry="1" fill="#654321"/>
  `);

const BaguetteIcon = () => IconWrapper(`
    <ellipse cx="25" cy="32" rx="22" ry="8" fill="#F4A460" stroke="#8B4513" stroke-width="2"/>
    <path d="M8 32c0-4 3-7 7-7h30c4 0 7 3 7 7s-3 7-7 7H15c-4 0-7-3-7-7z" fill="#DEB887" stroke="#8B4513" stroke-width="1"/>
    <path d="M10 28c1-1 2-1 3 0M45 30c1 1 1 2 0 3M15 35c1 0 2 1 2 2" stroke="#654321" stroke-width="1" stroke-linecap="round"/>
  `);

const MuffinIcon = () => IconWrapper(`
    <rect x="16" y="40" width="32" height="8" fill="#8B4513" stroke="#654321" stroke-width="1"/>
    <path d="M20 40c0-12 24-12 24 0" fill="#D2691E" stroke="#8B4513" stroke-width="2"/>
    <ellipse cx="32" cy="32" rx="8" ry="6" fill="#F4A460"/>
    <circle cx="28" cy="30" r="1" fill="#654321"/>
    <circle cx="36" cy="34" r="1.5" fill="#654321"/>
  `);

const DefaultIcon = () => IconWrapper(`
        <rect x="18" y="18" width="28" height="28" fill="#F5F5DC" stroke="#8B4513" stroke-width="2" rx="4"/>
        <circle cx="32" cy="32" r="8" fill="#D2691E" stroke="#8B4513" stroke-width="1"/>
        <path d="M28 28l8 8M36 28l-8 8" stroke="#F5F5DC" stroke-width="2" stroke-linecap="round"/>
        <text x="32" y="48" text-anchor="middle" font-family="Arial" font-size="8" fill="#8B4513">?</text>
    `);

const SodaCanIcon = () => IconWrapper(`
    <rect x="16" y="20" width="24" height="24" rx="2" ry="2" fill="#C0C0C0" stroke="#8B4513" stroke-width="2"/>
    <rect x="18" y="22" width="20" height="20" rx="1" ry="1" fill="#FFF"/>
    <path d="M20 28h16M20 32h16M20 36h16" stroke="#8B4513" stroke-width="1"/>
    <circle cx="24" cy="24" r="1" fill="#654321"/>
    <circle cx="32" cy="24" r="1" fill="#654321"/>
`);

const BeerBottleIcon = () => IconWrapper(`
    <rect x="22" y="16" width="12" height="32" rx="2" ry="2" fill="#87CEEB" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="18" width="8" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 22h4M26 26h4M26 30h4M26 34h4" stroke="#8B4513" stroke-width="1"/>
    <rect x="20" y="46" width="16" height="4" rx="2" ry="2" fill="#8B4513"/>
    <circle cx="28" cy="20" r="1" fill="#654321"/>
`);

const JuiceBottleIcon = () => IconWrapper(`
    <path d="M20 48V16c0-2 2-4 4-4h12c2 0 4 2 4 4v32c0 2-2 4-4 4H24c-2 0-4-2-4-4z" fill="#FF6B35" stroke="#8B4513" stroke-width="2"/>
    <rect x="22" y="18" width="16" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M24 24h12M24 28h12M24 32h12M24 36h12" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="22" r="1" fill="#654321"/>
    <circle cx="32" cy="22" r="1" fill="#654321"/>
`);

const EnergyDrinkIcon = () => IconWrapper(`
    <rect x="18" y="20" width="20" height="28" rx="2" ry="2" fill="#FFD700" stroke="#8B4513" stroke-width="2"/>
    <rect x="20" y="22" width="16" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h12M22 32h12M22 36h12" stroke="#8B4513" stroke-width="1"/>
    <path d="M24 24l2-4h4l2 4" stroke="#8B4513" stroke-width="2"/>
    <circle cx="28" cy="26" r="1" fill="#654321"/>
`);

const WaterBottleIcon = () => IconWrapper(`
    <path d="M22 50V14c0-2 2-4 4-4h8c2 0 4 2 4 4v36c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="#87CEEB" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="16" width="12" height="32" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 22h8M26 26h8M26 30h8M26 34h8M26 38h8" stroke="#8B4513" stroke-width="1"/>
    <circle cx="30" cy="20" r="1" fill="#654321"/>
`);

const CoffeeIcon = () => IconWrapper(`
    <ellipse cx="32" cy="40" rx="12" ry="8" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <path d="M20 40c0-8 6-16 12-16s12 8 12 16" fill="#D2691E" stroke="#8B4513" stroke-width="1"/>
    <path d="M24 32c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="36" r="1" fill="#654321"/>
    <circle cx="32" cy="38" r="1" fill="#654321"/>
    <circle cx="36" cy="36" r="1" fill="#654321"/>
`);

const TeaIcon = () => IconWrapper(`
    <path d="M20 44c0-6 4-12 12-12h0c8 0 12 6 12 12" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <ellipse cx="32" cy="32" rx="8" ry="4" fill="#D2691E" stroke="#8B4513" stroke-width="1"/>
    <path d="M24 32c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <path d="M28 28l2-4h4l2 4" stroke="#654321" stroke-width="2"/>
    <circle cx="30" cy="36" r="1" fill="#654321"/>
    <circle cx="34" cy="38" r="1" fill="#654321"/>
`);

const CerealBoxIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="28" rx="2" ry="2" fill="#F4A460" stroke="#8B4513" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h16M22 32h16M22 36h16M22 40h16" stroke="#8B4513" stroke-width="1"/>
    <circle cx="26" cy="24" r="1" fill="#654321"/>
    <circle cx="30" cy="24" r="1" fill="#654321"/>
    <circle cx="34" cy="24" r="1" fill="#654321"/>
`);

const RiceBagIcon = () => IconWrapper(`
    <path d="M16 48V16c0-2 2-4 4-4h20c2 0 4 2 4 4v32c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="#F5F5DC" stroke="#8B4513" stroke-width="2"/>
    <rect x="18" y="18" width="24" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M20 24h20M20 28h20M20 32h20M20 36h20M20 40h20" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="22" r="1" fill="#654321"/>
`);

const PastaBoxIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="28" rx="2" ry="2" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h16M22 32h16M22 36h16M22 40h16" stroke="#8B4513" stroke-width="1"/>
    <ellipse cx="28" cy="24" rx="3" ry="1" fill="#654321"/>
    <ellipse cx="32" cy="26" rx="2" ry="1" fill="#654321"/>
`);

const CanIcon = () => IconWrapper(`
    <rect x="22" y="16" width="16" height="32" rx="2" ry="2" fill="#C0C0C0" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="18" width="12" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 24h8M26 28h8M26 32h8M26 36h8M26 40h8" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="22" r="1" fill="#654321"/>
`);

const SpiceJarIcon = () => IconWrapper(`
    <path d="M22 48V20c0-2 2-4 4-4h8c2 0 4 2 4 4v28c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="#F5DEB3" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="22" width="12" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 28h8M26 32h8M26 36h8M26 40h8" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="26" r="1" fill="#654321"/>
    <circle cx="32" cy="26" r="1" fill="#654321"/>
`);

const NutIcon = () => IconWrapper(`
    <ellipse cx="32" cy="32" rx="12" ry="8" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <path d="M24 32c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="28" r="1" fill="#654321"/>
    <circle cx="36" cy="28" r="1" fill="#654321"/>
    <circle cx="32" cy="36" r="1" fill="#654321"/>
`);

const FlourBagIcon = () => IconWrapper(`
    <path d="M16 48V16c0-2 2-4 4-4h20c2 0 4 2 4 4v32c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="#F5F5DC" stroke="#8B4513" stroke-width="2"/>
    <rect x="18" y="18" width="24" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M20 24h20M20 28h20M20 32h20M20 36h20M20 40h20" stroke="#8B4513" stroke-width="1"/>
    <text x="28" y="22" text-anchor="middle" font-family="Arial" font-size="6" fill="#8B4513">FLOUR</text>
`);

const SugarBagIcon = () => IconWrapper(`
    <path d="M16 48V16c0-2 2-4 4-4h20c2 0 4 2 4 4v32c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="#FFF" stroke="#8B4513" stroke-width="2"/>
    <rect x="18" y="18" width="24" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M20 24h20M20 28h20M20 32h20M20 36h20M20 40h20" stroke="#8B4513" stroke-width="1"/>
    <text x="28" y="22" text-anchor="middle" font-family="Arial" font-size="6" fill="#8B4513">SUGAR</text>
`);

const OilBottleIcon = () => IconWrapper(`
    <path d="M22 50V14c0-2 2-4 4-4h8c2 0 4 2 4 4v36c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="#FFD700" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="16" width="12" height="32" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 22h8M26 26h8M26 30h8M26 34h8M26 38h8" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="20" r="1" fill="#654321"/>
`);

const FruitIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="14" fill="#FF6B35" stroke="#8B4513" stroke-width="2"/>
    <path d="M24 28c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="26" r="1" fill="#654321"/>
    <circle cx="36" cy="26" r="1" fill="#654321"/>
    <circle cx="32" cy="36" r="1" fill="#654321"/>
`);

const VegetableIcon = () => IconWrapper(`
    <ellipse cx="32" cy="32" rx="12" ry="16" fill="#228B22" stroke="#8B4513" stroke-width="2"/>
    <path d="M24 24c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="22" r="1" fill="#654321"/>
    <circle cx="36" cy="22" r="1" fill="#654321"/>
    <ellipse cx="32" cy="40" rx="2" ry="1" fill="#654321"/>
`);

const FrozenIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="28" rx="2" ry="2" fill="#87CEEB" stroke="#8B4513" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h16M22 32h16M22 36h16M22 40h16" stroke="#4682B4" stroke-width="2"/>
    <circle cx="26" cy="24" r="1" fill="#4682B4"/>
    <circle cx="30" cy="24" r="1" fill="#4682B4"/>
    <circle cx="34" cy="24" r="1" fill="#4682B4"/>
`);

const MilkIcon = () => IconWrapper(`
    <path d="M20 48V16c0-2 2-4 4-4h12c2 0 4 2 4 4v32c0 2-2 4-4 4H24c-2 0-4-2-4-4z" fill="#FFF" stroke="#8B4513" stroke-width="2"/>
    <rect x="22" y="18" width="16" height="28" rx="1" ry="1" fill="#FFF"/>
    <path d="M24 24h12M24 28h12M24 32h12M24 36h12M24 40h12" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="22" r="1" fill="#654321"/>
`);

const MeatIcon = () => IconWrapper(`
    <ellipse cx="32" cy="32" rx="14" ry="10" fill="#8B0000" stroke="#654321" stroke-width="2"/>
    <path d="M24 28c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="26" r="1" fill="#654321"/>
    <circle cx="36" cy="26" r="1" fill="#654321"/>
    <ellipse cx="32" cy="38" rx="2" ry="1" fill="#654321"/>
`);

const CleaningIcon = () => IconWrapper(`
    <path d="M22 50V14c0-2 2-4 4-4h8c2 0 4 2 4 4v36c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="#00CED1" stroke="#8B4513" stroke-width="2"/>
    <rect x="24" y="16" width="12" height="32" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 22h8M26 26h8M26 30h8M26 34h8M26 38h8" stroke="#8B4513" stroke-width="1"/>
    <circle cx="28" cy="20" r="1" fill="#654321"/>
`);

const PersonalCareIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="14" fill="#FFB6C1" stroke="#8B4513" stroke-width="2"/>
    <path d="M24 28c2-4 6-6 8-6s6 2 8 6" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="26" r="1" fill="#654321"/>
    <circle cx="36" cy="26" r="1" fill="#654321"/>
    <circle cx="32" cy="36" r="1" fill="#654321"/>
`);

const BabyIcon = () => IconWrapper(`
    <circle cx="32" cy="28" r="12" fill="#FFB6C1" stroke="#8B4513" stroke-width="2"/>
    <circle cx="30" cy="26" r="1.5" fill="#654321"/>
    <circle cx="34" cy="26" r="1.5" fill="#654321"/>
    <path d="M28 32c2 0 4 1 4 2" stroke="#654321" stroke-width="1" fill="none"/>
    <circle cx="32" cy="40" r="8" fill="#FFF" stroke="#8B4513" stroke-width="1"/>
    <circle cx="32" cy="38" r="1" fill="#654321"/>
`);

const PetIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="14" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <circle cx="28" cy="28" r="2" fill="#FFF"/>
    <circle cx="36" cy="28" r="2" fill="#FFF"/>
    <circle cx="28" cy="27" r="1" fill="#654321"/>
    <circle cx="36" cy="27" r="1" fill="#654321"/>
    <path d="M30 34c2 0 4 1 4 2" stroke="#654321" stroke-width="1" fill="none"/>
    <ellipse cx="32" cy="40" rx="3" ry="2" fill="#654321"/>
`);

const StationeryIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="28" rx="2" ry="2" fill="#FFF" stroke="#8B4513" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h16M22 32h16M22 36h16M22 40h16" stroke="#8B4513" stroke-width="1"/>
    <circle cx="26" cy="24" r="1" fill="#654321"/>
    <circle cx="30" cy="24" r="1" fill="#654321"/>
    <circle cx="34" cy="24" r="1" fill="#654321"/>
`);

const AlcoholIcon = () => IconWrapper(`
    <path d="M22 50V14c0-2 2-4 4-4h8c2 0 4 2 4 4v36c0 2-2 4-4 4h-8c-2 0-4-2-4-4z" fill="#8B0000" stroke="#654321" stroke-width="2"/>
    <rect x="24" y="16" width="12" height="32" rx="1" ry="1" fill="#FFF"/>
    <path d="M26 22h8M26 26h8M26 30h8M26 34h8M26 38h8" stroke="#654321" stroke-width="1"/>
    <circle cx="28" cy="20" r="1" fill="#654321"/>
`);

const TobaccoIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="28" rx="2" ry="2" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="24" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h16M22 32h16M22 36h16M22 40h16" stroke="#654321" stroke-width="1"/>
    <circle cx="26" cy="24" r="1" fill="#654321"/>
    <circle cx="30" cy="24" r="1" fill="#654321"/>
    <circle cx="34" cy="24" r="1" fill="#654321"/>
`);

const HardwareIcon = () => IconWrapper(`
    <rect x="20" y="16" width="12" height="32" rx="2" ry="2" fill="#696969" stroke="#2F4F4F" stroke-width="2"/>
    <rect x="18" y="44" width="16" height="4" rx="2" ry="2" fill="#2F4F4F"/>
    <rect x="14" y="20" width="4" height="16" fill="#2F4F4F"/>
    <rect x="34" y="20" width="4" height="16" fill="#2F4F4F"/>
    <circle cx="24" cy="26" r="2" fill="#FFD700"/>
    <circle cx="28" cy="30" r="2" fill="#FFD700"/>
    <circle cx="24" cy="34" r="2" fill="#FFD700"/>
    <circle cx="28" cy="38" r="2" fill="#FFD700"/>
`);

const ElectronicsIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="20" rx="2" ry="2" fill="#4A90E2" stroke="#2171B5" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="16" rx="1" ry="1" fill="#FFF"/>
    <circle cx="24" cy="26" r="1.5" fill="#2171B5"/>
    <circle cx="30" cy="26" r="1.5" fill="#2171B5"/>
    <rect x="22" y="30" width="16" height="6" rx="1" ry="1" fill="#2171B5"/>
    <circle cx="26" cy="33" r="1" fill="#FFF"/>
    <circle cx="30" cy="33" r="1" fill="#FFF"/>
    <circle cx="34" cy="33" r="1" fill="#FFF"/>
`);

const ClothingIcon = () => IconWrapper(`
    <path d="M20 48V20c0-2 2-4 4-4h12c2 0 4 2 4 4v28c0 2-2 4-4 4H24c-2 0-4-2-4-4z" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <rect x="22" y="22" width="16" height="24" rx="1" ry="1" fill="#FFF"/>
    <circle cx="26" cy="28" r="2" fill="#654321"/>
    <circle cx="34" cy="28" r="2" fill="#654321"/>
    <path d="M24 38h4M32 38h4" stroke="#654321" stroke-width="2"/>
    <path d="M24 42h4M32 42h4" stroke="#654321" stroke-width="2"/>
`);

const ApplianceIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="24" rx="2" ry="2" fill="#C0C0C0" stroke="#808080" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="20" rx="1" ry="1" fill="#FFF"/>
    <circle cx="26" cy="26" r="2" fill="#FF0000"/>
    <circle cx="34" cy="26" r="2" fill="#00FF00"/>
    <rect x="22" y="32" width="16" height="8" rx="1" ry="1" fill="#808080"/>
    <circle cx="28" cy="36" r="1" fill="#FFF"/>
    <circle cx="32" cy="36" r="1" fill="#FFF"/>
`);

const HealthIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="14" fill="#FF6B6B" stroke="#D63031" stroke-width="2"/>
    <path d="M26 32l4-4 2 2 6-6M28 30h8M32 26v12" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="10" fill="none" stroke="#FFF" stroke-width="1"/>
`);

const CosmeticsIcon = () => IconWrapper(`
    <rect x="18" y="20" width="24" height="24" rx="2" ry="2" fill="#FFB6C1" stroke="#E84393" stroke-width="2"/>
    <rect x="20" y="22" width="20" height="20" rx="1" ry="1" fill="#FFF"/>
    <circle cx="28" cy="26" r="2" fill="#E84393"/>
    <circle cx="36" cy="26" r="2" fill="#E84393"/>
    <path d="M24 32c2-2 6-2 8 0M32 32c2-2 6-2 8 0" stroke="#E84393" stroke-width="1"/>
    <circle cx="32" cy="38" r="2" fill="#E84393"/>
`);

const BookIcon = () => IconWrapper(`
    <rect x="18" y="20" width="20" height="24" rx="1" ry="1" fill="#8B4513" stroke="#654321" stroke-width="2"/>
    <rect x="20" y="22" width="16" height="20" rx="1" ry="1" fill="#FFF"/>
    <path d="M22 28h12M22 32h12M22 36h12" stroke="#654321" stroke-width="1"/>
    <circle cx="26" cy="24" r="1" fill="#654321"/>
    <circle cx="30" cy="24" r="1" fill="#654321"/>
    <circle cx="34" cy="24" r="1" fill="#654321"/>
`);

const ToyIcon = () => IconWrapper(`
    <circle cx="32" cy="32" r="14" fill="#FFD93D" stroke="#F39C12" stroke-width="2"/>
    <circle cx="28" cy="28" r="2" fill="#E74C3C"/>
    <circle cx="36" cy="28" r="2" fill="#E74C3C"/>
    <path d="M26 36c2-2 6-2 8 0" stroke="#E74C3C" stroke-width="2" fill="none"/>
    <circle cx="32" cy="40" r="2" fill="#E74C3C"/>
    <circle cx="24" cy="24" r="1" fill="#F39C12"/>
    <circle cx="40" cy="24" r="1" fill="#F39C12"/>
`);

const AutomotiveIcon = () => IconWrapper(`
    <ellipse cx="32" cy="36" rx="16" ry="8" fill="#34495E" stroke="#2C3E50" stroke-width="2"/>
    <ellipse cx="32" cy="32" rx="12" ry="6" fill="#95A5A6" stroke="#7F8C8D" stroke-width="1"/>
    <circle cx="24" cy="40" r="4" fill="#2C3E50"/>
    <circle cx="40" cy="40" r="4" fill="#2C3E50"/>
    <circle cx="24" cy="38" r="2" fill="#95A5A6"/>
    <circle cx="40" cy="38" r="2" fill="#95A5A6"/>
    <rect x="28" y="28" width="8" height="4" rx="1" ry="1" fill="#E74C3C"/>
    <rect x="30" y="26" width="4" height="2" rx="1" ry="1" fill="#F39C12"/>
`);

/**
 * Returns a product background image URL based on the product's line code.
 * @param {string} lineCode - The line code of the product.
 * @returns {string} An image URL for the product background.
 */
const getBakeryIcon = (lineCode) => {
  const code = lineCode.toUpperCase();

  // Bakery products
  if (code.includes('BREAD') || code === 'BAK001' || code === 'BAK002' || code === 'BAK008' || code === 'BAK012' || code.startsWith('ZIMBAK')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK003') {
    return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK004') {
    return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK005') {
      return 'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK010') {
    return 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK013' || code === 'BAK014' || code === 'BAK015' || code === 'BAK018' || code === 'BAK022') {
    return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK016') {
    return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop&auto=format';
  }
  if (code === 'BAK017') {
    return 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&h=300&fit=crop&auto=format';
  }

  // Beverage products
  if (code.startsWith('BEV')) {
    const bevCode = code.substring(3); // Remove 'BEV' prefix

    // Mazoe fruit juices
    if (bevCode === '001' || bevCode === '002' || bevCode === '003' || bevCode === '004' || bevCode === '005') {
      return 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0?w=400&h=300&fit=crop&auto=format';
    }

    // Sparletta sodas
    if (['006', '007', '008', '009', '010', '057', '060'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1629203851122-3726ecdf081e?w=400&h=300&fit=crop&auto=format';
    }

    // Coca-Cola products
    if (['011', '012', '013', '014'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop&auto=format';
    }

    // Fanta products
    if (['015', '016', '017', '018'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1629203851122-3726ecdf081e?w=400&h=300&fit=crop&auto=format';
    }

    // Sprite products
    if (['019', '020'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1629203851122-3726ecdf081e?w=400&h=300&fit=crop&auto=format';
    }

    // Schweppes products
    if (['021', '022', '023', '024'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1629203851122-3726ecdf081e?w=400&h=300&fit=crop&auto=format';
    }

    // Energy drinks
    if (['025', '026', '027', '053'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=300&fit=crop&auto=format';
    }

    // Tea drinks
    if (['028', '029', '030', '063', '064'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop&auto=format';
    }

    // Malt drinks
    if (['031', '032', '033'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop&auto=format';
    }

    // Beers
    if (['034', '035', '036', '037', '038', '039', '058', '059'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&auto=format';
    }

    // Bottled water
    if (['040', '041', '042', '043', '044'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop&auto=format';
    }

    // International sodas
    if (['045', '046', '047', '048', '049'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1629203851122-3726ecdf081e?w=400&h=300&fit=crop&auto=format';
    }

    // Sports drinks
    if (['050', '051', '052'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=300&fit=crop&auto=format';
    }

    // Fruit juices
    if (['054', '055', '056'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0?w=400&h=300&fit=crop&auto=format';
    }

    // Coffee
    if (['065', '066'].includes(bevCode)) {
      return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop&auto=format';
    }

    // Aquarius
    if (bevCode === '061') {
      return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=300&fit=crop&auto=format';
    }

    // Tang
    if (bevCode === '062') {
      return 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0?w=400&h=300&fit=crop&auto=format';
    }
  }

  // Dried Foods
  if (code.startsWith('DRY')) {
    const dryCode = code.substring(3); // Remove 'DRY' prefix

    // Cereals and breakfast foods (001-005)
    if (['001', '002', '003', '004', '005'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&auto=format';
    }

    // Rice and grains (006-010)
    if (['006', '007', '008', '009', '010'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1536304993881-ff6e9aefacd8?w=400&h=300&fit=crop&auto=format';
    }

    // Pasta and noodles (011-015)
    if (['011', '012', '013', '014', '015'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop&auto=format';
    }

    // Flour and baking ingredients (016-020)
    if (['016', '017', '018', '019', '020'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&auto=format';
    }

    // Sugar and sweeteners (021-024)
    if (['021', '022', '023', '024'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&h=300&fit=crop&auto=format';
    }

    // Cooking oils and fats (025-029)
    if (['025', '026', '027', '028', '029'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop&auto=format';
    }

    // Canned foods (030-034)
    if (['030', '031', '032', '033', '034'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1543158181-e6f9f6712055?w=400&h=300&fit=crop&auto=format';
    }

    // Snacks and biscuits (035-039)
    if (['035', '036', '037', '038', '039'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1566479179815-95ae11e6522d?w=400&h=300&fit=crop&auto=format';
    }

    // Condiments and sauces (040-044)
    if (['040', '041', '042', '043', '044'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&auto=format';
    }

    // Spices and seasonings (045-049)
    if (['045', '046', '047', '048', '049'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop&auto=format';
    }

    // Dried fruits and nuts (050-054)
    if (['050', '051', '052', '053', '054'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=300&fit=crop&auto=format';
    }

    // Dairy and milk products (055-057)
    if (['055', '056', '057'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop&auto=format';
    }

    // Soups and instant meals (058-060)
    if (['058', '059', '060'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&auto=format';
    }

    // Zimbabwean specialties (061-065)
    if (['061', '062', '063', '064', '065'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1536304993881-ff6e9aefacd8?w=400&h=300&fit=crop&auto=format';
    }

    // More international products (066-070)
    if (['066', '067', '068', '069', '070'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1536304993881-ff6e9aefacd8?w=400&h=300&fit=crop&auto=format';
    }

    // More snacks (071-075)
    if (['071', '072', '073', '074', '075'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1566479179815-95ae11e6522d?w=400&h=300&fit=crop&auto=format';
    }

    // Baking essentials (076-080)
    if (['076', '077', '078', '079', '080'].includes(dryCode)) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop&auto=format';
    }
  }

  // Fresh Produce - Fruits
  if (code.startsWith('FRU')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf2597f7331?w=400&h=300&fit=crop&auto=format';
  }

  // Fresh Produce - Vegetables
  if (code.startsWith('VEG')) {
    return 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=300&fit=crop&auto=format';
  }

  // Frozen Foods
  if (code.startsWith('FRO')) {
    return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format';
  }

  // Dairy Products
  if (code.startsWith('DAI')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop&auto=format';
  }

  // Meat Products
  if (code.startsWith('MEA')) {
    return 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop&auto=format';
  }

  // Household Products
  if (code.startsWith('HOU')) {
    return 'https://images.unsplash.com/photo-1563452619260-625a04f3d4ef?w=400&h=300&fit=crop&auto=format';
  }

  // Personal Care Products
  if (code.startsWith('PER')) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&auto=format';
  }

  // Baby Products
  if (code.startsWith('BAB')) {
    return 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&h=300&fit=crop&auto=format';
  }

  // Pet Products
  if (code.startsWith('PET')) {
    return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop&auto=format';
  }

  // Stationery
  if (code.startsWith('STA')) {
    return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=300&fit=crop&auto=format';
  }

  // Alcohol Products
  if (code.startsWith('ALC')) {
    return 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop&auto=format';
  }

  // Tobacco Products
  if (code.startsWith('TOB')) {
    return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&auto=format';
  }

  // Hardware Products
  if (code.startsWith('HAR')) {
    return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&h=300&fit=crop&auto=format';
  }

  // Electronics Products
  if (code.startsWith('ELE')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&auto=format';
  }

  // Clothing Products
  if (code.startsWith('CLO')) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop&auto=format';
  }

  // Home Appliances
  if (code.startsWith('APP') || code.startsWith('FUR')) {
    return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format';
  }

  // Health Products
  if (code.startsWith('HEA')) {
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&auto=format';
  }

  // Cosmetics Products
  if (code.startsWith('COS')) {
    return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&auto=format';
  }

  // Books and Media
  if (code.startsWith('BOK') || code.startsWith('MED')) {
    return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&auto=format';
  }

  // Toys and Games
  if (code.startsWith('TOY') || code.startsWith('GAM')) {
    return 'https://images.unsplash.com/photo-1558877385-1199c1af4e0f?w=400&h=300&fit=crop&auto=format';
  }

  // Automotive Products
  if (code.startsWith('AUT')) {
    return 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop&auto=format';
  }

  return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'; // A default product image
};