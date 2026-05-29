const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        callback(path.join(dir, f));
      }
    }
  });
}

let modifiedCount = 0;

walk(srcDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('Alert.alert')) {
    content = content.replace(/Alert\.alert\(/g, 'customAlert(');
    
    if (!content.includes('import { customAlert }')) {
      const importStatement = "import { customAlert } from '@/components/ui/custom-alert';\n";
      content = content.replace(/^(import.*$)/m, importStatement + '$1');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified ${filePath}`);
  }
});

console.log(`Total files modified: ${modifiedCount}`);
