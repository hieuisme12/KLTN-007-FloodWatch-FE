import { useEffect } from 'react';

export const MAP_LAYOUT_EVENT = 'floodsight:map-layout';

function tryResize(mapRef) {
  const map = mapRef?.current?.getMap?.();
  if (map && typeof map.resize === 'function') {
    try {
      map.resize();
    } catch {
      // ignore
    }
  }
}

/**
 * Gọi Mapbox `resize()` khi container đổi kích thước (sidebar, panel, cửa sổ).
 * Dùng với ref của react-map-gl `<Map ref={mapRef} />` và ref của phần tử bao có width/height thật.
 */
export function useMapboxGlResize(mapRef, containerRef) {
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return undefined;

    const schedule = () => {
      requestAnimationFrame(() => tryResize(mapRef));
    };

    schedule();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule);
      ro.observe(el);
    }

    const onWin = () => schedule();
    window.addEventListener('resize', onWin);
    window.addEventListener(MAP_LAYOUT_EVENT, onWin);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onWin);
      window.removeEventListener(MAP_LAYOUT_EVENT, onWin);
    };
  }, [mapRef, containerRef]);
}
