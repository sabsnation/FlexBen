import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler
} from 'chart.js'
import { formatChartCurrency, formatChartCompact } from '../../config/chartTheme.js'

let registered = false

export function ensureChartJs() {
  if (registered) return
  ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Filler
  )
  registered = true
}

export const chartFont = {
  family: 'Inter, system-ui, sans-serif',
  size: 12,
  weight: '500'
}

export const chartColors = {
  text: '#64748b',
  textStrong: '#1e293b',
  grid: '#e2e8f0',
  surface: '#f1f5f9'
}

export function currencyTooltipLabel(value) {
  return formatChartCurrency(value)
}

export function compactTooltipLabel(value) {
  return formatChartCompact(value)
}

export function basePlugins({ legend = false } = {}) {
  return {
    legend: {
      display: legend,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
        color: chartColors.text,
        font: { ...chartFont, size: 11, weight: '600' }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      titleFont: { ...chartFont, size: 12, weight: '700' },
      bodyFont: { ...chartFont, size: 11 },
      displayColors: true,
      boxPadding: 6
    }
  }
}

export function cartesianScales({ horizontal = false, currency = false } = {}) {
  const tickCallback = currency
    ? (v) => formatChartCompact(v)
    : undefined

  if (horizontal) {
    return {
      x: {
        beginAtZero: true,
        grid: { color: chartColors.grid, drawBorder: false },
        ticks: {
          color: chartColors.text,
          font: chartFont,
          callback: tickCallback,
          maxTicksLimit: 6
        },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: chartColors.textStrong, font: { ...chartFont, weight: '600' } },
        border: { display: false }
      }
    }
  }

  return {
    x: {
      grid: { display: false },
      ticks: { color: chartColors.textStrong, font: { ...chartFont, weight: '600' }, maxRotation: 0 },
      border: { display: false }
    },
    y: {
      beginAtZero: true,
      grid: { color: chartColors.grid, drawBorder: false },
      ticks: {
        color: chartColors.text,
        font: chartFont,
        callback: tickCallback,
        maxTicksLimit: 6
      },
      border: { display: false }
    }
  }
}
