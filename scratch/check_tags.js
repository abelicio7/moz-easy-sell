const fs = require('fs');
const content = fs.readFileSync('c:/Users/User/Downloads/moz-easy-sell-main (1)/moz-easy-sell/src/pages/Index.tsx', 'utf8');

const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;
const sectionOpen = (content.match(/<section/g) || []).length;
const sectionClose = (content.match(/<\/section>/g) || []).length;

console.log(`Divs: Open ${divOpen}, Close ${divClose}`);
console.log(`Sections: Open ${sectionOpen}, Close ${sectionClose}`);
