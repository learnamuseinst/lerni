import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
import { BrainDumpItem } from '../../types';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n } from '../../utils/i18n';

interface EditBrainDumpModalProps {
  item: BrainDumpItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: BrainDumpItem) => void;
}

export const EditBrainDumpModal: React.FC<EditBrainDumpModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t, language } = useI18n();
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setContent(item.content);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    const updated: BrainDumpItem = {
      ...item,
      content: content.trim(),
    };

    onSave(updated);
    soundEngine.playGentleChime();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="w-full max-w-lg p-5 sm:p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCEAD4] dark:border-[#263722]">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('braindump.editModalTitle')}
            </h3>
            <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('braindump.editModalSub')}
            </p>
          </div>

          <button
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202C1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {t('braindump.thoughtContent')}
          </label>
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder={t('braindump.editPlaceholder')}
            className="w-full p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] resize-none leading-relaxed font-medium"
          />
          <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
            {language === 'fa' ? 'برای ذخیره کلیدهای ' : 'Press '}
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] text-[10px] font-mono">⌘/Ctrl + Enter</kbd>
            {language === 'fa' ? ' را بزنید' : ' to save'}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCEAD4] dark:border-[#263722]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
          >
            {t('common.cancel')}
          </button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim()}
            className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{t('braindump.saveChanges')}</span>
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
