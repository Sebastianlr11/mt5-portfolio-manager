import React from 'react';
import { TrendingUp, TrendingDown, Target, Shield, Activity, BarChart2, Percent, Calendar, DollarSign, Zap } from 'lucide-react';
import { PortfolioStats } from '../logic/types';
import { motion } from 'framer-motion';

interface Props { stats: PortfolioStats }

const fmtUSD  = (v: number, decimals = 2) =>
    `${v >= 0 ? '' : '-'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const fmtShort = (v: number) => {
    const abs = Math.abs(v);
    const str = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2)}M`
              : abs >= 1_000     ? `${(abs / 1_000).toFixed(1)}k`
              : abs.toFixed(2);
    return `${v >= 0 ? '' : '-'}$${str}`;
};

/* ── Single metric card ───────────────────────────────────────────────────── */
interface CardProps {
    label: string;
    value: string;
    sub?: string;
    accent: string;       // tailwind color token key
    delay?: number;
}

const ACCENTS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    green:  { text: 'text-primary',   bg: 'bg-primary/10',   border: 'border-primary/20',   glow: 'rgba(16,185,129,0.18)' },
    blue:   { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', glow: 'rgba(74,142,245,0.14)' },
    red:    { text: 'text-error',     bg: 'bg-error/10',     border: 'border-error/20',     glow: 'rgba(239,68,68,0.14)' },
    amber:  { text: 'text-warning',   bg: 'bg-warning/10',   border: 'border-warning/20',   glow: 'rgba(245,158,11,0.14)' },
    slate:  { text: 'text-muted',     bg: 'bg-white/5',      border: 'border-white/8',      glow: 'transparent' },
    violet: { text: 'text-violet-400',bg: 'bg-violet-500/10',border: 'border-violet-500/20',glow: 'rgba(139,92,246,0.14)' },
    cyan:   { text: 'text-cyan-400',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20',  glow: 'rgba(6,182,212,0.14)' },
};

const Card: React.FC<CardProps & { icon: React.ElementType }> = ({ label, value, sub, accent, delay = 0, icon: Icon }) => {
    const c = ACCENTS[accent] ?? ACCENTS.slate;
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, ease: [0.21, 1.02, 0.73, 1] }}
            className="stat-card group cursor-default relative"
        >
            {/* Top accent bar */}
            <div
                className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${c.glow.replace('0.18','0.7').replace('0.14','0.6')}, transparent)` }}
            />
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted/60 leading-none">
                    {label}
                </span>
            </div>
            <p className={`text-xl font-black tabular leading-none tracking-tight mb-1.5 ${c.text}`}>
                {value}
            </p>
            {sub && <p className="text-[10px] font-medium text-muted/50 tabular">{sub}</p>}
        </motion.div>
    );
};

/* ── Main grid ───────────────────────────────────────────────────────────── */
export const StatsGrid: React.FC<Props> = ({ stats }) => {
    const pos = stats.totalProfit >= 0;
    const pf  = stats.profitFactor;

    return (
        <div className="space-y-3">
            {/* Row 1: Hero profit + 5 key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

                {/* Hero: Total Profit */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0, ease: [0.21, 1.02, 0.73, 1] }}
                    className="stat-card relative lg:col-span-1"
                >
                    <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl"
                        style={{ background: pos ? 'linear-gradient(90deg,transparent,rgba(16,185,129,0.7),transparent)' : 'linear-gradient(90deg,transparent,rgba(239,68,68,0.7),transparent)' }} />
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pos ? 'bg-primary/10 border border-primary/20' : 'bg-error/10 border border-error/20'}`}>
                            {pos ? <TrendingUp className="w-3.5 h-3.5 text-primary" /> : <TrendingDown className="w-3.5 h-3.5 text-error" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted/60">Beneficio Neto</span>
                    </div>
                    <p className={`text-2xl font-black tabular tracking-tight leading-none ${pos ? 'text-primary' : 'text-error'}`}>
                        {fmtUSD(stats.totalProfit)}
                    </p>
                    <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] text-muted/50 tabular">
                            Año: {fmtShort(stats.yearlyAvgProfit)}
                        </p>
                        <p className="text-[10px] text-muted/40 tabular">
                            {stats.tradingDays}d · {stats.totalTrades.toLocaleString()} trades
                        </p>
                    </div>
                </motion.div>

                <Card label="# Operaciones"  value={stats.totalTrades.toLocaleString()} sub={`${stats.wins}W · ${stats.losses}L`}  accent="slate"  delay={0.04} icon={BarChart2} />
                <Card label="Profit Factor"  value={pf.toFixed(2)}  sub={pf>=1.5?'Excelente':pf>=1?'Aceptable':'Bajo'}  accent={pf>=1.5?'green':pf>=1?'amber':'red'} delay={0.08} icon={Target} />
                <Card label="Win Rate"       value={`${stats.winRate.toFixed(1)}%`}   sub={`${stats.wins} ganadoras`}  accent={stats.winRate>=55?'green':stats.winRate>=45?'amber':'red'} delay={0.12} icon={Percent} />
                <Card label="Return / DD"    value={stats.recoveryFactor.toFixed(2)}  sub={stats.recoveryFactor>=5?'Excelente':stats.recoveryFactor>=2?'Sólido':'Moderado'} accent={stats.recoveryFactor>=3?'green':'blue'} delay={0.16} icon={Activity} />
                <Card label="Sharpe Ratio"   value={stats.sharpeRatio.toFixed(2)}     sub={stats.sharpeRatio>=1?'Eficiente':'Volátil'} accent={stats.sharpeRatio>=1?'green':'amber'} delay={0.20} icon={Zap} />
            </div>

            {/* Row 2: Drawdown + time-based */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card label="Max Drawdown $"  value={fmtUSD(stats.maxDrawdown)}  sub={`${stats.maxDrawdownPercent.toFixed(2)}% del pico`} accent={stats.maxDrawdownPercent<10?'green':stats.maxDrawdownPercent<20?'amber':'red'} delay={0.05} icon={Shield} />
                <Card label="Estancamiento"   value={`${stats.stagnationDays}d`} sub={`${stats.stagnationPct.toFixed(2)}% del período`} accent="slate" delay={0.08} icon={Calendar} />
                <Card label="Promedio Diario"  value={fmtUSD(stats.dailyAvgProfit)}   sub="por día calendario" accent="slate"  delay={0.11} icon={DollarSign} />
                <Card label="Prom. Mensual"   value={fmtShort(stats.monthlyAvgProfit)} sub="por mes"           accent="blue"   delay={0.14} icon={DollarSign} />
                <Card label="Avg Trade"       value={fmtUSD(stats.avgTrade)}     sub="expectativa"           accent={stats.avgTrade>=0?'green':'red'} delay={0.17} icon={Target} />
                <Card label="Std Desviación"  value={fmtUSD(stats.stdDev)}       sub="dispersión"            accent="slate"  delay={0.20} icon={Activity} />
            </div>

            {/* Row 3: Advanced metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card label="STR Quality"       value={stats.strQualityNumber.toFixed(2)} sub={sqnLabel(stats.strQualityNumber)}  accent={stats.strQualityNumber>=3?'green':stats.strQualityNumber>=1.6?'amber':'slate'} delay={0.04} icon={Zap} />
                <Card label="SQN (N≤100)"       value={stats.sqnScore.toFixed(2)}         sub={sqnLabel(stats.sqnScore)}          accent={stats.sqnScore>=2?'green':stats.sqnScore>=1?'amber':'slate'}               delay={0.07} icon={Zap} />
                <Card label="R Expectancy"      value={`${stats.rExpectancy.toFixed(2)} R`} sub="expectativa por R"              accent={stats.rExpectancy>=0?'cyan':'red'}  delay={0.10} icon={Target} />
                <Card label="Z-Score"           value={stats.zScore.toFixed(2)}           sub={`${stats.zProbability.toFixed(1)}% no-random`} accent="violet" delay={0.13} icon={Activity} />
                <Card label="Payout Ratio"      value={stats.payoutRatio.toFixed(2)}      sub="avg Win / avg Loss"               accent={stats.payoutRatio>=1?'green':'amber'} delay={0.16} icon={BarChart2} />
                <Card label="Anual / MaxDD"     value={stats.annualReturnDDRatio.toFixed(2)} sub="beneficio anual ÷ DD"          accent={stats.annualReturnDDRatio>=5?'green':stats.annualReturnDDRatio>=2?'blue':'slate'} delay={0.19} icon={Shield} />
            </div>
        </div>
    );
};

function sqnLabel(sqn: number): string {
    if (sqn >= 5)  return 'Holy Grail';
    if (sqn >= 3)  return 'Excelente';
    if (sqn >= 2)  return 'Bueno';
    if (sqn >= 1)  return 'Aceptable';
    return 'Bajo';
}
