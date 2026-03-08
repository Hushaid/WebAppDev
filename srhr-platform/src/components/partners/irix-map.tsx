"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

interface IrixMapScore {
  h3_index: string
  lat: number
  lng: number
  overall_irix_score: number
  overall_risk_level: string
  sti_avg_score: number | null
  maternal_avg_score: number | null
  community_wellbeing_avg_score: number | null
  submission_count: number
  hotspot_flag: boolean
}

interface IrixMapProps {
  scores: IrixMapScore[]
  onCellClick?: (score: IrixMapScore) => void
}

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
}

export function IrixMap({ scores, onCellClick }: IrixMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [7.49, 9.06], // Nigeria center (Abuja area)
      zoom: 8,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    map.current.on("load", () => setLoaded(true))

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map data when scores change
  useEffect(() => {
    if (!map.current || !loaded || scores.length === 0) return

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: scores.map((s) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s.lng, s.lat],
        },
        properties: {
          h3_index: s.h3_index,
          score: s.overall_irix_score,
          risk_level: s.overall_risk_level,
          sti_avg: s.sti_avg_score,
          maternal_avg: s.maternal_avg_score,
          community_avg: s.community_wellbeing_avg_score,
          submissions: s.submission_count,
          hotspot: s.hotspot_flag,
        },
      })),
    }

    const source = map.current.getSource("irix-scores") as mapboxgl.GeoJSONSource
    if (source) {
      source.setData(geojson)
    } else {
      map.current.addSource("irix-scores", {
        type: "geojson",
        data: geojson,
      })

      // Heatmap layer
      map.current.addLayer({
        id: "irix-heatmap",
        type: "heatmap",
        source: "irix-scores",
        maxzoom: 12,
        paint: {
          "heatmap-weight": ["get", "score"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "#22c55e",
            0.4, "#84cc16",
            0.6, "#eab308",
            0.8, "#f97316",
            1, "#ef4444",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 12, 40],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 1, 12, 0],
        },
      })

      // Circle layer (visible at higher zoom)
      map.current.addLayer({
        id: "irix-circles",
        type: "circle",
        source: "irix-scores",
        minzoom: 10,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "submissions"],
            1, 6,
            10, 12,
            50, 20,
          ],
          "circle-color": [
            "match",
            ["get", "risk_level"],
            "low", RISK_COLORS.low,
            "medium", RISK_COLORS.medium,
            "high", RISK_COLORS.high,
            "#6b7280",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": [
            "case",
            ["get", "hotspot"], 3,
            1,
          ],
          "circle-stroke-color": [
            "case",
            ["get", "hotspot"], "#ef4444",
            "#ffffff",
          ],
        },
      })

      // Click handler for circles
      map.current.on("click", "irix-circles", (e) => {
        if (!e.features?.[0]) return
        const props = e.features[0].properties
        if (props && onCellClick) {
          onCellClick({
            h3_index: props.h3_index,
            lat: (e.features[0].geometry as GeoJSON.Point).coordinates[1],
            lng: (e.features[0].geometry as GeoJSON.Point).coordinates[0],
            overall_irix_score: props.score,
            overall_risk_level: props.risk_level,
            sti_avg_score: props.sti_avg,
            maternal_avg_score: props.maternal_avg,
            community_wellbeing_avg_score: props.community_avg,
            submission_count: props.submissions,
            hotspot_flag: props.hotspot,
          })
        }
      })

      // Cursor change on hover
      map.current.on("mouseenter", "irix-circles", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer"
      })
      map.current.on("mouseleave", "irix-circles", () => {
        if (map.current) map.current.getCanvas().style.cursor = ""
      })
    }
  }, [scores, loaded, onCellClick])

  return (
    <figure
      ref={mapContainer}
      className="h-[500px] w-full rounded-lg border"
      aria-label="IRIX risk map"
    />
  )
}
