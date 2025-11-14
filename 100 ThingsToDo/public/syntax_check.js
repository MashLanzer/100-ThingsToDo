const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');
let parenCount = 0;
let braceCount = 0;
let bracketCount = 0;
let inString = false;
let stringChar = '';
let templateDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1] || '';

    if (inString) {
      if (char === stringChar && (stringChar !== '`' || nextChar !== '$')) {
        inString = false;
        stringChar = '';
      } else if (char === '`' && stringChar === '`' && nextChar === '}') {
        templateDepth--;
        if (templateDepth === 0) {
          inString = false;
          stringChar = '';
        }
      }
      continue;
    }

    if (char === '`' && !inString) {
      inString = true;
      stringChar = '`';
      templateDepth = 1;
    } else if ((char === '"' || char === "'") && !inString) {
      inString = true;
      stringChar = char;
    } else if (!inString) {
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      else if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;

      if (parenCount < 0 || braceCount < 0 || bracketCount < 0) {
        console.log('Error at line', i + 1, 'char', j, ':', char);
        console.log('Context:', line.substring(Math.max(0, j - 20), j + 20));
        console.log('Counts: parens=' + parenCount + ', braces=' + braceCount + ', brackets=' + bracketCount);
        process.exit(1);
      }
    }
  }
}

console.log('Final counts: parens=' + parenCount + ', braces=' + braceCount + ', brackets=' + bracketCount);
if (parenCount !== 0 || braceCount !== 0 || bracketCount !== 0) {
  console.log('SYNTAX ERROR: Unbalanced brackets/parentheses/braces');
} else {
  console.log('Bracket/parenthesis/brace balance OK');
}