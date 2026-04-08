import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import Customreport from "../../components/common/elements/Customreport";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_indiaLow from "@amcharts/amcharts5-geodata/indiaLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

// Common Indian city coordinates mapping
const LOCATION_COORDINATES = {
  "bangalore": { latitude: 12.9716, longitude: 77.5946 },
  "bengaluru": { latitude: 12.9716, longitude: 77.5946 },
  "mumbai": { latitude: 19.0760, longitude: 72.8777 },
  "delhi": { latitude: 28.6139, longitude: 77.2090 },
  "hyderabad": { latitude: 17.3850, longitude: 78.4867 },
  "chennai": { latitude: 13.0827, longitude: 80.2707 },
  "kolkata": { latitude: 22.5726, longitude: 88.3639 },
  "pune": { latitude: 18.5204, longitude: 73.8567 },
  "ahmedabad": { latitude: 23.0225, longitude: 72.5714 },
  "jaipur": { latitude: 26.9124, longitude: 75.7873 },
  "surat": { latitude: 21.1702, longitude: 72.8311 },
  "lucknow": { latitude: 26.8467, longitude: 80.9462 },
  "kanpur": { latitude: 26.4499, longitude: 80.3319 },
  "nagpur": { latitude: 21.1458, longitude: 79.0882 },
  "indore": { latitude: 22.7196, longitude: 75.8577 },
  "thane": { latitude: 19.2183, longitude: 72.9781 },
  "bhilai": { latitude: 21.1938, longitude: 81.3509 },
  "chhattishgarh": { latitude: 21.1938, longitude: 81.3509 },
  "rajasthan": { latitude: 27.0238, longitude: 74.2179 },
  "simla": { latitude: 31.1048, longitude: 77.1734 },
  "shimla": { latitude: 31.1048, longitude: 77.1734 },
};

// Helper function to get coordinates for a location name
const getLocationCoordinates = (locationName) => {
  if (!locationName) return null;
  const normalizedName = locationName.toLowerCase().trim();

  // Try exact match first
  if (LOCATION_COORDINATES[normalizedName]) {
    return LOCATION_COORDINATES[normalizedName];
  }

  // Try partial match
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return coords;
    }
  }

  // Default to center of India if not found
  return { latitude: 20.5937, longitude: 78.9629 };
};

function AmChartsMap({ locations }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);

    // Hide amCharts logo
    if (root._logo) root._logo.dispose();

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: "none",
        panY: "none",
        wheelX: "none",
        wheelY: "none",
        projection: am5map.geoMercator(),
        maskContent: false,
      }),
    );

    // Create main polygon series for India
    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_indiaLow,
        fill: am5.color(0x374151), // Slate-700
        stroke: am5.color(0x6b7280), // Slate-500
      }),
    );

    polygonSeries.mapPolygons.template.setAll({
      interactive: true,
      fillOpacity: 0.9,
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: am5.color(0x1f2937), // Slate-800
    });

    // Create point series for location markers
    const pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));

    pointSeries.bullets.push((root, series, dataItem) => {
      const container = am5.Container.new(root, {});

      const tooltip = am5.Tooltip.new(root, {
        getFillFromSprite: false,
        autoTextColor: false,
        pointerOrientation: "vertical",
        dy: -10,
      });
      tooltip.get("background").setAll({
        fill: am5.color(0x1e293b),
        fillOpacity: 0.95,
        strokeWidth: 0,
        cornerRadius: 6,
        shadowBlur: 8,
        shadowColor: am5.color(0x000000),
        shadowOffsetY: 2,
        shadowOpacity: 0.3,
      });
      tooltip.label.setAll({
        fill: am5.color(0xffffff),
        fontSize: 13,
        fontWeight: "500",
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 10,
        paddingRight: 10,
      });

      const circle = container.children.push(
        am5.Circle.new(root, {
          radius: 5,
          fill: am5.color(0x3b82f6), // blue-500
          strokeWidth: 2,
          stroke: am5.color(0xffffff),
          tooltipText: "{city}: {hours} ({percentage}%)",
          tooltip: tooltip,
        }),
      );

      // Pulse animation for markers
      circle.animate({
        key: "scale",
        from: 1,
        to: 1.5,
        duration: 1500,
        easing: am5.ease.circle,
        loops: Infinity,
      });

      return am5.Bullet.new(root, {
        sprite: container,
      });
    });

    // Prepare location data with coordinates
    const mapData = locations
      .map((loc) => {
        const coords = getLocationCoordinates(loc.name);
        if (!coords) return null;
        return {
          city: loc.name,
          hours: loc.hours,
          percentage: loc.percentage,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      })
      .filter(Boolean);

    pointSeries.data.setAll(mapData);

    // Zoom to fit India
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [locations]);

  if (!locations || locations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
        {/* No data available - translated in parent */}
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-full" />;
}

export default function LocationPerformance({
  title,
  data = { rows: [] },
  loading = false,
  report,
  filter,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("locPerform");
  const rows = data?.rows || [];

  return (
    <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 p-4 sm:p-6 w-full max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
              {resolvedTitle}
            </h2>
            {report}
          </div>

          {/* ── Tabs + Filter ── */}
          {filter && <div className="mb-5">{filter}</div>}

          {/* ── Content: Map + List ── */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Map */}
            <div
              className="w-full sm:w-72 shrink-0 bg-slate-800 rounded-xl relative"
              style={{ minHeight: 300, zIndex: 10 }}
            >
              <div className="w-full h-72 p-2">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    {t("loadingText")}
                  </div>
                ) : (
                  <AmChartsMap locations={rows} />
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 w-full">
              {/* Column headers */}
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-slate-500 text-xs font-medium">
                  {t("default")}
                </span>
                <span className="text-slate-500 text-xs font-medium">
                  {t("timePercentage")}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {t("loadingText")}
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {t("noDataAvailable")}
                </div>
              ) : (
                <div className="divide-y divide-dashed divide-slate-200">
                  {rows.map((item, i) => (
                    <div
                      key={`${item.name}-${i}`}
                      className="flex items-center justify-between py-3.5 px-1 hover:bg-slate-50/60 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin size={16} className="text-blue-500 shrink-0" />
                        <span className="text-slate-700 font-medium text-sm">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-blue-500 font-semibold text-sm">
                          {item.hours}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
