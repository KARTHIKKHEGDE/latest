
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart2, Clock, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import axios from 'axios';

interface ComparisonMetrics {
    rl: {
        avg_waiting_time: number;
        avg_queue_length: number;
        total_throughput: number;
    };
    fixed: {
        avg_waiting_time: number;
        avg_queue_length: number;
        total_throughput: number;
    };
    improvement: {
        waiting_time_reduction: number;
        queue_length_reduction: number;
        throughput_increase: number;
    };
    time_series: {
        rl_waiting: number[];
        fixed_waiting: number[];
        rl_queue: number[];
        fixed_queue: number[];
    };
}

const DeepAnalytics = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 2000); // Polling every 2s
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await axios.get('/api/simulation/comparison');
            setMetrics(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            // Don't set loading false on error to keep trying or show old data
        }
    };

    if (loading || !metrics) {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono animate-pulse">
                <div className="text-cyan-500 tracking-widest">ANALYZING SIMULATION DATA...</div>
            </div>
        );
    }

    // Process Trend Data for Chart
    const trendData = metrics.time_series.fixed_waiting.map((val, i) => ({
        time: `${i * 10} s`, // Assuming downsample factor matches logic
        fixed: val,
        rl: metrics.time_series.rl_waiting[i] || 0
    }));

    // Normalize Radar Data (0-100 scale relative to max observed)
    const maxWait = Math.max(metrics.fixed.avg_waiting_time, metrics.rl.avg_waiting_time, 1);
    const maxQueue = Math.max(metrics.fixed.avg_queue_length, metrics.rl.avg_queue_length, 1);
    const maxThroughput = Math.max(metrics.fixed.total_throughput, metrics.rl.total_throughput, 1);

    const radarData = [
        {
            subject: 'Efficiency (Wait)',
            A: 100 - (metrics.fixed.avg_waiting_time / maxWait * 100), // Inverted: Less wait is better
            B: 100 - (metrics.rl.avg_waiting_time / maxWait * 100),
            fullMark: 100
        },
        {
            subject: 'Throughput',
            A: (metrics.fixed.total_throughput / maxThroughput * 100),
            B: (metrics.rl.total_throughput / maxThroughput * 100),
            fullMark: 100
        },
        {
            subject: 'Queue Flow',
            A: 100 - (metrics.fixed.avg_queue_length / maxQueue * 100), // Inverted
            B: 100 - (metrics.rl.avg_queue_length / maxQueue * 100),
            fullMark: 100
        },
    ];

    const formatImprovement = (val: number) => {
        const sign = val > 0 ? '+' : '';
        return `${sign}${val.toFixed(1)}% `;
    };

    const cards = [
        {
            label: 'AVG WAIT TIME',
            fixed: metrics.fixed.avg_waiting_time.toFixed(1),
            rl: metrics.rl.avg_waiting_time.toFixed(1),
            unit: 's',
            improvement: formatImprovement(metrics.improvement.waiting_time_reduction),
            color: 'cyan',
            better: metrics.improvement.waiting_time_reduction > 0
        },
        {
            label: 'TOTAL THROUGHPUT',
            fixed: metrics.fixed.total_throughput.toString(),
            rl: metrics.rl.total_throughput.toString(),
            unit: 'v',
            improvement: formatImprovement(metrics.improvement.throughput_increase),
            color: 'green',
            better: metrics.improvement.throughput_increase > 0
        },
        {
            label: 'QUEUE LENGTH',
            fixed: metrics.fixed.avg_queue_length.toFixed(1),
            rl: metrics.rl.avg_queue_length.toFixed(1),
            unit: 'v',
            improvement: formatImprovement(metrics.improvement.queue_length_reduction),
            color: 'purple',
            better: metrics.improvement.queue_length_reduction > 0
        },
        {
            label: 'EFFICIENCY SCORE',
            fixed: 'BASELINE',
            rl: 'ADAPTIVE',
            unit: '',
            improvement: 'OPTIMIZED',
            color: 'blue',
            better: true
        },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-mono overflow-y-auto">
            {/* Header */}
            <header className="h-16 flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold tracking-wider text-xl">TRAFFIC<span className="text-cyan-400">AI</span></span>
                </div>

                <div className="flex bg-[#111] rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => navigate('/live')}
                        className="px-4 py-1.5 text-gray-500 hover:text-white rounded text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <Activity className="w-3 h-3" /> LIVE CONTROL
                    </button>
                    <button className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-bold border border-cyan-500/30 flex items-center gap-2">
                        <BarChart2 className="w-3 h-3" /> DEEP ANALYTICS
                    </button>
                    <div className="px-4 py-1.5 ml-4 rounded-full border border-green-500/30 text-green-400 text-xs font-bold tracking-widest">
                        LIVE DATA
                    </div>
                </div>
            </header>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-[#0b0f14] border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                        <div className={`absolute left - 0 top - 0 bottom - 0 w - 1 bg - ${card.color} -500`} />

                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            {idx === 0 && <Clock className="w-3 h-3" />}
                            {idx === 1 && <Zap className="w-3 h-3" />}
                            {card.label}
                        </div>

                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <div className="text-[10px] text-red-500 uppercase font-bold mb-1">FIXED</div>
                                <div className="text-2xl font-bold text-red-500">{card.fixed}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-cyan-500 uppercase font-bold mb-1">RL</div>
                                <div className="text-2xl font-bold text-cyan-400">{card.rl} <span className="text-sm text-gray-500">{card.unit}</span></div>
                            </div>
                        </div>

                        <div className={`text - [10px] mt - 2 font - bold flex items - center gap - 1 ${card.better ? 'text-green-400' : 'text-yellow-500'} `}>
                            {card.better ? '↑' : '↓'} {card.improvement} IMPROVEMENT
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6 h-[400px]">
                {/* Line Chart */}
                <div className="bg-[#0b0f14] border border-white/10 rounded-xl p-6 relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        <Activity className="w-4 h-4" /> Wait Time Trends (Live)
                    </div>
                    <div className="mt-8 h-full w-full">
                        <ResponsiveContainer width="100%" height="90%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="time" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                    itemStyle={{ fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="fixed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFixed)" strokeWidth={2} name="Fixed Time" />
                                <Area type="monotone" dataKey="rl" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRl)" strokeWidth={2} name="RL Agent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Chart */}
                <div className="bg-[#0b0f14] border border-white/10 rounded-xl p-6 relative flex items-center justify-center">
                    <div className="absolute top-6 left-6 flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        <Activity className="w-4 h-4" /> System Performance
                    </div>
                    <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Fixed Time" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                                <Radar name="RL Agent" dataKey="B" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="absolute bottom-4 right-4 text-[10px] text-gray-600 text-right">
                        <div>FRAMEWORK: SUMO 1.18.0</div>
                        <div>AGENT: RL (DQN)</div>
                        <div>SYNC: TRAFFICAI-SOCKET-V1</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeepAnalytics;

