export default function StatsPanel({ tempNow, humNow, maxTemp, maxHum, fanRpm, connectionStatus }) {
  const formatValue = (value) => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "number") {
      return value.toFixed(1)
    }
    return value
  }

  return (
    <div className="space-y-4">
      {/* Current Readings */}
      <div className="space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
          <span className="text-slate-400 text-sm">Temperature</span>
          <span className="text-2xl font-bold text-cyan-400">{formatValue(tempNow)}°C</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
          <span className="text-slate-400 text-sm">Humidity</span>
          <span className="text-2xl font-bold text-purple-400">{formatValue(humNow)}%</span>
        </div>
      </div>

      {/* Max Values */}
      <div className="pt-3 space-y-2 border-t border-slate-700/50">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Max Temp</span>
          <span className="text-sm font-semibold text-slate-200">{formatValue(maxTemp)}°C</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Max Humidity</span>
          <span className="text-sm font-semibold text-slate-200">{formatValue(maxHum)}%</span>
        </div>
      </div>

      {/* Fan RPM */}
      <div className="pt-3 border-t border-slate-700/50">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Fan RPM</span>
          <span className="text-lg font-bold text-cyan-400">{fanRpm}</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="pt-3 border-t border-slate-700/50">
        <span className="text-slate-400 text-xs block mb-2">Connection</span>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            connectionStatus === "connected"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : connectionStatus === "connecting…" || connectionStatus === "reconnecting…"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-rose-500/50 bg-rose-500/10 text-rose-400"
          }`}
        >
          {connectionStatus}
        </span>
      </div>
    </div>
  )
}
