/**
 * SMIT Agency Design Tokens
 * Dùng cho toàn hệ thống - import từ @mf2/shared-ui
 */
export const colors = {
  // Background
  bg_primary: '#0a1628',
  bg_surface: 'rgba(255,255,255,0.03)',
  bg_surface_hover: 'rgba(255,255,255,0.06)',
  bg_input: 'rgba(255,255,255,0.05)',
  bg_input_focus: 'rgba(255,255,255,0.07)',

  // Brand
  green: '#22c55e',
  green_hover: '#4ade80',
  green_light: '#4ade80',
  green_tint: '#0f3d2e',
  lime: '#bef264',
  teal: '#14b8a6',

  // Text
  text_primary: '#ffffff',
  text_secondary: 'rgba(255,255,255,0.5)',
  text_muted: 'rgba(255,255,255,0.4)',
  text_faint: 'rgba(255,255,255,0.25)',

  // Border
  border: 'rgba(255,255,255,0.08)',
  border_hover: 'rgba(255,255,255,0.15)',

  // Status
  error: '#ef4444',
  error_bg: 'rgba(239,68,68,0.1)',
  error_border: 'rgba(239,68,68,0.2)',
  success: '#22c55e',
  warning: '#f59e0b',
} as const;

export type ColorToken = keyof typeof colors;
