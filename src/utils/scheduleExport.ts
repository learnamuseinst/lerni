import { DayPlan, Language, ScheduleBlock } from '../types';
import { formatDateDisplay } from './dateUtils';
import { formatMinutes } from './i18n';

export interface ScheduleExportResult {
  filename: string;
  content: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const formatEnergyText = (energy: string, lang: Language): string => {
  if (lang === 'fa') {
    switch (energy) {
      case 'high':
        return 'انرژی زیاد (تمرکز عمیق)';
      case 'medium':
        return 'انرژی متوسط (پایدار)';
      case 'low':
        return 'انرژی کم (سبک و کم‌فشار)';
      default:
        return 'متعادل';
    }
  }
  switch (energy) {
    case 'high':
      return 'HIGH ENERGY (Deep Focus)';
    case 'medium':
      return 'MEDIUM ENERGY (Steady Flow)';
    case 'low':
      return 'LOW ENERGY (Low Demand)';
    default:
      return 'BALANCED';
  }
};

const formatBlockType = (type: ScheduleBlock['type'], isBreak: boolean | undefined, lang: Language): string => {
  if (isBreak || type === 'break' || type === 'micro_reset') {
    return lang === 'fa' ? 'استراحت / تنفس' : 'REST / BREAK';
  }
  if (lang === 'fa') {
    switch (type) {
      case 'task':
        return 'تسک / کار';
      case 'event':
        return 'رویداد / جلسه';
      case 'habit':
        return 'عادت روزانه';
      default:
        return 'فعالیت';
    }
  }
  switch (type) {
    case 'task':
      return 'TASK';
    case 'event':
      return 'EVENT';
    case 'habit':
      return 'HABIT';
    default:
      return 'ACTIVITY';
  }
};

export const generateScheduleText = (plan: DayPlan, lang: Language = 'en'): ScheduleExportResult => {
  const now = new Date();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const exportTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${hours}:${minutes}:${seconds}`;

  const planDateFormatted = formatDateDisplay(plan.date, { showDayOfWeek: true, includeYear: true, lang });
  const filename = `lerni_schedule_${plan.date}_${hours}-${minutes}-${seconds}.txt`;

  const divider = '='.repeat(78);
  const thinDivider = '-'.repeat(78);

  const lines: string[] = [];

  if (lang === 'fa') {
    lines.push(divider);
    lines.push('  دستیار هوشمند لرنی - برنامه روزانه و ریتم انرژی (LERNI COMPANION)');
    lines.push(divider);
    lines.push(`تاریخ برنامه: ${planDateFormatted} [${plan.date}]`);
    lines.push(`زمان خروجی: ${exportTimestamp}`);
    lines.push(`مجموع زمان تمرکز: ${formatMinutes(plan.totalFocusMinutes, 'fa')}`);
    lines.push(`مجموع زمان استراحت و تنفس: ${formatMinutes(plan.totalBreakMinutes, 'fa')}`);
    lines.push(thinDivider);

    if (plan.summary) {
      lines.push('');
      lines.push('خلاصه و راهبرد روزانه:');
      lines.push(plan.summary);
      lines.push(thinDivider);
    }

    if (plan.predictedEnergyRhythm) {
      lines.push('');
      lines.push('ریتم پیش‌بینی‌شده انرژی روز:');
      lines.push(`  • صبح: ${formatEnergyText(plan.predictedEnergyRhythm.morning, 'fa')}`);
      lines.push(`  • بعدازظهر: ${formatEnergyText(plan.predictedEnergyRhythm.afternoon, 'fa')}`);
      lines.push(`  • عصر و شب: ${formatEnergyText(plan.predictedEnergyRhythm.evening, 'fa')}`);
      if (plan.predictedEnergyRhythm.rhythmNote) {
        lines.push(`  • راهنمای ریتم: ${plan.predictedEnergyRhythm.rhythmNote}`);
      }
      lines.push(thinDivider);
    }

    lines.push('');
    lines.push(divider);
    lines.push('  جدول زمان‌بندی روزانه (DAILY TIMELINE)');
    lines.push(divider);
    lines.push('');

    plan.scheduleBlocks.forEach((block, idx) => {
      const isBreak = block.isBreak || block.type === 'break' || block.type === 'micro_reset';
      const duration = formatMinutes(block.durationMinutes, 'fa');
      const typeLabel = formatBlockType(block.type, isBreak, 'fa');
      const energyLabel = formatEnergyText(block.energyDemand, 'fa');
      const checkMark = block.completed ? '[✓]' : '[ ]';

      lines.push(`[${block.startTime} - ${block.endTime}]  (${duration})  |  ${typeLabel}  |  ${energyLabel}`);
      lines.push(`  ${checkMark} ${block.title}`);

      if (block.executiveRationale) {
        lines.push(`    علت و استراتژی: ${block.executiveRationale}`);
      }

      if (block.microStarterSteps && block.microStarterSteps.length > 0) {
        lines.push('    ریزگام‌های دو دقیقه‌ای برای شروع:');
        block.microStarterSteps.forEach((step, stepIdx) => {
          lines.push(`      [ ] ${stepIdx + 1}. ${step}`);
        });
      }

      if (idx < plan.scheduleBlocks.length - 1) {
        lines.push('');
        lines.push(thinDivider);
        lines.push('');
      }
    });

    if (plan.pacingAdvice && plan.pacingAdvice.length > 0) {
      lines.push('');
      lines.push(divider);
      lines.push('  توصیه‌های تنظیم انرژی و سرعت روزانه');
      lines.push(divider);
      plan.pacingAdvice.forEach((advice, aIdx) => {
        lines.push(`  ${aIdx + 1}. ${advice}`);
      });
    }

    lines.push('');
    lines.push(divider);
    lines.push('  تولید شده توسط لرنی (Lerni) - همراه منعطف و حامی ریتم‌های روزمره');
    lines.push(divider);
  } else {
    lines.push(divider);
    lines.push('  LERNI COMPANION - DAILY ENERGY & FOCUS SCHEDULE');
    lines.push(divider);
    lines.push(`Plan Date: ${planDateFormatted} [${plan.date}]`);
    lines.push(`Exported At: ${exportTimestamp}`);
    lines.push(`Total Focus Time: ${formatMinutes(plan.totalFocusMinutes, 'en')}`);
    lines.push(`Total Restorative Breaks: ${formatMinutes(plan.totalBreakMinutes, 'en')}`);
    lines.push(thinDivider);

    if (plan.summary) {
      lines.push('');
      lines.push('DAILY SUMMARY & STRATEGY:');
      lines.push(plan.summary);
      lines.push(thinDivider);
    }

    if (plan.predictedEnergyRhythm) {
      lines.push('');
      lines.push('PREDICTED ENERGY RHYTHM:');
      lines.push(`  * Morning:   ${formatEnergyText(plan.predictedEnergyRhythm.morning, 'en')}`);
      lines.push(`  * Afternoon: ${formatEnergyText(plan.predictedEnergyRhythm.afternoon, 'en')}`);
      lines.push(`  * Evening:   ${formatEnergyText(plan.predictedEnergyRhythm.evening, 'en')}`);
      if (plan.predictedEnergyRhythm.rhythmNote) {
        lines.push(`  * Rhythm Guide: ${plan.predictedEnergyRhythm.rhythmNote}`);
      }
      lines.push(thinDivider);
    }

    lines.push('');
    lines.push(divider);
    lines.push('  DAILY TIMELINE & ACTION BLOCKS');
    lines.push(divider);
    lines.push('');

    plan.scheduleBlocks.forEach((block, idx) => {
      const isBreak = block.isBreak || block.type === 'break' || block.type === 'micro_reset';
      const duration = formatMinutes(block.durationMinutes, 'en');
      const typeLabel = formatBlockType(block.type, isBreak, 'en');
      const energyLabel = formatEnergyText(block.energyDemand, 'en');
      const checkMark = block.completed ? '[X]' : '[ ]';

      lines.push(`[${block.startTime} - ${block.endTime}]  (${duration})  |  ${typeLabel}  |  ${energyLabel}`);
      lines.push(`  ${checkMark} ${block.title}`);

      if (block.executiveRationale) {
        lines.push(`    Strategy / Why: ${block.executiveRationale}`);
      }

      if (block.microStarterSteps && block.microStarterSteps.length > 0) {
        lines.push('    Starter Micro-Steps:');
        block.microStarterSteps.forEach((step, stepIdx) => {
          lines.push(`      [ ] ${stepIdx + 1}. ${step}`);
        });
      }

      if (idx < plan.scheduleBlocks.length - 1) {
        lines.push('');
        lines.push(thinDivider);
        lines.push('');
      }
    });

    if (plan.pacingAdvice && plan.pacingAdvice.length > 0) {
      lines.push('');
      lines.push(divider);
      lines.push('  PACING ADVICE & SENSORY REMINDERS');
      lines.push(divider);
      plan.pacingAdvice.forEach((advice, aIdx) => {
        lines.push(`  ${aIdx + 1}. ${advice}`);
      });
    }

    lines.push('');
    lines.push(divider);
    lines.push('  Generated with Lerni - Gentle, Neuroinclusive Companion');
    lines.push(divider);
  }

  return {
    filename,
    content: lines.join('\n') + '\n',
  };
};

export const downloadScheduleAsText = (plan: DayPlan, lang: Language = 'en'): string => {
  const { filename, content } = generateScheduleText(plan, lang);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
};
