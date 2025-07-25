import React from 'react';
import type { Chat } from '../types';

interface ExportMenuProps {
  chat?: Chat;
  isDarkMode: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ chat, isDarkMode }) => {
  if (!chat) return null;
  
  return (
    <div className="relative group">
      <button className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
        Экспорт
      </button>
    </div>
  );
};

export default ExportMenu;