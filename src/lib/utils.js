import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatLYD(value) {
  return Number(value || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' د.ل';
}

export function formatUSDT(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + ' USDT';
}

export function formatDate(value) {
  return new Date(value).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
}

export const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  failed: 'فاشل',
  refunded: 'مسترجع'
};

export const STATUS_COLORS = {
  pending: 'text-warning bg-warning/10',
  processing: 'text-warning bg-warning/10',
  completed: 'text-success bg-success/10',
  cancelled: 'text-zinc-400 bg-zinc-400/10',
  failed: 'text-danger bg-danger/10',
  refunded: 'text-zinc-400 bg-zinc-400/10'
};

export const TYPE_LABELS = {
  deposit: 'شحن',
  buy_usdt: 'شراء USDT',
  sell_usdt: 'بيع USDT',
  withdraw: 'سحب',
  admin_adjustment: 'تعديل إداري',
  referral_bonus: 'مكافأة إحالة',
  fee: 'رسوم'
};
