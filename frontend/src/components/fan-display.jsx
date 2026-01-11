"use client"

import { useEffect, useRef } from "react"

export default function FanDisplay({ fanSpeed01, coldAirOut, hotAirOut }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const lastTsRef = useRef(performance.now())
  const animationFrameRef = useRef(null)

  // Determine air state and LED color
  const isCold = coldAirOut
  const isHot = hotAirOut
  const airType = coldAirOut ? "Cold air" : hotAirOut ? "Hot air" : "Idle"
  const airHint = coldAirOut ? "Cooling mode active" : hotAirOut ? "Heating mode active" : "Comfort band / low fan"

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const maxRps = 3.0 // Max rotations per second

    // Draw fan function
    const drawFan = (angle) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Outer ring with glow effect
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 115, 0, Math.PI * 2)
      ctx.stroke()

      // Inner ring accent
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 125, 0, Math.PI * 2)
      ctx.stroke()

      // Hub with gradient
      const hubGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16)
      hubGradient.addColorStop(0, "rgba(100, 116, 139, 0.9)")
      hubGradient.addColorStop(1, "rgba(51, 65, 85, 0.9)")
      ctx.fillStyle = hubGradient
      ctx.beginPath()
      ctx.arc(cx, cy, 16, 0, Math.PI * 2)
      ctx.fill()

      // Blades with modern gradient
      for (let i = 0; i < 2; i++) {
        const rot = angle + (i * (Math.PI * 2)) / 2
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)

        // Blade gradient
        const bladeGradient = ctx.createLinearGradient(18, -30, 110, 30)
        bladeGradient.addColorStop(0, "rgba(6, 182, 212, 0.4)")
        bladeGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.7)")
        bladeGradient.addColorStop(1, "rgba(6, 182, 212, 0.4)")
        ctx.fillStyle = bladeGradient

        ctx.beginPath()
        ctx.moveTo(18, 0)
        ctx.quadraticCurveTo(70, -28, 110, 0)
        ctx.quadraticCurveTo(70, 28, 18, 0)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      // Center cap
      ctx.fillStyle = "rgba(30, 41, 59, 0.95)"
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fill()
    }

    // Animation loop
    const animate = (ts) => {
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      // Map speed 0..1 to rotations/sec
      const rps = maxRps * fanSpeed01
      angleRef.current -= Math.PI * 2 * rps * dt

      drawFan(angleRef.current)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [fanSpeed01])

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-12">
      {/* Fan Canvas */}
      <div className="flex-shrink-0">
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="border border-slate-700/50 rounded-2xl bg-gradient-to-br from-slate-700/30 to-slate-800/30"
        />
      </div>

      {/* Air Output Indicator */}
      <div className="flex flex-col items-center gap-6 min-w-max">
        {/* LED Light with glow */}
        <div className="flex items-center justify-center">
          <div
            className={`w-8 h-8 rounded-full transition-all duration-300 ${
              isCold
                ? "bg-cyan-500 shadow-2xl shadow-cyan-500/50"
                : isHot
                  ? "bg-red-500 shadow-2xl shadow-red-500/50"
                  : "bg-slate-600 shadow-lg shadow-slate-600/30"
            }`}
          />
        </div>

        {/* Air Type Label */}
        <div className="text-xl font-bold text-white text-center">{airType}</div>

        {/* Status Description */}
        <div className="text-sm text-slate-400 text-center">{airHint}</div>

        {/* RPM Display */}
        <div className="mt-2 px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <span className="text-xs text-slate-300">Fan Speed: </span>
          <span className="text-sm font-semibold text-cyan-400">{Math.round(fanSpeed01 * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
