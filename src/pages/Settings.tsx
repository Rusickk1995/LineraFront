import { Globe, Palette, Volume2, Bell } from 'lucide-react';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-5xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Language</h2>
            </div>

            <select className="w-full px-6 py-4 bg-black/40 border-2 border-white/20 rounded-2xl text-white font-semibold focus:border-red-500 focus:outline-none transition-all">
              <option>English</option>
              <option>Русский</option>
              <option>Español</option>
              <option>Deutsch</option>
              <option>Français</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Palette className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Theme</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 border-2 border-white rounded-2xl font-bold text-white shadow-xl">
                Red & White
              </button>
              <button className="px-6 py-4 bg-black/40 border-2 border-white/20 rounded-2xl font-bold text-white/50 hover:text-white hover:border-white/40 transition-all">
                Dark Mode
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Volume2 className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Sound</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Master Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="70"
                  className="w-64 accent-red-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Sound Effects</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="80"
                  className="w-64 accent-red-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Tournament Notifications</span>
                <input type="checkbox" defaultChecked className="w-6 h-6 accent-red-600" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Game Updates</span>
                <input type="checkbox" defaultChecked className="w-6 h-6 accent-red-600" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white font-semibold">Chat Messages</span>
                <input type="checkbox" className="w-6 h-6 accent-red-600" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
