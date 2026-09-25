// Theme Color Management for Lerni (Material Expressive)
// Default accent: #80D141 (Lerni Apple/Leaf Green)

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'lerni_green', name: 'Lerni Green (Default)', hex: '#80D141', description: 'Fresh, stimulating, neuro-affirming green' },
  { id: 'mint_leaf', name: 'Cool Mint', hex: '#10B981', description: 'Calming and refreshing clarity' },
  { id: 'electric_cyan', name: 'Cyan Breeze', hex: '#06B6D4', description: 'Cool focus and open mindset' },
  { id: 'ocean_blue', name: 'Ocean Depth', hex: '#0284C7', description: 'Steady, deep grounding wave' },
  { id: 'gentle_lavender', name: 'Soft Lavender', hex: '#8B5CF6', description: 'Peaceful balance & low sensory strain' },
  { id: 'sunset_coral', name: 'Sunset Coral', hex: '#F43F5E', description: 'Warm dopamine spark' },
  { id: 'sunny_amber', name: 'Sunny Honey', hex: '#F59E0B', description: 'Optimistic morning light' },
  { id: 'berry_violet', name: 'Berry Bloom', hex: '#D946EF', description: 'Playful and creative' },
];

export const DEFAULT_ACCENT_COLOR = '#80D141';

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 128, g: 209, b: 65 }; // fallback #80D141
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL back to Hex string
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function getDerivedThemeTokens(baseHex: string, isDark: boolean = false) {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Compute text contrast on primary
  // Relative luminance formula
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const onPrimary = lum > 0.55 ? '#112200' : '#FFFFFF';

  if (!isDark) {
    // Light Mode tokens
    const primary = baseHex;
    const primaryHover = hslToHex(h, Math.min(100, s + 5), Math.max(20, l - 8));
    const primaryContainer = hslToHex(h, Math.max(35, s - 15), 92); // very soft pastel
    const onPrimaryContainer = hslToHex(h, Math.min(100, s + 10), 18); // very high contrast text
    const primaryBorder = hslToHex(h, Math.max(30, s - 10), 78);
    const primaryBadge = hslToHex(h, Math.max(40, s - 10), 85);

    return {
      primary,
      onPrimary,
      primaryHover,
      primaryContainer,
      onPrimaryContainer,
      primaryBorder,
      primaryBadge,
      glow: `rgba(${r}, ${g}, ${b}, 0.25)`,
      rgb: `${r}, ${g}, ${b}`,
    };
  } else {
    // Dark Mode tokens
    const primary = hslToHex(h, Math.min(100, s + 10), Math.min(75, Math.max(55, l)));
    const primaryHover = hslToHex(h, s, Math.min(85, l + 8));
    const primaryContainer = hslToHex(h, Math.max(25, s - 30), 20); // dark tint
    const onPrimaryContainer = hslToHex(h, Math.min(100, s + 20), 88); // bright soft text
    const primaryBorder = hslToHex(h, Math.max(30, s - 20), 32);
    const primaryBadge = hslToHex(h, Math.max(30, s - 20), 26);

    return {
      primary,
      onPrimary: '#0B1B04',
      primaryHover,
      primaryContainer,
      onPrimaryContainer,
      primaryBorder,
      primaryBadge,
      glow: `rgba(${r}, ${g}, ${b}, 0.35)`,
      rgb: `${r}, ${g}, ${b}`,
    };
  }
}

export function applyThemeToDocument(hex: string, isDark: boolean = false) {
  const tokens = getDerivedThemeTokens(hex, isDark);
  const root = document.documentElement;

  root.style.setProperty('--color-primary', tokens.primary);
  root.style.setProperty('--color-on-primary', tokens.onPrimary);
  root.style.setProperty('--color-primary-hover', tokens.primaryHover);
  root.style.setProperty('--color-primary-container', tokens.primaryContainer);
  root.style.setProperty('--color-on-primary-container', tokens.onPrimaryContainer);
  root.style.setProperty('--color-primary-border', tokens.primaryBorder);
  root.style.setProperty('--color-primary-badge', tokens.primaryBadge);
  root.style.setProperty('--color-primary-rgb', tokens.rgb);
  root.style.setProperty('--color-primary-glow', tokens.glow);
}
