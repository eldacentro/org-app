const fs = require('fs');
const path = require('path');

const files = [
  'src/locales/en/onboarding.json',
  'src/locales/en/forms-templates.json',
  'src/locales/en/ministry.json',
  'src/locales/en/general.json',
  'src/locales/en/public_talks.json',
  'src/locales/en/meetings.json',
  'src/locales/en/songs.json',
  'src/locales/en/errors.json',
  'src/locales/en/dashboard.json',
  'src/locales/en/congregation.json',
  'src/locales/en/activities.json',
  'src/locales/en/release_notes.json',
  'src/locales/en/profile.json',
  'src/locales/en-LR/onboarding.json',
  'src/locales/en-LR/forms-templates.json',
  'src/locales/en-LR/ministry.json',
  'src/locales/en-LR/general.json',
  'src/locales/en-LR/public_talks.json',
  'src/locales/en-LR/meetings.json',
  'src/locales/en-LR/songs.json',
  'src/locales/en-LR/errors.json',
  'src/locales/en-LR/dashboard.json',
  'src/locales/en-LR/congregation.json',
  'src/locales/en-LR/activities.json',
  'src/locales/en-LR/release_notes.json',
  'src/locales/en-LR/profile.json'
];

const modifiedFiles = [];

files.forEach(filePath => {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) return;

  let content = fs.readFileSync(absolutePath, 'utf8');
  let json = JSON.parse(content);
  let changed = false;

  for (const key in json) {
    if (typeof json[key] !== 'string') continue;

    const oldValue = json[key];
    let value = oldValue;

    // Rule for tr_readComplete
    if (key === 'tr_readComplete') {
      value = "I have read and agree to the terms of use of this application.";
    } 
    // Rule for tr_oauthAccept
    else if (key === 'tr_oauthAccept') {
      value = "I have read and agree to the terms of use of this application.";
    } 
    // Rule for tr_invitationCodeInstruction
    else if (key === 'tr_invitationCodeInstruction') {
        value = value.replace(/<a href='https:\/\/organized-app\.com'[^>]*>organized-app\.com<\/a>/g, 'the app');
    }
    
    // Process other links for sws2apps.com or organized-app.com
    // Regex to find <a> tags with these domains
    const linkRegex = /<a\s+[^>]*href=['"]https?:\/\/(?:sws2apps\.com|organized-app\.com)[^'"]*['"][^>]*>(.*?)<\/a>/gi;
    value = value.replace(linkRegex, (match, anchorText) => {
        const trimmedAnchor = anchorText.trim();
        // If the link is just the URL itself, remove it.
        if (trimmedAnchor === 'sws2apps.com' || 
            trimmedAnchor === 'organized-app.com' || 
            trimmedAnchor.startsWith('https://sws2apps.com') || 
            trimmedAnchor.startsWith('https://organized-app.com') ||
            trimmedAnchor.startsWith('http://sws2apps.com') || 
            trimmedAnchor.startsWith('http://organized-app.com')) {
            return '';
        }
        // If the link contains text like "Terms of use" or "Privacy policy", keep that text as plain text.
        // The rule says "keep that text as plain text" for these domains.
        return trimmedAnchor;
    });

    // Global replacements
    // 1. "Welcome to Organized" -> "Welcome to Elda Centro"
    value = value.replace(/Welcome to Organized/g, 'Welcome to Elda Centro');
    
    // 2. "How to use Organized" -> "User guide"
    value = value.replace(/How to use Organized/g, 'User guide');
    
    // 3. "Organized app" -> "Elda Centro"
    value = value.replace(/Organized app/g, 'Elda Centro');
    
    // 4. "Organized" -> "Elda Centro"
    value = value.replace(/Organized/g, 'Elda Centro');
    
    // 5. "support@organized-app.com" -> "support@eldacentro.com"
    value = value.replace(/support@organized-app\.com/g, 'support@eldacentro.com');

    if (value !== oldValue) {
      json[key] = value;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(absolutePath, JSON.stringify(json, null, 2));
    modifiedFiles.push(filePath);
  }
});

console.log(JSON.stringify(modifiedFiles));
