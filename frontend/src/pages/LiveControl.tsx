import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, ArrowLeft, Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SimulationState {
    step: number;
    isRunning: boolean;
    rl_metrics: {
        waiting_time: number;
        queue_length: number;
        throughput: number;
    };
    fixed_metrics: {
        waiting_time: number;
        queue_length: number;
        throughput: number;
    };
}

const LiveControl = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SimulationState>({
        step: 0,
        isRunning: false,
        rl_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 },
        fixed_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 }
    });
    const [dataHistory, setDataHistory] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // WebSocket Connection
        const ws = new WebSocket('ws://localhost:8000/ws/simulation');

        ws.onopen = () => {
            console.log('Connected to simulation stream');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setStatus(prev => ({ ...prev, ...data }));
            setDataHistory(prev => {
                const newData = [...prev, {
                    step: data.step,
                    rl_wait: data.rl_metrics.waiting_time,
                    fixed_wait: data.fixed_metrics.waiting_time
                }];
                return newData.slice(-50); // Keep last 50 points
            });
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const handleControl = async (action: 'start' | 'stop' | 'reset') => {
        try {
            await axios.post(`/api/simulation/${action}`);
            if (action === 'start') setStatus(s => ({ ...s, isRunning: true }));
            if (action === 'stop') setStatus(s => ({ ...s, isRunning: false }));
            if (action === 'reset') {
                setStatus({
                    step: 0,
                    isRunning: false,
                    rl_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 },
                    fixed_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 }
                });
                setDataHistory([]);
            }
        } catch (error) {
            console.error(`Failed to ${action} simulation:`, error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0e14] text-white overflow-hidden flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-[#0f1419] flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/scenarios')}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Live Simulation Monitor
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1 rounded bg-black/20 border border-white/5">
                        <span className="text-xs text-gray-500">STATUS</span>
                        <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-sm font-mono font-bold text-cyan-400">
                            {status.isRunning ? 'RUNNING' : 'PAUSED'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1 rounded bg-black/20 border border-white/5">
                        <span className="text-xs text-gray-500">STEP</span>
                        <span className="text-sm font-mono font-bold">{status.step}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left: Visualization (Placeholder for now) */}
                <div className="flex-1 bg-black/40 relative p-6 flex flex-col justify-center items-center border-r border-white/10">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                    <div className="w-full max-w-4xl grid grid-cols-2 gap-8 z-10">
                        {/* RL Agent View */}
                        <div className="bg-[#151a21]/80 rounded-2xl border border-cyan-500/30 p-1 relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-black/60 px-3 py-1 rounded border border-cyan-500/50 text-cyan-400 text-xs font-bold">
                                RL AGENT (DQN)
                            </div>
                            <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center relative">
                                <Zap className="w-16 h-16 text-cyan-500/20" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-4">
                                    <div className="text-xs text-gray-400 flex flex-col">
                                        <span>Avg Wait</span>
                                        <span className="text-white font-mono text-lg">{status.rl_metrics.waiting_time.toFixed(1)}s</span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex flex-col text-right">
                                        <span>Queue</span>
                                        <span className="text-white font-mono text-lg">{status.rl_metrics.queue_length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Time View */}
                        <div className="bg-[#151a21]/80 rounded-2xl border border-orange-500/30 p-1 relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-black/60 px-3 py-1 rounded border border-orange-500/50 text-orange-400 text-xs font-bold">
                                FIXED TIME
                            </div>
                            <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center relative">
                                <Clock className="w-16 h-16 text-orange-500/20" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-4">
                                    <div className="text-xs text-gray-400 flex flex-col">
                                        <span>Avg Wait</span>
                                        <span className="text-white font-mono text-lg">{status.fixed_metrics.waiting_time.toFixed(1)}s</span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex flex-col text-right">
                                        <span>Queue</span>
                                        <span className="text-white font-mono text-lg">{status.fixed_metrics.queue_length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Chart */}
                    <div className="w-full max-w-4xl h-64 mt-8 bg-[#151a21] rounded-xl border border-white/5 p-4 z-10">
                        <h3 className="text-xs text-gray-400 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> LIVE WAITING TIME COMPARISON
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dataHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="step" stroke="#ffffff30" fontSize={10} tick={false} />
                                <YAxis stroke="#ffffff30" fontSize={10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rl_wait"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    dot={false}
                                    name="RL Agent"
                                    animationDuration={300}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="fixed_wait"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Fixed Time"
                                    animationDuration={300}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Controls & Detailed Stats */}
                <div className="w-80 bg-[#0f1419] border-l border-white/10 p-6 flex flex-col gap-6 z-20">
                    {/* Control Panel */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Simulation Controls</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {!status.isRunning ? (
                                <button
                                    onClick={() => handleControl('start')}
                                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-bold transition-all"
                                >
                                    <Play className="w-4 h-4 fill-current" /> START
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleControl('stop')}
                                    className="bg-red-600 hover:bg-red-500 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-bold transition-all"
                                >
                                    <Pause className="w-4 h-4 fill-current" /> STOP
                                </button>
                            )}
                            <button
                                onClick={() => handleControl('reset')}
                                className="bg-white/10 hover:bg-white/20 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-bold transition-all"
                            >
                                <RotateCcw className="w-4 h-4" /> RESET
                            </button>
                        </div>
                    </div>

                    {/* Metrics Panel */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Performance Metrics</h3>

                        {/* Efficiency Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/20 to-black border border-cyan-500/20">
                            <div className="text-xs text-cyan-400 mb-1">EFFICIENCY GAIN</div>
                            <div className="text-3xl font-black text-white">
                                {status.fixed_metrics.waiting_time > 0
                                    ? `${(((status.fixed_metrics.waiting_time - status.rl_metrics.waiting_time) / status.fixed_metrics.waiting_time) * 100).toFixed(1)}%`
                                    : '0.0%'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Reduction in waiting time</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-gray-500">THROUGHPUT (Vehicles/hr)</div>
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                <span className="text-cyan-400 font-mono">RL</span>
                                <span className="font-bold">{status.rl_metrics.throughput}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                <span className="text-orange-400 font-mono">FIXED</span>
                                <span className="font-bold">{status.fixed_metrics.throughput}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/analytics')}
                        className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
                    >
                        View Deep Analytics
                    </button>
                </div>
            </main>
        </div>
    );
};

export default LiveControl;
