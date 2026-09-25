import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../../utils/audioSynth';

export type LerniPose = 'waving' | 'zen' | 'thinking' | 'cheering' | 'listening' | 'speaking';

interface LerniMascotProps {
  pose?: LerniPose;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

const LERNI_QUOTES = [
  "Doing 1% is infinitely better than 0%! 🐻💚",
  "Don't worry about tidying right now, just drop the thought!",
  "Take a slow breath. Your nervous system is safe.",
  "You are capable, and you don't need to finish everything today.",
  "Hydration check! Drink a sip of water for your brain 💧",
  "Resting without guilt is a productive skill.",
  "Let's break it down into a 2-minute step together!"
];

export const LerniMascot: React.FC<LerniMascotProps> = ({
  pose = 'waving',
  size = 'md',
  showSpeechBubble = false,
  speechText,
  className = '',
  onClick,
  interactive = true,
}) => {
  const [isWiggling, setIsWiggling] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(speechText || null);
  const [showActiveBubble, setShowActiveBubble] = useState(showSpeechBubble);

  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    hero: 'w-44 h-44',
  };

  const handleMascotClick = () => {
    setIsWiggling(true);
    soundEngine.playPop();
    const randomQuote = LERNI_QUOTES[Math.floor(Math.random() * LERNI_QUOTES.length)];
    setBubbleText(randomQuote);
    setShowActiveBubble(true);
    setTimeout(() => setIsWiggling(false), 600);

    if (onClick) onClick();
  };

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      
      {/* Speech Bubble */}
      <AnimatePresence>
        {(showActiveBubble || showSpeechBubble) && (bubbleText || speechText) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="absolute -top-14 z-30 max-w-xs px-3.5 py-1.5 rounded-2xl bg-white dark:bg-[#2F2937] text-[#1D1B20] dark:text-[#F3EDF7] border border-[#80D141]/40 dark:border-[#80D141]/50 shadow-md text-xs font-semibold whitespace-normal text-center pointer-events-auto"
          >
            <span>{bubbleText || speechText}</span>
            {/* Bubble Tail */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#2F2937] border-r border-b border-[#80D141]/40 dark:border-[#80D141]/50 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Graphic */}
      <motion.div
        animate={isWiggling ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.08, 1] } : {}}
        whileHover={interactive ? { scale: 1.06, rotate: 2 } : {}}
        whileTap={interactive ? { scale: 0.94 } : {}}
        onClick={interactive ? handleMascotClick : undefined}
        className={`${sizeClasses[size]} relative cursor-pointer flex items-center justify-center`}
        title="Lerni the Green Bear - Click for encouragement!"
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-sm filter"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Outer Glow / Aura */}
          {pose === 'zen' && (
            <circle cx="60" cy="60" r="54" fill="#80D141" fillOpacity="0.18" className="animate-pulse" />
          )}

          {/* Left Ear */}
          <circle cx="34" cy="30" r="15" fill="#75C635" />
          <circle cx="34" cy="30" r="8" fill="#FEE1DC" />

          {/* Right Ear */}
          <circle cx="86" cy="30" r="15" fill="#75C635" />
          <circle cx="86" cy="30" r="8" fill="#FEE1DC" />

          {/* Body / Torso */}
          <ellipse cx="60" cy="85" rx="36" ry="30" fill="#80D141" />
          
          {/* Light Belly patch */}
          <ellipse cx="60" cy="88" rx="22" ry="18" fill="#E8F8D8" />

          {/* Head */}
          <ellipse cx="60" cy="54" rx="34" ry="30" fill="#80D141" />

          {/* Cheerful Blush Cheeks */}
          <ellipse cx="38" cy="62" rx="6" ry="3.5" fill="#FFB4AB" fillOpacity="0.7" />
          <ellipse cx="82" cy="62" rx="6" ry="3.5" fill="#FFB4AB" fillOpacity="0.7" />

          {/* Muzzle */}
          <ellipse cx="60" cy="64" rx="16" ry="12" fill="#E8F8D8" />

          {/* Nose */}
          <path
            d="M56 59 C56 59, 60 57, 64 59 C65 60.5, 62 64, 60 64 C58 64, 55 60.5, 56 59 Z"
            fill="#1E3800"
          />

