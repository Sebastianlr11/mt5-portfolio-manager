import React from 'react';
import { MonthlyPerf } from '../logic/types';

interface Props { data: MonthlyPerf[] }

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const fmtCell = (v: number | null): string => {
    if (v === null) return '—';
    const abs = Math.abs(v);
    const str = abs >= 10_000 ? `${(abs / 1_000).toFixed(0)}k`
              : abs >= 1_000  ? `${(abs / 1_000).toFixed(1)}k`
              : abs.toFixed(0);
    return `${v < 0 ? '-' : ''}${str}`;
};

const cellColor = (v: number | null): string => {
    if (v === null)  return 'text-muted/25';
    if (v > 0)       return 'text-primary';
    if (v < 0)       return 'text-error';
    return 'text-muted/40';
};

const cellBg = (v: number | null): string => {
    if (v === null)  return '';
    if (v > 0)       return 'bg-primary/[0.07]';
    if (v < 0)       return 'bg-error/[0.07]';
    return '';
};

export const MonthlyTable: React.FC<Props> = ({ data }) => {
    if (data.length === 0) return null;

    return (
        <div className="chart-panel overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/50">
                    Monthly Performance ($)
                </span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[700px] text-[11px]">
                    <thead>
                        <tr className="border-b border-white/[0.05]">
                            <th className="px-4 py-2 text-left font-bold text-muted/50 uppercase tracking-widest w-14">Año</th>
                            {MONTHS.map(m => (
                                <th key={m} className="px-2 py-2 text-center font-bold text-muted/40 uppercase tracking-wider w-[7%]">
                                    {m}
                                </th>
                            ))}
                            <th className="px-4 py-2 text-right font-bold text-muted/50 uppercase tracking-widest w-16">YTD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...data].reverse().map(row => (
                            <tr key={row.year} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                                {/* Year */}
                                <td className="px-4 py-2 font-black text-white/70 tabular">{row.year}</td>

                                {/* Month cells */}
                                {row.months.map((v, i) => (
                                    <td key={i} className={`px-1.5 py-1.5 text-center tabular font-semibold ${cellColor(v)} ${cellBg(v)} rounded-sm`}>
                                        {fmtCell(v)}
                                    </td>
                                ))}

                                {/* YTD */}
                                <td className={`px-4 py-2 text-right font-black tabular ${row.ytd >= 0 ? 'text-primary' : 'text-error'}`}>
                                    {fmtCell(row.ytd)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
