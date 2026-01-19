import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Cpu, Map, BarChart2, ArrowRight } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] to-[#1a202c] text-white overflow-hidden relative">
            {/* Background Animated Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="container mx-auto px-6 h-screen flex flex-col items-center justify-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-4xl"
                >
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <span className="px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono tracking-wider uppercase">
                            Traffic AI Platform v2.0
                        </span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
                            Next-Gen
                        </span>
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                            Traffic Intelligence
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Experience the future of urban mobility with our dual-simulation engine.
                        Compare <span className="text-cyan-400 font-semibold">Adaptive RL</span> vs.
                        <span className="text-orange-400 font-semibold"> Fixed-Time</span> control in real-time.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/scenarios')}
                            className="group relative px-8 py-4 bg-cyan-500 text-black font-bold text-lg rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <div className="relative flex items-center gap-2">
                                Launch Platform
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold text-lg rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 backdrop-blur-sm"
                        >
                            <Activity className="w-5 h-5 text-cyan-400" />
                            View Demo
                        </motion.button>
                    </div>
                </motion.div>

                {/* Feature Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-5xl"
                >
                    {[
                        {
                            icon: <Cpu className="w-8 h-8 text-cyan-400" />,
                            title: "Deep Q-Learning",
                            desc: "Advanced neural networks that learn and adapt to changing traffic patterns instantly."
                        },
                        {
                            icon: <Map className="w-8 h-8 text-purple-400" />,
                            title: "Bangalore Scenarios",
                            desc: "Test on real-world junctions like Silk Board and Hosmat with realistic traffic demand."
                        },
                        {
                            icon: <BarChart2 className="w-8 h-8 text-emerald-400" />,
                            title: "Real-time Analytics",
                            desc: "Live comparative metrics for waiting time, queue length, and throughput."
                        }
                    ].map((feature, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group">
                            <div className="mb-4 p-3 rounded-xl bg-white/5 w-fit group-hover:bg-white/10 transition-colors">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Landing;