          {/* Mouth depending on pose */}
          {pose === 'speaking' || pose === 'cheering' ? (
            <path
              d="M55 65 Q60 72 65 65"
              stroke="#1E3800"
              strokeWidth="2"
              strokeLinecap="round"
              fill="#FF8A80"
            />
          ) : (
            <path
              d="M56 64.5 Q60 69 64 64.5"
              stroke="#1E3800"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Eyes */}
          {pose === 'zen' ? (
            // Peaceful Zen Eyes (curved closed arcs)
            <g stroke="#1E3800" strokeWidth="2.5" strokeLinecap="round">
              <path d="M43 50 Q48 54 53 50" fill="none" />
              <path d="M67 50 Q72 54 77 50" fill="none" />
            </g>
          ) : pose === 'thinking' ? (
            // Curious / Inquiring Eyes
            <g fill="#1E3800">
              <circle cx="48" cy="48" r="4.5" />
              <circle cx="50" cy="46" r="1.5" fill="white" />
              <circle cx="72" cy="48" r="4.5" />
              <circle cx="74" cy="46" r="1.5" fill="white" />
              {/* Question Eyebrow */}
              <path d="M43 42 Q48 39 53 42" stroke="#1E3800" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M67 40 Q72 37 77 42" stroke="#1E3800" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          ) : (
            // Standard Friendly Eyes with cute shine reflection
            <g fill="#1E3800">
              <circle cx="47" cy="50" r="4.5" />
              <circle cx="49" cy="48" r="1.8" fill="white" />
              <circle cx="73" cy="50" r="4.5" />
              <circle cx="75" cy="48" r="1.8" fill="white" />
            </g>
          )}

          {/* Paws / Arms */}
          {pose === 'waving' && (
            <>
              {/* Left resting paw */}
              <ellipse cx="28" cy="85" rx="7" ry="10" fill="#75C635" transform="rotate(15 28 85)" />
              {/* Right waving paw */}
              <g className="animate-bounce origin-bottom">
                <ellipse cx="94" cy="45" rx="8" ry="11" fill="#75C635" transform="rotate(35 94 45)" />
                <circle cx="94" cy="43" r="4" fill="#E8F8D8" />
              </g>
            </>
          )}

          {pose === 'cheering' && (
            <>
              {/* Both paws raised with stars */}
              <ellipse cx="26" cy="46" rx="8" ry="11" fill="#75C635" transform="rotate(-35 26 46)" />
              <ellipse cx="94" cy="46" rx="8" ry="11" fill="#75C635" transform="rotate(35 94 46)" />
              {/* Sparkles */}
              <path d="M18 35 L20 28 L22 35 L29 37 L22 39 L20 46 L18 39 L11 37 Z" fill="#FBBF24" />
              <path d="M102 35 L104 28 L106 35 L113 37 L106 39 L104 46 L102 39 L95 37 Z" fill="#FBBF24" />
            </>
          )}

          {pose === 'listening' && (
            <>
              {/* Headphones around ears */}
              <path d="M22 36 C22 15, 98 15, 98 36" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="16" y="28" width="10" height="18" rx="4" fill="#3B82F6" />
              <rect x="94" y="28" width="10" height="18" rx="4" fill="#3B82F6" />
              {/* Paws holding mic or chest */}
              <ellipse cx="44" cy="85" rx="7" ry="9" fill="#75C635" />
              <ellipse cx="76" cy="85" rx="7" ry="9" fill="#75C635" />
            </>
          )}

          {pose === 'thinking' && (
            <>
              {/* Paw on chin */}
              <ellipse cx="36" cy="86" rx="7" ry="9" fill="#75C635" />
              <ellipse cx="70" cy="72" rx="7" ry="9" fill="#75C635" transform="rotate(-25 70 72)" />
              {/* Little pencil */}
              <rect x="74" y="62" width="4" height="16" rx="2" fill="#F59E0B" transform="rotate(45 74 62)" />
            </>
          )}

          {pose === 'zen' && (
            <>
              {/* Resting meditation paws */}
              <ellipse cx="40" cy="88" rx="8" ry="6" fill="#75C635" />
              <ellipse cx="80" cy="88" rx="8" ry="6" fill="#75C635" />
            </>
          )}

          {pose === 'speaking' && (
            <>
              <ellipse cx="34" cy="84" rx="7" ry="9" fill="#75C635" transform="rotate(10 34 84)" />
              <ellipse cx="86" cy="84" rx="7" ry="9" fill="#75C635" transform="rotate(-10 86 84)" />
            </>
          )}

        </svg>
      </motion.div>
    </div>
  );
};
