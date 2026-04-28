
import fs from 'fs';

const content = fs.readFileSync('c:/Users/User/Downloads/moz-easy-sell-main (1)/moz-easy-sell/src/pages/FlowBuilder/VisualBuilder.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
lines.forEach((line, i) => {
  const openDivs = (line.match(/<div/g) || []).length;
  const closeDivs = (line.match(/<\/div>/g) || []).length;
  const selfClosingDivs = (line.match(/<div[^>]*\/>/g) || []).length;
  
  balance += openDivs - closeDivs - selfClosingDivs;
  
  if (balance < 0) {
    console.log(`NEGATIVE BALANCE at line ${i + 1}: ${line.trim()}`);
    balance = 0; // reset to find more
  }
});
console.log('Final balance:', balance);
