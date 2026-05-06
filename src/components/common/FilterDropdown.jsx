import { useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';

/**
 * Dropdown bộ lọc (PrimeReact). Mặc định **không** bật ô search trong panel (`filter={false}`).
 * Truyền `filter` nếu cần tìm trong danh sách dài.
 * `appendTo="self"` — panel đi theo nút; `closeOnScroll` — đóng khi scroll.
 */
export default function FilterDropdown({
  filter = false,
  filterDelay = 400,
  appendTo = 'self',
  closeOnScroll = true,
  className = '',
  panelClassName = '',
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!closeOnScroll) return undefined;
    const hide = () => {
      ref.current?.hide?.();
    };
    window.addEventListener('scroll', hide, true);
    const root = document.getElementById('root');
    if (root) root.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      if (root) root.removeEventListener('scroll', hide, true);
    };
  }, [closeOnScroll]);

  const mergedClass = ['filter-dropdown-root', className].filter(Boolean).join(' ');
  const mergedPanel = ['filter-dropdown-panel', panelClassName].filter(Boolean).join(' ');

  return (
    <Dropdown
      ref={ref}
      filter={filter}
      filterDelay={filterDelay}
      appendTo={appendTo}
      className={mergedClass}
      panelClassName={mergedPanel}
      {...rest}
    />
  );
}
