import React from 'react';
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { EquityPoint } from '../logic/types';

interface Props { data: EquityPoint[] }

const EQUITY_COLOR = '#10b981';

/* ── Formatters ──────────────────────────────────────────────────────────── */
const fmtUSD = (v: number): string => {
    const abs = Math.abs(v);
    const str = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}M`
              : abs >= 1_000     ? `$${(abs / 1_000).toFixed(0)}k`
              : `$${abs.toFixed(0)}`;
    return v < 0 ? `-${str}` : str;
};

/* ── Custom X-axis tick ───────────────────────────────────────────────────── */
const XTick = ({ x, y, payload }: any) => (
    <text
        x={x} y={y + 13}
        textAnchor="middle"
        fill="rgba(71,85,105,0.75)"
        fontSize={10}
        fontFamily="system-ui, -apple-system, sans-serif"
    >
        {payload.value}
    </text>
);

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
const EquityTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const eq  = payload.find((p: any) => p.dataKey === 'equity');
    const pnl = payload.find((p: any) => p.dataKey === 'profit');
    const dd  = payload.find((p: any) => p.dataKey === 'drawdownPct');
    if (!eq) return null;

    return (
        <div style={{
            background: 'rgba(6, 11, 18, 0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '12px 16px',
            minWidth: 195,
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        }}>
            <p style={{
                color: 'rgba(148,163,184,0.5)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                {eq.payload?.time ?? ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <TRow label="Equity"
                      value={`$${eq.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      color={EQUITY_COLOR} />
                {dd && (
                    <TRow label="Drawdown"
                          value={`-${Math.abs(dd.value).toFixed(2)}%`}
                          color="rgba(224,82,82,0.85)" />
                )}
                {pnl && (
                    <TRow label="P&L Trade"
                          value={`${pnl.value >= 0 ? '+' : ''}$${pnl.value.toFixed(2)}`}
                          color={pnl.value >= 0 ? EQUITY_COLOR : 'rgba(224,82,82,0.85)'} />
                )}
            </div>
        </div>
    );
};

const TRow = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
        <span style={{ color: 'rgba(148,163,184,0.55)', fontSize: 11 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
);

/* ── Main chart ──────────────────────────────────────────────────────────── */
export const EquityChart: React.FC<Props> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted/30 text-sm font-medium">
                Sin datos — carga archivos de backtest
            </div>
        );
    }

    const equities    = data.map(d => d.equity);
    const eMin        = Math.min(...equities);
    const eMax        = Math.max(...equities);
    const ePad        = (eMax - eMin) * 0.08 || 10;
    const tickInterval = Math.max(1, Math.floor(data.length / 7));

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 12, right: 48, left: 4, bottom: 4 }}
                >
                    <defs>
                        <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={EQUITY_COLOR} stopOpacity={0.22} />
                            <stop offset="75%"  stopColor={EQUITY_COLOR} stopOpacity={0.04} />
                            <stop offset="100%" stopColor={EQUITY_COLOR} stopOpacity={0.00} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 7"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                    />

                    <YAxis
                        orientation="left"
                        stroke="transparent"
                        tick={{ fill: 'rgba(71,85,105,0.85)', fontSize: 10, fontFamily: 'system-ui, sans-serif' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmtUSD}
                        domain={[eMin - ePad, eMax + ePad]}
                        width={54}
                    />

                    <XAxis
                        dataKey="time"
                        tick={<XTick />}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                        interval={tickInterval}
                    />

                    <Tooltip
                        content={<EquityTooltip />}
                        cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />

                    <ReferenceLine
                        y={0}
                        stroke="rgba(255,255,255,0.05)"
                        strokeDasharray="4 6"
                    />

                    {/* Equity area */}
                    <Area
                        type="monotoneX"
                        dataKey="equity"
                        stroke={EQUITY_COLOR}
                        strokeWidth={1.8}
                        fill="url(#gradEq)"
                        dot={false}
                        activeDot={{ r: 4, fill: EQUITY_COLOR, stroke: '#060b12', strokeWidth: 2 }}
                        isAnimationActive={data.length < 2000}
                        animationDuration={800}
                    />

                    {/* Hidden series — keeps drawdown & P&L in tooltip payload */}
                    <Line dataKey="drawdownPct" hide dot={false} />
                    <Line dataKey="profit"      hide dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
