import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

export default function TemperatureChart({ labels, tempData, humData }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  // Create chart ONCE
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#06b6d4",
            pointBorderColor: "#0f172a",
            pointBorderWidth: 2,
          },
          {
            label: "Humidity (%)",
            data: [],
            borderColor: "#a78bfa",
            backgroundColor: "rgba(167, 139, 250, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#a78bfa",
            pointBorderColor: "#0f172a",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: {
          duration: 600,
          easing: "easeOutQuart",
        },
        transitions: {
          active: { animation: { duration: 200 } },
          resize: { animation: { duration: 0 } },
          show: { animations: { x: { from: 0 }, y: { from: 0 } } },
          hide: { animations: { x: { to: 0 }, y: { to: 0 } } },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#e2e8f0",
              font: { size: 12, weight: "500" },
              padding: 15,
              usePointStyle: true,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#94a3b8", font: { size: 11 } },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
          x: {
            ticks: { color: "#94a3b8", font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  // Update chart data smoothly (NO destroy)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.data.labels = labels
    chart.data.datasets[0].data = tempData
    chart.data.datasets[1].data = humData

    chart.update("active") // uses transition config above
  }, [labels, tempData, humData])

  return (
      <div className="w-full h-80">
        <canvas ref={canvasRef} />
      </div>
  )
}