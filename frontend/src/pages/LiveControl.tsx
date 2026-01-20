import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Play, StopCircle, BarChart2 } from 'lucide-react';
import axios from 'axios';

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
    const wsRef = useRef<WebSocket | null>(null);

    // Simulated scenario name - ideally this comes from context or API
    const scenarioName = "Just One Intersection";

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/simulation');
        ws.onopen = () => console.log('Connected to simulation stream');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setStatus(prev => ({ ...prev, ...data }));
        };
        wsRef.current = ws;
        return () => ws.close();
    }, []);

    const handleStop = async () => {
        try {
            await axios.post('/api/simulation/stop');
            setStatus(s => ({ ...s, isRunning: false }));
        } catch (error) {
            console.error('Failed to stop simulation:', error);
        }
    };

    return (
        <div className="h-screen w-screen bg-[#050505] text-white overflow-hidden flex flex-col font-mono">
            {/* Header */}
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0b0f14]">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold tracking-wider text-lg">TRAFFIC<span className="text-cyan-400">AI</span></span>
                </div>

                <div className="flex bg-[#151a21] rounded-lg p-1 border border-white/10">
                    <button className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-bold border border-cyan-500/30 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> LIVE CONTROL
                    </button>
                    <button
                        onClick={() => navigate('/analytics')}
                        className="px-4 py-1.5 text-gray-500 hover:text-white rounded text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <BarChart2 className="w-3 h-3" /> DEEP ANALYTICS
                    </button>
                </div>

                <div className="px-4 py-1.5 rounded-full border border-green-500/30 bg-green-900/10 text-green-400 text-xs font-bold tracking-widest flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-green-500 ${status.isRunning ? 'animate-pulse' : ''}`} />
                    {status.isRunning ? 'RUNNING' : 'STANDBY'}
                    <span className="ml-2 text-white">{status.isRunning ? (status.step * 0.1).toFixed(1) : '0.0'}s</span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Control Panel */}
                <aside className="w-80 bg-[#0b0f14] border-r border-white/10 p-6 flex flex-col gap-8 z-10">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-500 mb-4">
                            <div className="p-1.5 bg-cyan-500/10 rounded border border-cyan-500/20">
                                <Activity className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold tracking-widest uppercase">Control Panel</span>
                        </div>

                        <div className="mb-2 text-[10px] text-gray-500 uppercase tracking-wider">Scenario Running</div>
                        <div className="bg-[#151a21] border border-white/10 p-3 rounded text-sm text-gray-300 font-bold mb-6">
                            {scenarioName.toUpperCase()}
                        </div>

                        <div className="mb-2 text-[10px] text-gray-500 uppercase tracking-wider">Simulated Time</div>
                        <div className="text-4xl font-light text-cyan-400 mb-8">
                            {(status.step * 0.1).toFixed(1)}s
                        </div>

                        {status.isRunning ? (
                            <button
                                onClick={handleStop}
                                className="w-full py-4 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-all uppercase font-bold tracking-widest text-sm flex items-center justify-center gap-2"
                            >
                                <StopCircle className="w-4 h-4" /> Stop Simulation
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/scenarios')} // Or restart logic
                                className="w-full py-4 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all uppercase font-bold tracking-widest text-sm flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" /> New Simulation
                            </button>
                        )}
                    </div>

                    {/* Mini Stats in Sidebar */}
                    <div className="mt-auto space-y-4">
                        <div className="p-4 rounded bg-[#151a21] border-l-2 border-red-500">
                            <div className="text-[10px] text-gray-500 uppercase">Fixed Time Avg Wait</div>
                            <div className="text-xl font-bold text-white">{status.fixed_metrics.waiting_time.toFixed(1)}s</div>
                        </div>
                        <div className="p-4 rounded bg-[#151a21] border-l-2 border-cyan-500">
                            <div className="text-[10px] text-gray-500 uppercase">RL Agent Avg Wait</div>
                            <div className="text-xl font-bold text-white">{status.rl_metrics.waiting_time.toFixed(1)}s</div>
                        </div>
                    </div>
                </aside>

                {/* Main Viewport */}
                <main className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />

                    {/* Central Pulse */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-ping" />
                            <Activity className="w-16 h-16 text-cyan-500 relative z-10" />
                        </div>
                        <h2 className="mt-8 text-2xl font-bold text-cyan-500 tracking-widest uppercase">Simulation Active</h2>
                        <p className="text-gray-500 text-xs mt-2 font-mono">WebSocket Heartbeat: Synchronizing single...</p>
                    </div>

                    {/* Footer Status Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#0b0f14] border-t border-white/10 flex items-center justify-between px-4 text-[10px] text-gray-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2 text-green-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                SYNC STATUS: LOCKED // STEP FREQUENCY: 10HZ
                            </span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span>FRAMEWORK: SUMO 1.18.0</span>
                            <span>AGENT: RL (DQN)</span>
                            <span>SYNC: TRAFFICAI-SOCKET-V1</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveControl;
