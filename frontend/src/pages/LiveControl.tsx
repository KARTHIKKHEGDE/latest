import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Power, Cpu, Server, Wifi, AlertTriangle, Play, Terminal, Shield } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface AgentState {
    tls_id: string;
    current_phase: number;
    queue_length: number;
    time_since_change: number;
    emergency?: boolean;
    lane_queues?: Record<string, number>;
}

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
    rl_details?: AgentState[];
}

// --- Components ---

const DigitalText = ({ value, label, color = "text-emerald-400" }: { value: string | number, label: string, color?: string }) => (
    <div className="flex flex-col font-mono tracking-wider">
        <span className={`text-[9px] uppercase opacity-50 font-bold ${color}`}>{label}</span>
        <span className={`text-xl font-black ${color} tabular-nums leading-none tracking-tighter`}>{value}</span>
    </div>
);

const PhaseRing = ({ phase, timer }: { phase: number, timer: number }) => {
    const rotation = phase * 90;

    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full absolute animate-[spin_12s_linear_infinite] opacity-20" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#00f7ff" strokeWidth="0.5" strokeDasharray="4,4" />
            </svg>
            <motion.svg
                className="w-full h-full absolute"
                viewBox="0 0 100 100"
                animate={{ rotate: rotation }}
                transition={{ type: "spring", stiffness: 40, damping: 12 }}
            >
                <circle cx="50" cy="50" r="42" fill="none" stroke="#00ff9c" strokeWidth="6" strokeDasharray="70, 194" strokeLinecap="butt" className="drop-shadow-[0_0_12px_rgba(0,255,156,0.6)]" />
            </motion.svg>
            <div className="text-[#00ff9c] font-black text-xl font-mono z-10 drop-shadow-[0_0_8px_#00ff9c]">{timer}s</div>
        </div>
    );
};

const LaneSensor = ({ id, load }: { id: string, load: number }) => {
    const maxLoad = 20;
    const intensity = Math.min(load / maxLoad, 1);
    const colorClass = intensity > 0.8 ? "bg-[#ff004c] shadow-[0_0_15px_#ff004c]" : "bg-[#00ff9c] shadow-[0_0_8px_#00ff9c]";
    const widthPct = `${intensity * 100}%`;

    return (
        <div className="flex items-center gap-3 font-mono text-[10px] w-full mb-1.5 group">
            <span className="w-14 opacity-40 text-right shrink-0 group-hover:opacity-100 transition-opacity font-bold">{id.replace(/[-_]/g, '').toUpperCase()}</span>
            <div className="flex-1 h-3.5 bg-black border border-white/5 relative overflow-hidden rounded-sm">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: widthPct }}
                    className={`h-full ${colorClass} opacity-70`}
                />
                <div className="absolute inset-0 flex justify-between px-1 opacity-10 pointer-events-none">
                    {[...Array(6)].map((_, i) => <div key={i} className="w-[1px] h-full bg-white" />)}
                </div>
            </div>
            <span className="w-8 text-right tabular-nums font-black text-white">{load}</span>
        </div>
    );
};

const AINode = ({ agent }: { agent: AgentState }) => {
    const isEmergency = agent.emergency;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative bg-black/60 border ${isEmergency ? 'border-[#ff004c]' : 'border-white/5'} p-5 flex flex-col gap-5 overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-md`}
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${isEmergency ? 'bg-[#ff004c] animate-pulse' : 'bg-cyan-500/20 group-hover:bg-cyan-500 transition-colors'}`} />

            <div className="flex justify-between items-start z-10 border-b border-white/5 pb-3">
                <div className="flex flex-col">
                    <span className={`text-[9px] font-black tracking-[0.3em] uppercase ${isEmergency ? 'text-[#ff004c]' : 'text-cyan-500/60'}`}>NODE_LINK // 04</span>
                    <span className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        {agent.tls_id}
                        <span className={`w-2.5 h-2.5 rounded-full ${isEmergency ? 'bg-[#ff004c] animate-ping' : 'bg-[#00ff9c] animate-pulse shadow-[0_0_8px_#00ff9c]'}`} />
                    </span>
                </div>
                {isEmergency && (
                    <div className="px-3 py-1 border-2 border-[#ff004c] text-[#ff004c] text-[10px] font-black uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> PRIORITY_OVERRIDE
                    </div>
                )}
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-8 items-center z-10">
                <PhaseRing phase={agent.current_phase} timer={agent.time_since_change} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <DigitalText value={agent.queue_length} label="Current_Queue" color={agent.queue_length > 15 ? "text-[#ffaa00]" : "text-white"} />
                    <DigitalText value={agent.current_phase} label="Active_Phase" color="text-cyan-400" />
                    <DigitalText value={(agent.time_since_change * 1.8).toFixed(0)} label="Flow_Rate" color="text-[#00ff9c]" />
                    <DigitalText value={isEmergency ? "ALERT" : "STABLE"} label="Sys_State" color={isEmergency ? "text-[#ff004c]" : "text-emerald-500/50"} />
                </div>
            </div>

            <div className="z-10 bg-black/80 p-3 border border-white/5 relative rounded-sm">
                <div className="text-[9px] uppercase text-cyan-500 font-black mb-3 flex justify-between items-center opacity-70 tracking-[0.2em]">
                    <span>LANE_TELEMETRY_ARRAY</span>
                    <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                    {agent.lane_queues && Object.entries(agent.lane_queues).slice(0, 4).map(([lane, count]) => (
                        <LaneSensor key={lane} id={lane} load={count} />
                    ))}
                    {!agent.lane_queues && <div className="text-[10px] text-cyan-900 font-bold italic py-2 tracking-widest text-center">NO_SENSOR_INPUT</div>}
                </div>
            </div>

            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white/5 group-hover:border-cyan-500/30 transition-colors" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-white/5 group-hover:border-cyan-500/30 transition-colors" />
        </motion.div>
    );
}

