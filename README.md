# ⚡ MT5 Portfolio FUSER

Herramienta web para **fusionar, analizar y comparar** el rendimiento de múltiples estrategias de trading (EAs/bots) de MetaTrader 5. Carga reportes HTML del Strategy Tester, obtén métricas profesionales consolidadas y exporta informes listos para revisión.

---

## ✨ Features

- 📂 **Importación masiva** — Arrastra o selecciona múltiples reportes HTML de backtests MT5 simultáneamente
- 📊 **Dashboard en tiempo real** — Curva de equidad consolidada, drawdown y métricas clave con animaciones fluidas
- 🤖 **Análisis por bot** — Rendimiento individual de cada EA: profit, win rate, comisiones, swap
- 🔢 **Magic Number Mapping** — Reasigna Magic Numbers automáticamente cargando un archivo de mapeo
- 📅 **Tabla mensual** — Rendimiento mes a mes y acumulado anual (YTD) por año
- 🧮 **Métricas avanzadas** — Profit Factor, Sharpe Ratio, SQN, STR Quality, R-Expectancy, Z-Score, Recovery Factor, Stagnation y más
- 🔀 **Filtrado dinámico** — Activa/desactiva bots individuales para simular combinaciones de portafolio
- 📄 **Exportación HTML** — Genera un informe consolidado profesional descargable con todas las operaciones
- 🌐 **Soporte bilingüe** — Parsea reportes MT5 tanto en español como en inglés
- 🔤 **Decodificación inteligente** — Maneja automáticamente archivos UTF-8, UTF-16 LE y UTF-16 BE

---

## 🛠️ Stack / Tecnologías

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2.12-FF6384?style=flat-square)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-E91E63?style=flat-square&logo=framer&logoColor=white)

---

## 🚀 Cómo usar

1. **Exporta los reportes** desde MetaTrader 5: `Strategy Tester → Backtest → Guardar como HTML`
2. **Abre la app** en tu navegador
3. **Arrastra los archivos HTML** a la zona de drop (o usa el botón "Importar")
4. **Opcional:** Carga un archivo de mapeo de Magic Numbers para reasignar IDs
5. **Analiza** el dashboard: métricas, curva de equidad, tabla mensual y rendimiento por bot
6. **Filtra** activando/desactivando bots en el sidebar para probar combinaciones
7. **Exporta** el informe consolidado en HTML con el botón "Exportar"

---

## 💻 Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/Sebastianlr11/mt5-portfolio-manager.git
cd mt5-portfolio-manager

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

> Requiere **Node.js 18+** y **npm 9+**

---

## 📐 Arquitectura

```
src/
├── logic/
│   ├── types.ts        # Interfaces: Trade, PortfolioStats, EquityPoint, MonthlyPerf
│   ├── parser.ts       # Parser de reportes HTML MT5 + mapeo de Magic Numbers
│   ├── processor.ts    # Motor de cálculo: equidad, drawdown, métricas avanzadas
│   └── exporter.ts     # Generador de informe HTML consolidado
├── components/
│   ├── EquityChart.tsx  # Curva de equidad interactiva (Recharts)
│   ├── StatsGrid.tsx    # Grid de métricas con tarjetas animadas
│   ├── StatsDetail.tsx  # Detalle de estadísticas avanzadas
│   ├── MonthlyTable.tsx # Tabla de rendimiento mensual
│   └── BotList.tsx      # Sidebar con lista de bots/EAs
└── App.tsx              # Layout principal, drag & drop, estado global
```

---

## 📄 Licencia

[MIT](LICENSE) — Libre para uso personal y comercial.
