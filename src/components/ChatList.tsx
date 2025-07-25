import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Chat } from '../types';

interface ChatListProps {
  chats: Chat[];
  activeChat: number;
  isDarkMode: boolean;
  onChatClick: (index: number) => void;
  onChatDelete: (index: number) => void;
  height: number;
}

interface ChatItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    chats: Chat[];
    activeChat: number;
    isDarkMode: boolean;
    onChatClick: (index: number) => void;
    onChatDelete: (index: number) => void;
  };
}

const ChatItem = memo(({ index, style, data }: ChatItemProps) => {
  const { chats, activeChat, isDarkMode, onChatClick, onChatDelete } = data;
  const chat = chats[index];
  const isActive = activeChat === index;
  
  return (
    <div style={style}>
      <div
        className={`group flex items-center px-4 py-3 cursor-pointer transition-colors ${
          isActive 
            ? isDarkMode ? 'bg-gray-700' : 'bg-gray-800' 
            : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-800'
        }`}
        onClick={() => onChatClick(index)}
      >
        <div className="flex-1 truncate">
          <div className="text-sm truncate text-white">{chat.name}</div>
          {chat.messages.length > 0 && (
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {chat.messages.length} сообщений
            </div>
          )}
        </div>
        {chats.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChatDelete(index);
            }}
            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

export const ChatList: React.FC<ChatListProps> = memo(({
  chats,
  activeChat,
  isDarkMode,
  onChatClick,
  onChatDelete,
  height
}) => {
  const itemData = {
    chats,
    activeChat,
    isDarkMode,
    onChatClick,
    onChatDelete
  };
  
  return (
    <List
      height={height}
      itemCount={chats.length}
      itemSize={60}
      width="100%"
      itemData={itemData}
      overscanCount={5}
    >
      {ChatItem}
    </List>
  );
});

ChatList.displayName = 'ChatList';