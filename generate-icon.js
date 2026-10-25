// scratch script to generate a clean icon for Android app
import fs from 'fs';
import path from 'path';

// Generate a high-contrast SVG icon with Indian flag saffron/white/green and crosshair
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e2b1f"/>
      <stop offset="100%" stop-color="#090d09"/>
    </radialGradient>
    <linearGradient id="flag" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff9933"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#138808"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="210" fill="none" stroke="url(#flag)" stroke-width="12"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#ff9933" stroke-width="6" stroke-dasharray="15,10"/>
  <circle cx="256" cy="256" r="90" fill="none" stroke="#00e1d9" stroke-width="5"/>
  <line x1="256" y1="20" x2="256" y2="492" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
  <line x1="20" y1="256" x2="492" y2="256" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
  <circle cx="256" cy="256" r="18" fill="#ffcc00"/>
  <text x="256" y="380" font-family="sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="4">BATTLE INDIA</text>
</svg>`;

fs.writeFileSync('public/icon.svg', svgContent);
console.log('Icon written to public/icon.svg');
