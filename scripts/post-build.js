import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running post-build script...');

// Создаем папку assets в dist если её нет
const distAssetsDir = path.join(__dirname, '..', 'dist', 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

// Копируем index.html в корень проекта если его там нет
const rootIndexPath = path.join(__dirname, '..', 'index.html');
const srcIndexPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');

if (!fs.existsSync(rootIndexPath) && fs.existsSync(srcIndexPath)) {
  console.log('Copying index.html to root...');
  let htmlContent = fs.readFileSync(srcIndexPath, 'utf8');
  
  // Обновляем пути для корневого index.html
  htmlContent = htmlContent.replace('./renderer/index.js', './dist/renderer/index.js');
  htmlContent = htmlContent.replace('./assets/styles/main.css', './dist/assets/styles/main.css');
  
  fs.writeFileSync(rootIndexPath, htmlContent);
  console.log('Created root index.html');
}

// Проверяем наличие иконок
const iconDir = path.join(__dirname, '..', 'src', 'assets');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log('Created assets directory');
}

// Создаем заглушки для иконок если их нет
const iconFiles = ['icon.ico', 'icon.png', 'icon.icns'];
for (const iconFile of iconFiles) {
  const iconPath = path.join(iconDir, iconFile);
  if (!fs.existsSync(iconPath)) {
    fs.writeFileSync(iconPath, '');
    console.log(`Created placeholder ${iconFile}`);
  }
}

console.log('Post-build script completed!');