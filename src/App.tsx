import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
    Zap, Upload, Download, FileText, TrendingUp, TrendingDown,
    Map as MapIcon, Trash2, CheckCircle2, AlertCircle, Loader2,
    Bot, Settings2, X, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, BotMapping } from './logic/types';
import { parseMT5Report, parseMapping, decodeFile } from './logic/parser';
import { processPortfolio } from './logic/processor';
import { generateConsolidatedReport } from './logic/exporter';
import { EquityChart } from './components/EquityChart';
import { StatsGrid } from './components/StatsGrid';
import { StatsDetail } from './components/StatsDetail';
import { MonthlyTable } from './components/MonthlyTable';
import { BotList } from './components/BotList';

type Toast = { id: number; msg: string; type: 'ok' | 'err' };

export default function App() {
    const [trades,       setTrades]       = useState<Trade[]>([]);
    const [mapping,      setMapping]      = useState<globalThis.Map<string, BotMapping>>(new globalThis.Map());
    const [excludedBots, setExcludedBots] = useState<Set<string>>(new Set());
    const [processing,   setProcessing]   = useState(false);
    const [isDragOver,   setIsDragOver]   = useState(false);
    const [toasts,       setToasts]       = useState<Toast[]>([]);
    const toastId = useRef(0);

    // ── Derived ───────────────────────────────────────────────────────────────
    const filteredTrades = useMemo(
        () => trades.filter(t => !excludedBots.has(t.botName)),
        [trades, excludedBots]
    );

    const { processedTrades, stats, equityCurve } = useMemo(() => {
        const r = processPortfolio(filteredTrades, mapping);
        return { processedTrades: r.trades, stats: r.stats, equityCurve: r.equityCurve };
    }, [filteredTrades, mapping]);

    const allBotNames = useMemo(
        () => Array.from(new Set(trades.map(t => t.botName))),
        [trades]
    );

    const activeBots = allBotNames.length - excludedBots.size;

    // ── Toasts ────────────────────────────────────────────────────────────────
    const toast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
    }, []);

    // ── File processing ───────────────────────────────────────────────────────
    const processFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setProcessing(true);
        const incoming: Trade[] = [];

        for (const file of Array.from(files)) {
            try {
                const content = await decodeFile(file);
                const lower   = content.toLowerCase();
                const isBacktest =
                    lower.includes('informe del probador') ||
                    lower.includes('strategy tester report') ||
                    lower.includes('transacciones');

                if (isBacktest) {
                    const parsed = parseMT5Report(content, file.name);
                    if (parsed.length > 0) incoming.push(...parsed);
                    else toast(`Sin operaciones: ${file.name}`, 'err');
                } else {
                    const newMap = parseMapping(content);
                    if (newMap.size > 0) {
                        setMapping(newMap);
                        toast(`Magic Map cargado · ${newMap.size} bots`, 'ok');
                    } else {
                        toast(`No se reconoció: ${file.name}`, 'err');
                    }
                }
            } catch {
                toast(`Error al procesar: ${file.name}`, 'err');
            }
        }

        if (incoming.length > 0) {
            setTrades(prev => [...prev, ...incoming]);
            const bots = new Set(incoming.map(t => t.botName)).size;
            toast(`${incoming.length} operaciones · ${bots} bot${bots !== 1 ? 's' : ''}`, 'ok');
        }
        setProcessing(false);
    }, [toast]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
        e.target.value = '';
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        processFiles(e.dataTransfer.files);
    };

    const toggleBot = useCallback((name: string) => {
        setExcludedBots(prev => {
            const n = new Set(prev);
            n.has(name) ? n.delete(name) : n.add(name);
            return n;
        });
    }, []);

    const clearAll = () => { setTrades([]); setExcludedBots(new Set()); };
    const hasData  = trades.length > 0;

    return (
        <div className="h-screen bg-background text-text flex flex-col overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 h-14 glass border-b border-white/[0.06] px-5 flex items-center justify-between gap-4 z-50">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-green">
                        <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="leading-none">
                        <div className="text-[15px] font-black tracking-tight text-white">
                            MT5 Portfolio <span className="text-primary">FUSER</span>
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted/40 mt-0.5">
                            Quantum Trading Engine
                        </div>
                    </div>
                </div>

                {/* Summary pill (only when data loaded) */}
                {hasData && (
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-surface2 rounded-full border border-white/[0.06] text-xs font-semibold text-muted">
                        <span className={`font-black tabular ${stats.totalProfit >= 0 ? 'text-primary' : 'text-error'}`}>
                            {stats.totalProfit >= 0 ? '+' : '-'}${Math.abs(stats.totalProfit).toFixed(2)}
                        </span>
                        <span className="text-white/10">·</span>
                        <span>{stats.totalTrades} trades</span>
                        <span className="text-white/10">·</span>
                        <span>{activeBots}/{allBotNames.length} bots</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-2 h-8 px-4 rounded-lg border text-xs font-bold cursor-pointer transition-all
                        ${processing
                            ? 'bg-surface2 border-border text-muted cursor-not-allowed'
                            : 'bg-surface2 border-border hover:border-primary/40 hover:text-primary text-muted'
                        }`}>
                        {processing
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Upload className="w-3.5 h-3.5" />
                        }
                        Importar
                        <input type="file" multiple accept=".html,.htm" className="hidden"
                            onChange={handleFileInput} disabled={processing} />
                    </label>

                    <button
                        onClick={() => { generateConsolidatedReport(processedTrades, stats); toast('Informe exportado', 'ok'); }}
                        disabled={!hasData}
                        className="flex items-center gap-2 h-8 px-4 rounded-lg bg-primary text-background text-xs font-black transition-all
                            hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-glow-green"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Exportar
                    </button>

                    {hasData && (
                        <button onClick={clearAll}
                            className="h-8 w-8 rounded-lg border border-border hover:border-error/40 hover:bg-error/8 flex items-center justify-center transition-all group"
                            title="Limpiar todo">
                            <Trash2 className="w-3.5 h-3.5 text-muted/40 group-hover:text-error transition-colors" />
                        </button>
                    )}
                </div>
            </header>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className="w-64 flex-shrink-0 flex flex-col bg-surface/40 border-r border-white/[0.05] overflow-hidden">

                    {/* Magic Map section */}
                    <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.05]">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted/50">
                                <MapIcon className="w-3 h-3" />
                                Magic Map
                            </span>
                            {mapping.size > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                                    {mapping.size}
                                </span>
                            )}
                        </div>
                        <label className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border
                            ${mapping.size > 0
                                ? 'border-secondary/20 bg-secondary/5 text-secondary/80 hover:bg-secondary/10'
                                : 'border-dashed border-white/10 text-muted/40 hover:text-muted/70 hover:border-white/20'
                            }`}>
                            {mapping.size > 0
                                ? <><CheckCircle2 className="w-3 h-3" /> Cargado · actualizar</>
                                : <><Upload className="w-3 h-3" /> Cargar mapeo</>
                            }
                            <input type="file" accept=".html,.htm,.csv,.json" className="hidden" onChange={handleFileInput} />
                        </label>
                    </div>

                    {/* Systems header */}
                    <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3.5 pb-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted/50">
                            <Bot className="w-3 h-3" />
                            Sistemas
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70 border border-primary/15">
                                {activeBots}/{allBotNames.length}
                            </span>
                            {excludedBots.size > 0 && (
                                <button onClick={() => setExcludedBots(new Set())}
                                    className="text-[9px] font-bold text-muted/40 hover:text-primary transition-colors uppercase tracking-wide">
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bot list */}
                    <div className="flex-1 overflow-hidden flex flex-col px-2 pb-4">
                        <BotList
                            botStats={stats.botStats}
                            excludedBots={excludedBots}
                            onToggle={toggleBot}
                        />
                    </div>
                </aside>

                {/* ── Main ──────────────────────────────────────────────────── */}
                <main
                    className="flex-1 overflow-y-auto custom-scrollbar"
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                >
                    {/* Drag overlay */}
                    <AnimatePresence>
                        {isDragOver && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
                                style={{ background: 'rgba(0,214,143,0.04)' }}
                            >
                                <div className="border-2 border-dashed border-primary/40 rounded-3xl p-16 text-center">
                                    <Upload className="w-12 h-12 text-primary/60 mx-auto mb-3" />
                                    <p className="text-xl font-black text-primary/80">Suelta aquí</p>
                                    <p className="text-sm text-muted/50 mt-1">Backtests HTML o archivo de mapeo</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!hasData ? <EmptyState onFileInput={handleFileInput} /> : (
                        <Dashboard
                            stats={stats}
                            equityCurve={equityCurve}
                            excludedBots={excludedBots}
                        />
                    )}
                </main>
            </div>

            {/* ── Toasts ─────────────────────────────────────────────────── */}
            <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 32, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 32, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className={`flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-xl shadow-2xl text-[12px] font-semibold glass
                                ${t.type === 'ok' ? 'border-primary/20 text-primary' : 'border-error/20 text-error'}`}
                        >
                            {t.type === 'ok'
                                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                : <AlertCircle  className="w-3.5 h-3.5 flex-shrink-0" />
                            }
                            {t.msg}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ── Empty State ───────────────────────────────────────────────────────────── */
function EmptyState({ onFileInput }: { onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-8 p-12">
            {/* Animated icon */}
            <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-surface2 border border-white/[0.07] flex items-center justify-center
                    shadow-[0_0_60px_rgba(0,214,143,0.06)]">
                    <FileText className="w-10 h-10 text-muted/25" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Upload className="w-3 h-3 text-primary/60" />
                </div>
            </div>

            <div className="text-center max-w-sm">
                <h2 className="text-xl font-black text-white mb-2 tracking-tight">
                    Arrastra tus backtests aquí
                </h2>
                <p className="text-sm text-muted/60 leading-relaxed">
                    Carga uno o múltiples informes HTML del Strategy Tester de MT5.
                    Puedes incluir también el archivo de mapeo de Magic Numbers.
                </p>
            </div>

            <label className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary/10 border border-primary/25
                hover:bg-primary/15 hover:border-primary/40 transition-all cursor-pointer text-sm font-bold text-primary">
                <Upload className="w-4 h-4" />
                Seleccionar archivos
                <input type="file" multiple accept=".html,.htm" className="hidden" onChange={onFileInput} />
            </label>

            {/* Tips */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mt-2">
                {[
                    ['📊', 'Múltiples bots', 'Carga N informes HTML de MT5 a la vez'],
                    ['🔢', 'Magic Numbers', 'Reasigna IDs automáticamente con tu mapeo'],
                    ['📄', 'Exportar', 'Genera un informe HTML consolidado listo para revisar'],
                ].map(([icon, title, desc]) => (
                    <div key={title} className="bg-surface2/60 border border-white/[0.05] rounded-xl p-3.5 text-center">
                        <div className="text-xl mb-1.5">{icon}</div>
                        <p className="text-[11px] font-bold text-white/80 mb-1">{title}</p>
                        <p className="text-[10px] text-muted/50 leading-relaxed">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
function Dashboard({ stats, equityCurve, excludedBots }: {
    stats: ReturnType<typeof processPortfolio>['stats'];
    equityCurve: ReturnType<typeof processPortfolio>['equityCurve'];
    excludedBots: Set<string>;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="p-5 space-y-5 min-h-full"
        >
            {/* Stats */}
            <StatsGrid stats={stats} />

            {/* Chart */}
            <div className="chart-panel" style={{ height: '440px' }}>
                {/* Chart header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary/70" />
                        <span className="text-xs font-black uppercase tracking-widest text-white/70">
                            Curva de Equidad Consolidada
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted/40 tabular">
                        <span>{equityCurve.length.toLocaleString()} puntos</span>
                        {equityCurve.length > 0 && (
                            <>
                                <span>·</span>
                                <span>
                                    {new Date(equityCurve[0].rawTime).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                    {' → '}
                                    {new Date(equityCurve[equityCurve.length - 1].rawTime).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div style={{ height: 'calc(100% - 52px)' }}>
                    <EquityChart data={equityCurve} />
                </div>
            </div>

            {/* Strategy + Trades detail */}
            <StatsDetail stats={stats} />

            {/* Monthly performance */}
            <MonthlyTable data={stats.monthlyPerf} />

            {/* Bot summary grid */}
            {stats.botStats.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted/40 mb-3 flex items-center gap-2">
                        <Bot className="w-3 h-3" />
                        Rendimiento por Bot
                        <span className="font-normal normal-case tracking-normal text-muted/25">
                            — {stats.botStats.length} sistemas · {stats.botStats.filter(b => !excludedBots.has(b.botName) && b.profit > 0).length} rentables
                        </span>
                    </h3>
                    <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                        {stats.botStats.map(bot => {
                            const ex = excludedBots.has(bot.botName);
                            const pos = bot.profit >= 0;
                            return (
                                <div key={bot.botName}
                                    className={`rounded-xl px-3.5 py-3 border transition-all ${ex ? 'opacity-30' : ''}
                                        ${pos
                                            ? 'bg-primary/[0.04] border-primary/10 hover:border-primary/20'
                                            : 'bg-error/[0.04] border-error/10 hover:border-error/20'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-[11px] font-semibold text-white/80 truncate leading-tight flex-1">
                                            {bot.botName}
                                        </p>
                                        <span className={`text-[12px] font-black tabular flex-shrink-0 ${pos ? 'text-primary' : 'text-error'}`}>
                                            {pos ? '+' : '-'}${Math.abs(bot.profit).toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {bot.magic && (
                                            <span className="text-[9px] font-bold text-secondary/60 bg-secondary/8 px-1.5 py-0.5 rounded">
                                                #{bot.magic}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-muted/40 tabular">{bot.trades} trades</span>
                                        <span className={`text-[9px] font-semibold tabular ml-auto ${bot.winRate >= 50 ? 'text-primary/70' : 'text-error/70'}`}>
                                            {bot.winRate}% WR
                                        </span>
                                    </div>
                                    {/* Mini progress bar */}
                                    <div className="mt-2 h-[2px] rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pos ? 'bg-primary/50' : 'bg-error/50'}`}
                                            style={{ width: `${Math.min(bot.winRate, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
