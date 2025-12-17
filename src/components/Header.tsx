import { Home, Users, Settings, Spade } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const [balance] = useState(10000);

  return (
    <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 border-b-4 border-white/20 shadow-2xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Spade className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">POKER</h1>
          </div>

          <nav className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('home')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                currentPage === 'home'
                  ? 'bg-white text-red-600 shadow-xl'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => onNavigate('lobby')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                currentPage === 'lobby'
                  ? 'bg-white text-red-600 shadow-xl'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Lobby</span>
            </button>
            <button
              onClick={() => onNavigate('table')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                currentPage === 'table'
                  ? 'bg-white text-red-600 shadow-xl'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Spade className="w-5 h-5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                currentPage === 'settings'
                  ? 'bg-white text-red-600 shadow-xl'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="bg-black/30 backdrop-blur-sm px-6 py-3 rounded-2xl border-2 border-white/20 shadow-xl">
              <div className="text-xs text-white/70 font-medium">Balance</div>
              <div className="text-xl font-bold text-white">${balance.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
