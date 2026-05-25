import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import { FaXmark } from 'react-icons/fa6';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import SensorMarker from '../map/SensorMarker';
import ReportMapUserPin, { getReportPickMarkerColor } from '../map/ReportMapUserPin';
import SearchAutoComplete from '../common/SearchAutoComplete';
import { Tooltip, TooltipTrigger } from '../common/HelpTooltip';
import { getSensorDisplayPosition } from '../../data/sensorOverrides';
import { statusColors } from '../../utils/constants';
import { getReporterAvatarUrl } from '../../utils/reporterAvatarUrl';
import { CancelButton, ConfirmButton } from '../common/Button';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function ReportLocationMapPopup({
  open,
  onClose,
  onCancel,
  onConfirm,
  mapRef,
  defaultLng,
  defaultLat,
  defaultZoom,
  mapCenter,
  formData,
  locationDescription,
  sensors,
  hoveredSensorId,
  setHoveredSensorId,
  onMapClick,
  onRemoveMarker,
  reporterDisplayName,
  reporterAvatarFileName,
  searchAddress,
  searchResults,
  searchingAddress,
  onSearchAddressChange,
  onCompleteAddressSearch,
  onSelectSearchResult
}) {
  const { t } = useTranslation();
  const [markerHovered, setMarkerHovered] = useState(false);
  const [markerRemoveMode, setMarkerRemoveMode] = useState(false);

  const avatarUrl = reporterAvatarFileName ? getReporterAvatarUrl(reporterAvatarFileName) : null;
  const markerColor = getReportPickMarkerColor(formData.level);
  const addressText =
    locationDescription ||
    (formData.lat != null && formData.lng != null
      ? t('newReport.latLngRaw', {
          lat: Number(formData.lat).toFixed(6),
          lng: Number(formData.lng).toFixed(6)
        })
      : '');

  const helpDescription =
    sensors.length > 0 ? t('newReport.sensorNote') : undefined;

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      map?.resize?.();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, mapRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') (onCancel ?? onClose)?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onCancel]);

  useEffect(() => {
    if (open) setMarkerRemoveMode(false);
  }, [open]);

  useEffect(() => {
    setMarkerRemoveMode(false);
  }, [formData.lat, formData.lng]);

  const handleMapClick = useCallback(
    (lng, lat) => {
      setHoveredSensorId(null);
      setMarkerRemoveMode(false);
      onMapClick(lng, lat);
    },
    [onMapClick, setHoveredSensorId]
  );

  const handleMarkerClick = useCallback(() => {
    if (markerRemoveMode) {
      onRemoveMarker?.();
      setMarkerRemoveMode(false);
      setMarkerHovered(false);
    } else {
      setMarkerRemoveMode(true);
      setMarkerHovered(false);
    }
  }, [markerRemoveMode, onRemoveMarker]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="create-report-map-popup"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) (onCancel ?? onClose)?.();
      }}
    >
      <div className="create-report-map-popup__panel" role="dialog" aria-modal="true">
        <button
          type="button"
          className="create-report-map-popup__close"
          onClick={onCancel ?? onClose}
          aria-label={t('newReport.closeMapBtn')}
        >
          <FaXmark aria-hidden />
        </button>

        <div className="create-report-map-popup__frame">
          <div className="create-report-map-popup__search">
            <SearchAutoComplete
              value={searchAddress}
              suggestions={searchResults}
              completeMethod={onCompleteAddressSearch}
              field="display_name"
              minLength={2}
              delay={400}
              placeholder={t('newReport.addressSearchPh')}
              className="create-report-map-popup__search-input w-full text-sm"
              inputClassName="create-report-map-popup__search-field"
              appendTo="self"
              onChange={(ev) => {
                const v = ev.value;
                onSearchAddressChange(typeof v === 'string' ? v : '');
              }}
              onSelect={(ev) => onSelectSearchResult(ev.value)}
            />
            {searchingAddress ? (
              <p className="create-report-map-popup__search-status">{t('newReport.searchingSuggest')}</p>
            ) : null}
          </div>

          {MAPBOX_TOKEN ? (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: mapCenter ? mapCenter[1] : defaultLng,
                latitude: mapCenter ? mapCenter[0] : defaultLat,
                zoom: mapCenter ? 16 : defaultZoom
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              onClick={(e) => {
                handleMapClick(e.lngLat.lng, e.lngLat.lat);
              }}
            >
              {sensors.map((item, index) => {
                const status = item.status || 'normal';
                const color = statusColors[status] || statusColors.normal;
                const sensorId = item.sensor_id || `sensor-${index}`;
                const isOnline = status !== 'offline';
                return (
                  <SensorMarker
                    key={sensorId}
                    item={item}
                    color={color}
                    isOnline={isOnline}
                    mode="report"
                    reportHoverId={sensorId}
                    hoveredSensorId={hoveredSensorId}
                    onHoverChange={setHoveredSensorId}
                    onZoomTo={() => {
                      const pos = getSensorDisplayPosition(item);
                      if (!pos) return;
                      const map = mapRef.current?.getMap?.() ?? mapRef.current;
                      if (map?.flyTo) map.flyTo({ center: [pos.lng, pos.lat], zoom: 16, duration: 800 });
                    }}
                  />
                );
              })}
              {formData.lat != null && formData.lng != null && (
                <>
                  <Marker longitude={formData.lng} latitude={formData.lat} anchor="bottom">
                    <ReportMapUserPin
                      mode={markerRemoveMode ? 'remove' : 'avatar'}
                      avatarUrl={avatarUrl}
                      displayName={reporterDisplayName}
                      markerColor={markerColor}
                      onClick={handleMarkerClick}
                      onMouseEnter={() => setMarkerHovered(true)}
                      onMouseLeave={() => setMarkerHovered(false)}
                      removeLabel={t('newReport.cancelLocationHover')}
                    />
                  </Marker>
                  {markerHovered && (markerRemoveMode || addressText) ? (
                    <Popup
                      longitude={formData.lng}
                      latitude={formData.lat}
                      anchor="bottom"
                      offset={[0, -58]}
                      closeButton={false}
                      closeOnClick={false}
                      className="create-report-map-popup__hover-popup"
                    >
                      <p className="create-report-map-popup__hover-addr">
                        {markerRemoveMode ? t('newReport.cancelLocationHover') : addressText}
                      </p>
                    </Popup>
                  ) : null}
                </>
              )}
            </Map>
          ) : (
            <div className="create-report-map-popup__empty">{t('newReport.mapboxMissingEnv')}</div>
          )}
        </div>

        <div className="create-report-map-popup__footer">
          <Tooltip title={t('newReport.mapClickMark')} description={helpDescription}>
            <TooltipTrigger
              className="create-report-map-popup__help-trigger"
              aria-label={t('newReport.mapHelpAria')}
            >
              <QuestionMarkCircleIcon className="create-report-map-popup__help-icon" aria-hidden />
            </TooltipTrigger>
          </Tooltip>

          <div className="create-report-map-popup__actions">
            <CancelButton onClick={onCancel ?? onClose}>{t('newReport.cancelBtn')}</CancelButton>
            <ConfirmButton onClick={onConfirm ?? onClose}>{t('newReport.mapConfirmBtn')}</ConfirmButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
