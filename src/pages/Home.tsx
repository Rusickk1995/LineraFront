import { Spade, TrendingUp, Trophy, Users } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 text-9xl">♠</div>
        <div className="absolute top-40 right-32 text-9xl">♥</div>
        <div className="absolute bottom-32 left-40 text-9xl">♦</div>
        <div className="absolute bottom-20 right-20 text-9xl">♣</div>
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-4xl">
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl animate-pulse-glow">
            <Spade className="w-16 h-16 text-red-600" />
          </div>
        </div>

        <h1 className="text-7xl font-bold text-white tracking-tight mb-4">
          PREMIUM <span className="text-red-500">POKER</span>
        </h1>

        <p className="text-2xl text-white/80 font-light max-w-2xl mx-auto">
          Experience the thrill of professional poker. Play with the best.
        </p>

        <div className="flex flex-col items-center space-y-6 mt-12">
          <button
            onClick={() => onNavigate('lobby')}
            className="group relative px-16 py-6 bg-gradient-to-r from-red-600 to-red-700 text-white text-2xl font-bold rounded-3xl border-4 border-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-red-500/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10">PLAY NOW</span>
          </button>

          <button
            onClick={() => onNavigate('table')}
            className="group relative px-12 py-4 bg-white text-red-600 text-lg font-bold rounded-2xl border-2 border-red-500 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-red-500/50"
          >
            <span>Quick Start</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="bg-black/40 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 hover:border-red-500/50 transition-all duration-300 hover:scale-105">
            <TrendingUp className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">High Stakes</h3>
            <p className="text-white/70">Play for real money with competitive stakes</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 hover:border-red-500/50 transition-all duration-300 hover:scale-105">
            <Users className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Global Players</h3>
            <p className="text-white/70">Compete with players from around the world</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm border-2 border-white/10 rounded-3xl p-8 hover:border-red-500/50 transition-all duration-300 hover:scale-105">
            <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Tournaments</h3>
            <p className="text-white/70">Join exclusive tournaments and win big</p>
          </div>
        </div>
      </div>
    </div>
  );
}
