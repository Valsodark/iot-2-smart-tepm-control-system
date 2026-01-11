"use client"

import { useState, useEffect, useRef } from "react"
import TemperatureChart from "./temperature-chart"
import FanDisplay from "./fan-display"
import StatsPanel from "./stats-panel"
const WS_URL = "https://d50f72a6b18f.ngrok-free.app/ws"
const MAX_RPM = 120
const MAX_CHART_POINTS = 30

export default function Dashboard() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState("connecting…")

  // Chart data
  const [chartLabels, setChartLabels] = useState([])
  const [chartTempData, setChartTempData] = useState([])
  const [chartHumData, setChartHumData] = useState([])

  // Current readings
  const [tempNow, setTempNow] = useState(null)
  const [humNow, setHumNow] = useState(null)
  const [maxTemp, setMaxTemp] = useState(0)
  const [maxHum, setMaxHum] = useState(0)
  const [fanRpm, setFanRpm] = useState(0)

  // Fan state
  const [fanSpeed01, setFanSpeed01] = useState(0)
  const [coldAirOut, setColdAirOut] = useState(false)
  const [hotAirOut, setHotAirOut] = useState(false)

  // WebSocket ref
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  // Clear UI on disconnect
  const clearUI = () => {
    setTempNow(null)
    setHumNow(null)
    setMaxTemp(0)
    setMaxHum(0)
    setFanRpm(0)
    setChartLabels([])
    setChartTempData([])
    setChartHumData([])
    setFanSpeed01(0)
    setColdAirOut(false)
    setHotAirOut(false)
  }

  // WebSocket connection logic with auto-reconnect
  useEffect(() => {
    const connectWS = () => {
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      setConnectionStatus("connecting…")
      socketRef.current = new WebSocket(WS_URL)

      socketRef.current.onopen = () => {
        setConnectionStatus("connected")
        console.log("[v0] WebSocket connected:", WS_URL)
      }

      socketRef.current.onmessage = (event) => {
        // Parse incoming sensor data
        const data = JSON.parse(event.data)
        const timestamp = new Date().toLocaleTimeString()

        // Handle null/undefined values
        const t = data.temp === null || data.temp === undefined ? null : Number(data.temp)
        const h = data.humidity === null || data.humidity === undefined ? null : Number(data.humidity)
        const rpm = Number(data.rpm) || 0

        // Update current readings
        setTempNow(t)
        setHumNow(h)
        setFanRpm(rpm)

        // Update max values
        setMaxTemp((prev) => (t !== null && t > prev ? t : prev))
        setMaxHum((prev) => (h !== null && h > prev ? h : prev))

        // Update fan speed (0..1 scale)
        const speed = Math.max(0, Math.min(1, rpm / MAX_RPM))
        setFanSpeed01(speed)

        // Update air output state
        setColdAirOut(!!data.cold_air_out)
        setHotAirOut(!!data.hot_air_out)

        // Update chart data (keep last 30 points)
        setChartLabels((prev) => {
          const updated = [...prev, timestamp]
          return updated.length > MAX_CHART_POINTS ? updated.slice(-MAX_CHART_POINTS) : updated
        })

        setChartTempData((prev) => {
          const updated = [...prev, t]
          return updated.length > MAX_CHART_POINTS ? updated.slice(-MAX_CHART_POINTS) : updated
        })

        setChartHumData((prev) => {
          const updated = [...prev, h]
          return updated.length > MAX_CHART_POINTS ? updated.slice(-MAX_CHART_POINTS) : updated
        })
      }

      socketRef.current.onerror = (e) => {
        console.log("[v0] WebSocket error:", e)
      }

      socketRef.current.onclose = () => {
        console.log("[v0] WebSocket closed")
        setConnectionStatus("disconnected")
        clearUI()

        // Auto-reconnect after 1.2 seconds
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null
            setConnectionStatus("reconnecting…")
            connectWS()
          }, 1200)
        }
      }
    }

    connectWS()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Smart Climate Control</h1>
          <p className="text-slate-400">Real-time IoT monitoring system</p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Section - Spans 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Temperature & Humidity Trend</h2>
              <TemperatureChart labels={chartLabels} tempData={chartTempData} humData={chartHumData} />
            </div>
          </div>

          {/* Stats Panel - Right column */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
            <StatsPanel
              tempNow={tempNow}
              humNow={humNow}
              maxTemp={maxTemp}
              maxHum={maxHum}
              fanRpm={fanRpm}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>

        {/* Fan Simulation Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 backdrop-blur-sm shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-6">Fan Control & Air Output</h2>
          <FanDisplay fanSpeed01={fanSpeed01} coldAirOut={coldAirOut} hotAirOut={hotAirOut} />
        </div>
      </div>
    </div>
  )
}
