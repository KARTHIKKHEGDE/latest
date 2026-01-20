import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Lock, Terminal, Activity, Wifi } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string[]>([]);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authStep, setAuthStep] = useState("");

    useEffect(() => {
        const logData = [
            "> INITIALIZING NEURAL_NETWORK_V4.2...",
            "> ESTABLISHING SUMO_TRACI_CONNECTION...",
            "> LOADING CITY_TOPOLOGY_MATRIX...",
            "> OMNISCIENT_SENSOR_ARRAY_ONLINE...",
            "> ADAPTIVE_FLOW_PROTOCOL_V2_LOADED",
            "> HOSMAT_GRID_STRESS_TEST_ENABLED",
            "> SYNCING_TIME_COORDINATES..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            setLogs(prev => [logData[i % logData.length], ...prev.slice(0, 5)]);
            i++;
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleEnter = async () => {
        setIsAuthenticating(true);
        const steps = [
            "INTERSECTION_LOADED",
            "12_INTERSECTIONS_SYNCED",
            "BANGALORE_HEBBAL_MAP_LOADED",
            "BANGALORE_HOSMAT_MAP_LOADED",
            "DQN_NEURAL_NETWORK_ACTIVATED"
        ];

        for (const step of steps) {
            setAuthStep(step);
            await new Promise(r => setTimeout(r, 400));
        }

        navigate('/scenarios');
    };

    return (
        <div className="h-screen w-screen bg-cyber-layers text-white overflow-hidden relative font-mono flex flex-col items-center justify-center">
            {/* Background Layers */}
            <div className="bg-noise absolute inset-0 z-0" />
            <div className="scan-sweep z-0" />

            {/* Left Telemetry Rail */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-[11px] text-emerald-400 opacity-90 z-10 pointer-events-none">
                <div className="flex flex-col">
                    <span className="text-emerald-900 group-hover:text-emerald-700 transition-colors uppercase font-black text-[9px]">SYS.TIME</span>
                    <span className="font-bold tracking-widest">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-emerald-900 uppercase font-black text-[9px]">MAP.NODES</span>
                    <span className="font-bold tracking-widest">128</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-emerald-900 uppercase font-black text-[9px]">ACTIVE.LANES</span>
                    <span className="font-bold tracking-widest">46</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-emerald-900 uppercase font-black text-[9px]">SIGNALS.ONLINE</span>
                    <span className="font-bold tracking-widest">TRUE</span>
                </div>
                <div className="flex flex-col mt-8">
                    <span className="text-emerald-900 uppercase font-black text-[9px]">SECURITY_LEVEL</span>
                    <span className="text-red-500 font-bold tracking-[0.2em]">RESTRICTED_ACCESS</span>
                </div>
            </div>

            {/* Right Telemetry Rail */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-6 items-end text-[11px] text-cyan-400 opacity-90 z-10 pointer-events-none text-right">
                <div className="flex gap-2 items-center">
                    <span>X_COORDS // 102.339</span>
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="flex gap-2 items-center">
                    <span>Y_COORDS // 442.102</span>
                    <Wifi className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="flex gap-2 items-center">
                    <span>Z_COORDS // --0.22</span>
                    <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="mt-12 group">
                    <div className="border border-cyan-500/20 p-2 transform rotate-45 group-hover:rotate-90 transition-transform duration-1000">
                        <Lock className="w-4 h-4 transform -rotate-45" />
                    </div>
                </div>
            </div>

            {/* Top Badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.8, scale: 1 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-6 py-2 border border-emerald-500/30 bg-black/60 backdrop-blur-md"
            >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#00ff9c]" />
                <span className="text-[10px] tracking-[0.4em] font-bold text-emerald-500">SYSTEM // OPTIMIZED</span>
            </motion.div>

            {/* Glitch Title */}
            <motion.div
                className="text-center z-10 select-none pb-12 cursor-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <h1 className="text-[11vw] font-black tracking-tighter leading-none m-0 p-0 text-white">
                    TRAFFIC <span className="glitch-text text-cyan-400" data-text="AI">AI</span><span className="terminal-cursor text-cyan-400"></span>
                </h1>
                <p className="text-gray-600 text-[10px] tracking-[0.8em] uppercase mt-4 opacity-50">
                    Next-Generation Adaptive Signal Control Platform
                </p>
            </motion.div>

            {/* Enter Button */}
            <div className="z-20 mt-8 relative">
                <AnimatePresence mode="wait">
                    {!isAuthenticating ? (
                        <motion.button
                            key="enter"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleEnter}
                            className="btn-cyber group"
                        >
                            <span className="relative z-10 flex items-center gap-4">
                                &gt; ENTER_SYSTEM
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </motion.button>
                    ) : (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="w-48 h-1 bg-gray-900 overflow-hidden relative border border-cyan-500/20">
                                <motion.div
                                    className="absolute inset-0 bg-cyan-500"
                                    initial={{ left: "-100%" }}
                                    animate={{ left: "0%" }}
                                    transition={{ duration: 1.6, ease: "linear" }}
                                />
                            </div>
                            <span className="text-[10px] text-cyan-400 font-bold tracking-[0.3em] h-4">
                                {authStep}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background Log Stream */}
            <div className="absolute bottom-8 left-10 z-10 flex flex-col gap-1 w-72 pointer-events-none">
                <AnimatePresence>
                    {logs.map((log, i) => (
                        <motion.div
                            key={log + i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 0.8 - (i * 0.12), x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="font-mono text-[10px] text-emerald-400 font-bold whitespace-nowrap"
                        >
                            {log}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Security Notice */}
            <div className="absolute bottom-8 right-10 flex items-center gap-4 text-[9px] text-gray-700 opacity-60 z-10">
                <Shield className="w-4 h-4" />
                <span className="tracking-[0.2em] font-bold">ENCRYPTION // AES-256 ACTIVE</span>
            </div>
        </div>
    );
};

export default Landing;

