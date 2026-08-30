const fs = require('fs');
let content = fs.readFileSync('frontend/components/app-header.tsx', 'utf8');

// Remove timeZone: 'UTC' from both date and time formatting
content = content.replace(/timeZone: 'UTC',/g, '');
// Change UTC span to LOCAL
content = content.replace(/<span className="text-muted-foreground">UTC<\/span>/g, '<span className="text-muted-foreground">LOCAL</span>');

fs.writeFileSync('frontend/components/app-header.tsx', content);
