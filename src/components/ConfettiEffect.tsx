import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export const ConfettiEffect = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = [
      'hsl(var(--primary))',
      '#FFD700',
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F'
    ];

    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 100; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 8
      });
    }
    setPieces(newPieces);

    // Clean up after animation
    const timer = setTimeout(() => {
      setPieces([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) rotate(180deg) scale(0.9) translateX(20px);
          }
          50% {
            transform: translateY(50vh) rotate(360deg) scale(0.8) translateX(-20px);
          }
          75% {
            transform: translateY(75vh) rotate(540deg) scale(0.7) translateX(10px);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5) translateX(-10px);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall ease-out forwards;
        }
      `}</style>
    </div>
  );
};
