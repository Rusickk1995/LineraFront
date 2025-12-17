interface TimerBarProps {
  timeRemaining: number;
  totalTime: number;
}

export default function TimerBar({ timeRemaining, totalTime }: TimerBarProps) {
  const percentage = (timeRemaining / totalTime) * 100;
  const isLowTime = percentage < 30;

  return (
    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden shadow-inner">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-linear ${
          isLowTime
            ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
            : 'bg-gradient-to-r from-white to-gray-200'
        }`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}
