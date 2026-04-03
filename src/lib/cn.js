/**
 * Gộp class Tailwind / điều kiện. (Tương đương clsx nhẹ, không thêm dependency.)
 */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
