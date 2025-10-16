import { jsPDF } from 'jspdf';
import type { BudgetEntry, ItineraryPlan } from '../types';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportPlanAsJson = (plan: ItineraryPlan, budgets: BudgetEntry[]) => {
  const payload = {
    plan,
    budgets: budgets.filter((entry) => entry.planId === plan.id)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${plan.name || 'travel-plan'}.json`);
};

export const exportPlanAsPdf = (plan: ItineraryPlan, budgets: BudgetEntry[]) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let cursorY = margin;

  doc.setFontSize(18);
  doc.text(plan.name || 'AI 旅行行程', margin, cursorY);
  cursorY += 24;
  doc.setFontSize(12);
  doc.text(`日期：${plan.preference.startDate} 至 ${plan.preference.endDate}`, margin, cursorY);
  cursorY += 18;
  doc.text(`预算：${plan.estimatedBudget} ${plan.currency}`, margin, cursorY);
  cursorY += 24;

  plan.days.forEach((day) => {
    if (cursorY > 760) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFontSize(14);
    doc.text(day.date, margin, cursorY);
    cursorY += 18;
    doc.setFontSize(11);
    if (!day.items.length) {
      doc.text('暂无安排', margin + 16, cursorY);
      cursorY += 16;
    }
    day.items.forEach((item) => {
      const lines = doc.splitTextToSize(`${item.time} ${item.title} - ${item.description}`, 500);
      doc.text(lines, margin + 16, cursorY);
      cursorY += lines.length * 14 + 4;
    });
    cursorY += 6;
  });

  doc.addPage();
  cursorY = margin;
  doc.setFontSize(16);
  doc.text('费用记录', margin, cursorY);
  cursorY += 24;
  const relatedBudgets = budgets.filter((entry) => entry.planId === plan.id);
  if (!relatedBudgets.length) {
    doc.text('暂无费用记录', margin, cursorY);
  } else {
    relatedBudgets.forEach((entry) => {
      if (cursorY > 760) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(
        `${new Date(entry.createdAt).toLocaleDateString()} - ${entry.category} - ${entry.amount.toFixed(2)} ${entry.currency}`,
        margin,
        cursorY
      );
      cursorY += 18;
      if (entry.note) {
        const lines = doc.splitTextToSize(`备注：${entry.note}`, 500);
        doc.text(lines, margin + 12, cursorY);
        cursorY += lines.length * 14 + 6;
      }
    });
  }

  doc.save(`${plan.name || 'travel-plan'}.pdf`);
};
