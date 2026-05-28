/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      "colors": {
        "on-primary-fixed-variant": "#0038b6",
        "inverse-on-surface": "#eef0ff",
        "surface-dim": "#d2d9f4",
        "on-secondary-fixed-variant": "#005144",
        "on-secondary-container": "#007261",
        "tertiary": "#3e5600",
        "surface-container": "#eaedff",
        "on-tertiary-fixed-variant": "#384e00",
        "outline": "#737688",
        "on-tertiary-container": "#baf900",
        "on-secondary-fixed": "#00201a",
        "on-error": "#ffffff",
        "surface-tint": "#004ced",
        "secondary-fixed": "#26fedc",
        "secondary-fixed-dim": "#00dfc1",
        "secondary-container": "#26fedc",
        "on-tertiary": "#ffffff",
        "on-primary-container": "#dfe3ff",
        "primary-fixed-dim": "#b7c4ff",
        "surface-variant": "#dae2fd",
        "on-tertiary-fixed": "#141f00",
        "on-primary-fixed": "#001452",
        "primary-fixed": "#dde1ff",
        "on-secondary": "#ffffff",
        "primary": "#003ec7",
        "error-container": "#ffdad6",
        "error": "#ba1a1a",
        "primary-container": "#0052ff",
        "tertiary-container": "#527000",
        "surface": "#faf8ff",
        "inverse-surface": "#283044",
        "inverse-primary": "#b7c4ff",
        "on-surface-variant": "#434656",
        "background": "#faf8ff",
        "surface-container-low": "#f2f3ff",
        "on-background": "#131b2e",
        "tertiary-fixed-dim": "#a1d800",
        "tertiary-fixed": "#b8f600",
        "surface-container-highest": "#dae2fd",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e2e7ff",
        "secondary": "#006b5b",
        "on-surface": "#131b2e",
        "outline-variant": "#c3c5d9",
        "on-primary": "#ffffff",
        "surface-bright": "#faf8ff",
        "on-error-container": "#93000a"
      },
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      "spacing": {
        "gutter": "24px",
        "margin-mobile": "16px",
        "container-max": "1280px",
        "base": "8px",
        "margin-desktop": "40px"
      },
      "fontFamily": {
        "label-md": ["Geist"],
        "headline-lg": ["Hanken Grotesk"],
        "body-lg": ["Inter"],
        "headline-md": ["Hanken Grotesk"],
        "headline-lg-mobile": ["Hanken Grotesk"],
        "body-md": ["Inter"],
        "label-sm": ["Geist"],
        "display-lg": ["Hanken Grotesk"]
      },
      "fontSize": {
        "label-md": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.02em", "fontWeight": "500" }],
        "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "700" }],
        "body-md": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "1.2", "fontWeight": "600" }],
        "display-lg": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "800" }]
      }
    }
  },
  plugins: [],
}