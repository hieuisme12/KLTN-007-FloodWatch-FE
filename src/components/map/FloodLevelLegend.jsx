import React from 'react';
import { useTranslation } from 'react-i18next';
import { FLOOD_LEVELS, getFloodLevelLabel } from '../../utils/floodLevels';

export default function FloodLevelLegend({ style }) {
  const { t } = useTranslation();
  return (
    <div
      className="flood-level-legend"
      style={style}
      aria-label={t('mapView.crowdLegendTitle')}
    >
      <div className="flood-level-legend__title">{t('mapView.crowdLegendTitle')}</div>
      <ul className="flood-level-legend__list">
        {FLOOD_LEVELS.map((level) => (
          <li key={level.value} className="flood-level-legend__item">
            <span
              className="flood-level-legend__swatch"
              style={{ background: level.color }}
              aria-hidden
            />
            <span className="flood-level-legend__label">
              {getFloodLevelLabel(level.value, t)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
