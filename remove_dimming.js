const fs = require('fs');
let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

// Restore orbit colors to 0.8 opacity instead of 0.15
content = content.replace(/'rgba\(239, 68, 68, 0\.15\)'/g, "'rgba(239, 68, 68, 0.8)'");
content = content.replace(/'rgba\(245, 158, 11, 0\.15\)'/g, "'rgba(245, 158, 11, 0.8)'");

// Restore satellite color to 0xffffff instead of 0x444444
content = content.replace(/0x444444/g, "0xffffff");

fs.writeFileSync('frontend/components/globe-viz.tsx', content);
