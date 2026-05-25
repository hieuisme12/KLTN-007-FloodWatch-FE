import { useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';

/**
 * Dropdown bộ lọc (PrimeReact). Mặc định **không** bật ô search trong panel (`filter={false}`).
 * Truyền `filter` nếu cần tìm trong danh sách dài.
 */
export default function FilterDropdown({
  filter = false,
  filterDelay = 400,
  appendTo = document.body,
  className = '',
  panelClassName = '',
  ...rest
}) {
  const ref = useRef(null);

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