// --- Main Page ---

const LiveControl = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SimulationState>({
        step: 0,
        isRunning: false,
        rl_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 },
        fixed_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 }
    });
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/simulation');
        ws.onopen = () => console.log('Uplink Established');
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
            console.error('CMD_FAIL:', error);
        }
    };

    return (
        <div className="h-screen w-screen bg-cyber-layers text-white overflow-hidden flex flex-col font-mono selection:bg-cyan-500/20">
            {/* Background Texture Layers */}
            <div className="bg-noise absolute inset-0 z-0" />
            <div className="scan-sweep z-0" />

            {/* 1. TOP COMMAND BAR */}
            <header className="h-14 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 border-2 border-cyan-500 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-all">
                            <Cpu className="w-5 h-5" />
                        </div>
                        <span className="font-black tracking-[0.4em] text-xs transition-colors group-hover:text-cyan-400">TRAFFIC.AI_OS_v4</span>
                    </div>

                    <div className="h-5 w-px bg-white/10" />

                    <div className="flex gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        <span className="flex items-center gap-2 group cursor-default hover:text-cyan-400 transition-colors"><Server className="w-3.5 h-3.5" /> NODE: LOCAL_HOST</span>
                        <span className="flex items-center gap-2 group cursor-default hover:text-cyan-400 transition-colors"><Wifi className="w-3.5 h-3.5" /> LINK: 100% stable</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-3 px-4 py-1.5 border-2 ${status.isRunning ? 'border-[#00ff9c] text-[#00ff9c]' : 'border-[#ffaa00] text-[#ffaa00]'} text-[10px] font-black tracking-[0.3em] uppercase`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${status.isRunning ? 'bg-[#00ff9c] animate-pulse shadow-[0_0_10px_#00ff9c]' : 'bg-[#ffaa00]'}`} />
                        {status.isRunning ? 'CORE_ACTIVE' : 'CORE_STANDBY'}
                    </div>
                    <div className="text-cyan-400 font-black text-2xl tabular-nums tracking-tighter min-w-[120px] text-right drop-shadow-[0_0_10px_rgba(0,247,255,0.4)]">
                        {(status.step * 0.1).toFixed(1)}s
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* 2. LEFT COMMAND STACK */}
                <aside className="w-80 bg-black/80 border-r border-white/5 p-6 flex flex-col gap-8 z-40 backdrop-blur-xl relative">
                    <div className="border-b border-white/5 pb-4">
                        <h3 className="text-cyan-500 text-[10px] font-black tracking-[0.5em] uppercase flex items-center gap-3">
                            <Terminal className="w-4 h-4" /> CMD_INTERFACE
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-bold">ACTIVE_PROTOCOL</div>
                            <div className="bg-black border border-white/5 p-4 relative group hover:border-cyan-500/30 transition-all">
                                <div className="text-white font-black text-sm tracking-widest">HOSMAT_GRID_STRESS</div>
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-[#00ff9c]/40 rounded-full" />
                                    <div className="w-1.5 h-1.5 bg-[#ffaa00]/40 rounded-full" />
                                </div>
                            </div>
                        </div>

                        {status.isRunning ? (
                            <button onClick={handleStop} className="w-full py-4 bg-[#ff004c]/10 border-2 border-[#ff004c]/40 hover:bg-[#ff004c] hover:text-black text-[#ff004c] text-xs font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 transition-all">
                                <Power className="w-5 h-5" /> ABORT_EXE
                            </button>
                        ) : (
                            <button onClick={() => navigate('/scenarios')} className="btn-cyber w-full py-4 text-xs font-black flex items-center justify-center gap-3">
                                <Play className="w-5 h-5" /> INIT_DEPLOY
                            </button>
                        )}
                    </div>

                    <div className="bg-black/40 border border-white/5 p-5 relative group hover:border-[#00ff9c]/40 transition-all cursor-pointer" onClick={() => navigate('/analytics')}>
                        <div className="text-[9px] text-white/30 uppercase tracking-[0.4em] mb-2 font-bold italic">Deep_Analytics</div>
                        <div className="text-[#00ff9c] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-between">
                            <span>Open_Stream</span>
                            <Activity className="w-5 h-5" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#00ff9c]/20 group-hover:border-[#00ff9c] transition-colors" />
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-[9px] font-bold tracking-[0.2em] text-white/40 group">
                            <span className="group-hover:text-cyan-400 transition-colors uppercase">MEM_USAGE</span>
                            <span className="text-cyan-500">1.2 GB</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold tracking-[0.2em] text-white/40 group">
                            <span className="group-hover:text-[#00ff9c] transition-colors uppercase">THREAD_LOCK</span>
                            <span className="text-[#00ff9c]">SECURE</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold tracking-[0.2em] text-white/40 group">
                            <span className="group-hover:text-[#ff004c] transition-colors uppercase">ACCESS_LVL</span>
                            <span className="text-[#ff004c] font-black">ROOT</span>
                        </div>
                    </div>
                </aside>

                {/* 3. MAIN CORE GRID */}
                <main className="flex-1 overflow-auto relative p-10">
                    {/* Standby State Overlay */}
                    {!status.isRunning && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-[4px]">
                            <div className="flex flex-col items-center max-w-lg w-full">
                                <div className="relative mb-12">
                                    <div className="w-48 h-48 border-2 border-cyan-500/20 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
                                        <div className="w-40 h-40 border border-cyan-500/40 rounded-full border-dashed" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Shield className="w-20 h-20 text-cyan-500 opacity-20" />
                                    </div>
                                    <motion.div className="absolute top-0 -right-8 flex flex-col gap-1 text-[8px] text-cyan-500/40 font-black uppercase tracking-widest" animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                                        <span>SEC_LAYER_04</span>
                                        <span>ENCRYPT_STABLE</span>
                                    </motion.div>
                                </div>
                                <h1 className="text-5xl font-black text-white tracking-[0.6em] uppercase flex items-center gap-1">
                                    CORE<span className="text-cyan-500 animate-pulse">_</span>STANDBY
                                </h1>
                                <p className="text-cyan-500/40 text-xs font-black mt-6 tracking-[0.8em] uppercase text-center leading-loose">
                                    Waiting for simulation initialization sequence...<br />
                                    Unauthorized access is strictly prohibited.
                                </p>

                                <div className="mt-12 w-full h-1 bg-white/5 relative overflow-hidden">
                                    <motion.div className="h-full bg-cyan-500 w-1/3" animate={{ left: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Grid */}
                    <div className="max-w-[1700px] mx-auto z-10 relative">
                        <AnimatePresence>
                            {status.isRunning && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-8 pb-20"
                                >
                                    {status.rl_details && status.rl_details.map((agent) => (
                                        <AINode key={agent.tls_id} agent={agent} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Background Telemetry Rail (Right) */}
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-8 text-[10px] text-cyan-400 font-bold uppercase pointer-events-none tracking-[0.4em] text-right opacity-60">
                        <div className="flex flex-col">
                            <span className="text-cyan-900 text-[8px]">Buffer_ID</span>
                            <span className="text-white/30">0x442FEA</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-cyan-900 text-[8px]">Cache_Alloc</span>
                            <span className="text-white/30">1024_PAGES</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-cyan-900 text-[8px]">Seed_Val</span>
                            <span className="text-white/30">42_CONST</span>
                        </div>
                    </div>
                </main>
            </div>

            {/* System Footer Bar */}
            <footer className="h-8 border-t border-white/5 bg-[#050505] flex items-center justify-between px-6 z-50 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                <div className="flex gap-8">
                    <span className="hover:text-cyan-500 transition-colors cursor-default select-none">Auth_Key: restricted_access_stable</span>
                    <span className="hover:text-[#00ff9c] transition-colors cursor-default select-none">Enc: AES_256_ACTIVE</span>
                </div>
                <div>
                    <span className="animate-pulse flex items-center gap-2 italic">
                        <Activity className="w-3 h-3" /> System Feed Online
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default LiveControl;
