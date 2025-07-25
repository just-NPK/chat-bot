import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Рекурсивно находим все .js файлы в директории
function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Исправляем импорты в файле
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Паттерны для поиска импортов
  const patterns = [
    // import { something } from './module'
    /from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)['"];?/g,
    // import something from '../module'
    /import\s+.*?\s+from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)['"];?/g,
    // export { something } from './module'
    /export\s+.*?\s+from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)['"];?/g,
  ];
  
  for (const pattern of patterns) {
    content = content.replace(pattern, (match, importPath) => {
      modified = true;
      // Не добавляем .js к путям, которые уже имеют расширение
      if (importPath.includes('.')) {
        return match;
      }
      return match.replace(importPath, importPath + '.js');
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
  }
}

// Основная функция
function main() {
  const distDir = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Run npm run build first.');
    process.exit(1);
  }
  
  console.log('Fixing imports in dist directory...');
  const jsFiles = findJsFiles(distDir);
  
  for (const file of jsFiles) {
    fixImports(file);
  }
  
  console.log('Done!');
}

main();