import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const sequence = [
            { text: "> initializing neural_network_v4.2... [OK]", delay: 500 },
            { text: "> establishing sumo_traci_connection... [OK]", delay: 1200 },
            { text: "> loading city_topology_matrix... [DONE]", delay: 2000 },
            { text: "> omniscient_sensor_array_online... [READY]", delay: 2800 },
        ];

        let timeouts: ReturnType<typeof setTimeout>[] = [];

        sequence.forEach(({ text, delay }) => {
            const timeout = setTimeout(() => {
                setLogs(prev => [...prev, text]);
            }, delay);
            timeouts.push(timeout);
        });

        return () => timeouts.forEach(clearTimeout);
    }, []);

    return (
        <div className="h-screen w-screen bg-[#050505] text-white overflow-hidden relative font-mono flex flex-col items-center justify-center">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#050505] opacity-80 pointer-events-none" />

            {/* System Status Pill */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute top-24 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] tracking-[0.2em] uppercase font-bold flex items-center gap-2"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                System Status: Optimized
            </motion.div>

            {/* Main Title */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="text-center z-10"
            >
                <h1 className="text-8xl font-black tracking-tighter mb-4">
                    TRAFFIC <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 text-shadow-glow">AI</span>
                </h1>
                <h2 className="text-gray-500 text-xs tracking-[0.5em] uppercase mb-12">
                    Next-Generation Adaptive Signal Control Platform
                </h2>

                {/* Enter Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/scenarios')}
                    className="group relative px-8 py-3 bg-transparent border border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all duration-300 uppercase tracking-widest text-sm font-bold flex items-center gap-4 mx-auto"
                >
                    Enter System
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </motion.div>

            {/* Console Logs */}
            <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-2 font-mono text-[10px] text-cyan-500/50">
                {logs.map((log, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="tracking-wider"
                    >
                        {log}
                    </motion.div>
                ))}
            </div>

            {/* Footer Stats */}
            <div className="absolute bottom-6 right-6 text-right space-y-1 opacity-50">
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">Reinforcement Learning Powered</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">Real-time Traffic Optimization</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">99.9% Collision Prevention</div>
            </div>
        </div>
    );
};

export default Landing;

