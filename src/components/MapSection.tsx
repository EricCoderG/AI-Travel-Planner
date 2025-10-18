import { useEffect, useMemo, useRef } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import { useSettingsStore } from '../store/useSettingsStore';

declare global {
  interface Window {
    AMap?: any;
    _amap_loaded?: boolean;
  }
}

const parseCoordinate = (value?: string): [number, number] | null => {
  if (!value) {
    return null;
  }
  const parts = value.split(',').map((item) => Number(item.trim()));
  if (parts.length === 2 && parts.every((num) => Number.isFinite(num))) {
    const [first, second] = parts;
    const looksLikeLatFirst = Math.abs(first) <= 90 && Math.abs(second) <= 180;
    return looksLikeLatFirst ? [second, first] : [first, second];
  }
  return null;
};

const MapSection = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any | null>(null);
  const amapKey = useSettingsStore((state) => state.amapApiKey);
  const securityCode = useSettingsStore((state) => state.amapSecurityCode);
  const { plans, activePlanId } = usePlannerStore((state) => ({ plans: state.plans, activePlanId: state.activePlanId }));

  const activePlan = useMemo(() => plans.find((item) => item.id === activePlanId) ?? plans[0], [plans, activePlanId]);

  useEffect(() => {
    if (!amapKey || !containerRef.current) {
      return;
    }

    if (securityCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityCode
      };
    }

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window._amap_loaded) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
        script.async = true;
        script.onload = () => {
          window._amap_loaded = true;
          resolve();
        };
        script.onerror = () => reject(new Error('高德地图脚本加载失败'));
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (!window.AMap || !containerRef.current) {
          return;
        }
        mapRef.current = new window.AMap.Map(containerRef.current, {
          zoom: 10,
          viewMode: '2D'
        });
        mapRef.current.addControl(new window.AMap.Scale());
        mapRef.current.addControl(new window.AMap.ToolBar());
      })
      .catch((error) => console.error(error));
  }, [amapKey]);

  useEffect(() => {
    if (!mapRef.current || !window.AMap) {
      return;
    }
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!activePlan) {
      return;
    }

    const coordinates: [number, number][] = [];

    activePlan.days.forEach((day) => {
      day.items.forEach((item) => {
        const point = parseCoordinate(item.location);
        if (point) {
          const marker = new window.AMap.Marker({
            position: point,
            title: `${day.date} ${item.title}`
          });
          marker.setMap(mapRef.current);
          markersRef.current.push(marker);
          coordinates.push(point);
        }
      });
    });

    if (coordinates.length) {
      polylineRef.current = new window.AMap.Polyline({
        path: coordinates,
        strokeColor: '#2563eb',
        strokeWeight: 3,
        strokeOpacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round'
      });
      polylineRef.current.setMap(mapRef.current);
      mapRef.current.setFitView([...markersRef.current, polylineRef.current], false, [80, 80, 80, 80]);
    }
  }, [activePlan]);

  return (
    <section className="card map-section">
      <h2>地图概览</h2>
      {!amapKey && <p>请在设置中填写高德地图 API Key。</p>}
      {!!activePlan && !activePlan.days.length && <p>生成行程后将展示位置点。</p>}
      <p className="hint">若行程地点含经纬度（示例："116.3974, 39.9093"），将自动在地图上标记。</p>
      <div ref={containerRef} className="map-container" />
    </section>
  );
};

export default MapSection;
