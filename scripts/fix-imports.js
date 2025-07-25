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
    // import { something } from './module' -> from './module.js'
    /from\s+['"](\.[^'"]+?)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.html)['"](\s*;?)/g,
    // export { something } from './module' -> from './module.js'
    /export\s+.*?\s+from\s+['"](\.[^'"]+?)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.html)['"](\s*;?)/g,
  ];
  
  for (const pattern of patterns) {
    content = content.replace(pattern, (match, importPath, ending) => {
      // Проверяем, не является ли это путем к директории
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      
      try {
        const stat = fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
          // Если это директория, добавляем /index.js
          modified = true;
          return match.replace(importPath, importPath + '/index.js');
        }
      } catch (e) {
        // Файл не существует, попробуем добавить .js
        try {
          fs.statSync(resolvedPath + '.js');
          modified = true;
          return match.replace(importPath, importPath + '.js');
        } catch (e2) {
          // Оставляем как есть
          return match;
        }
      }
      
      return match;
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
  console.log(`Found ${jsFiles.length} JS files to process`);
  
  for (const file of jsFiles) {
    fixImports(file);
  }
  
  console.log('Done fixing imports!');
}

main();