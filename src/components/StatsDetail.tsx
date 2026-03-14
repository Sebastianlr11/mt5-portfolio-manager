import React from 'react';
import { PortfolioStats } from '../logic/types';

interface Props { stats: PortfolioStats }

/* ── Shared helpers ──────────────────────────────────────────────────────── */
const fmtUSD = (v: number, d = 2) =>
    `${v >= 0 ? '' : '-'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

type RowColor = 'green' | 'red' | 'neutral';

/* ── Section header ──────────────────────────────────────────────────────── */
const SectionHead: React.FC<{ title: string }> = ({ title }) => (
    <div className="px-4 py-2.5 border-b border-white/[0.05]">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/50">{title}</span>
    </div>
);

/* ── Table row ───────────────────────────────────────────────────────────── */
const Row: React.FC<{ label: string; value: string; color?: RowColor }> = ({ label, value, color = 'neutral' }) => {
    const vc = color === 'green' ? 'text-primary' : color === 'red' ? 'text-error' : 'text-white/80';
    return (
        <div className="flex items-center justify-between px-4 py-[7px] border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
            <span className="text-[11px] text-muted/55 font-medium">{label}</span>
            <span className={`text-[11px] font-bold tabular ${vc}`}>{value}</span>
        </div>
    );
};

/* ── Main component ──────────────────────────────────────────────────────── */
export const StatsDetail: React.FC<Props> = ({ stats }) => {
    const pos = (v: number): RowColor => v > 0 ? 'green' : v < 0 ? 'red' : 'neutral';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* ── Strategy ─────────────────────────────────────────────── */}
            <div className="chart-panel overflow-hidden">
                <SectionHead title="Strategy" />

                <Row label="Wins / Losses Ratio"
                     value={stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : '∞'}
                     color={stats.wins >= stats.losses ? 'green' : 'neutral'} />

                <Row label="Payout Ratio (Avg Win / Loss)"
                     value={stats.payoutRatio.toFixed(2)}
                     color={stats.payoutRatio >= 1 ? 'green' : 'neutral'} />

                <Row label="Expectativa (Avg Trade)"
                     value={fmtUSD(stats.avgTrade)}
                     color={pos(stats.avgTrade)} />

                <Row label="R Expectancy"
                     value={`${stats.rExpectancy.toFixed(2)} R`}
                     color={pos(stats.rExpectancy)} />

                <Row label="R Expectancy Score"
                     value={`${stats.rExpectancyScore.toFixed(2)} R`}
                     color={pos(stats.rExpectancyScore)} />

                <Row label="STR Quality Number"
                     value={stats.strQualityNumber.toFixed(2)}
                     color={stats.strQualityNumber >= 3 ? 'green' : stats.strQualityNumber >= 1.6 ? 'neutral' : 'neutral'} />

                <Row label="SQN Score (N≤100)"
                     value={stats.sqnScore.toFixed(2)}
                     color={stats.sqnScore >= 2 ? 'green' : stats.sqnScore >= 1 ? 'neutral' : 'red'} />

                <Row label="Z-Score"
                     value={stats.zScore.toFixed(2)} />

                <Row label="Z-Probability"
                     value={`${stats.zProbability.toFixed(1)}%`}
                     color={stats.zProbability >= 95 ? 'green' : 'neutral'} />

                <Row label="Desviación Estándar"
                     value={fmtUSD(stats.stdDev)} />

                <Row label="Estancamiento (días)"
                     value={`${stats.stagnationDays} días`}
                     color={stats.stagnationDays === 0 ? 'green' : 'neutral'} />

                <Row label="Estancamiento (%)"
                     value={`${stats.stagnationPct.toFixed(2)}%`} />

                <Row label="Return Anual / Max DD"
                     value={stats.annualReturnDDRatio.toFixed(2)}
                     color={stats.annualReturnDDRatio >= 3 ? 'green' : 'neutral'} />

                <Row label="Anual Promedio"
                     value={fmtUSD(stats.yearlyAvgProfit)}
                     color={pos(stats.yearlyAvgProfit)} />

                <Row label="Mensual Promedio"
                     value={fmtUSD(stats.monthlyAvgProfit)}
                     color={pos(stats.monthlyAvgProfit)} />

                <Row label="Diario Promedio"
                     value={fmtUSD(stats.dailyAvgProfit)}
                     color={pos(stats.dailyAvgProfit)} />
            </div>

            {/* ── Trades ───────────────────────────────────────────────── */}
            <div className="chart-panel overflow-hidden">
                <SectionHead title="Trades" />

                <Row label="# Ganadoras"
                     value={stats.wins.toLocaleString()}
                     color="green" />

                <Row label="# Perdedoras"
                     value={stats.losses.toLocaleString()}
                     color="red" />

                <Row label="Ganancia Bruta"
                     value={fmtUSD(stats.grossProfit)}
                     color="green" />

                <Row label="Pérdida Bruta"
                     value={`-${fmtUSD(stats.grossLoss)}`}
                     color="red" />

                <Row label="Ganancia Promedio"
                     value={fmtUSD(stats.avgWin)}
                     color="green" />

                <Row label="Pérdida Promedio"
                     value={`-${fmtUSD(stats.avgLoss)}`}
                     color="red" />

                <Row label="Mayor Ganancia"
                     value={fmtUSD(stats.largestWin)}
                     color="green" />

                <Row label="Mayor Pérdida"
                     value={`-${fmtUSD(stats.largestLoss)}`}
                     color="red" />

                <Row label="Profit Factor"
                     value={stats.profitFactor.toFixed(2)}
                     color={stats.profitFactor >= 1.5 ? 'green' : stats.profitFactor >= 1 ? 'neutral' : 'red'} />

                <Row label="Max Consec. Ganadoras"
                     value={`${stats.maxConsecWins}`}
                     color="green" />

                <Row label="Max Consec. Perdedoras"
                     value={`${stats.maxConsecLosses}`}
                     color="red" />

                <Row label="Avg Consec. Ganadoras"
                     value={stats.avgConsecWins.toFixed(2)}
                     color="green" />

                <Row label="Avg Consec. Perdedoras"
                     value={stats.avgConsecLosses.toFixed(2)}
                     color="red" />

                <Row label="Max Drawdown $"
                     value={fmtUSD(stats.maxDrawdown)}
                     color="red" />

                <Row label="Max Drawdown %"
                     value={`${stats.maxDrawdownPercent.toFixed(2)}%`}
                     color={stats.maxDrawdownPercent < 10 ? 'green' : stats.maxDrawdownPercent < 20 ? 'neutral' : 'red'} />
            </div>
        </div>
    );
};
