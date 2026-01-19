import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, AlertTriangle, Users, Activity } from 'lucide-react';
import axios from 'axios';

interface Scenario {
    id: string;
    name: string;
    code: string;
    complexity: string;
    agents: string;
    description: string;
    badge: string;
    features: string[];
}

const ScenarioSelection = () => {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const response = await axios.get('/api/scenarios/list');
            setScenarios(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
            setLoading(false);
        }
    };

    const handleStartSimulation = async (id?: string) => {
        const targetId = id || selectedId;
        if (!targetId) return;
        setInitializing(true);
        try {
            // Initialize simulation in backend
            await axios.post('/api/simulation/initialize', {
                scenario: targetId,
                max_steps: 5400,
                n_cars: 1000,
                gui: true,
                seed: 42
            });

            // Auto-start simulation
            await axios.post('/api/simulation/start');

            navigate('/live');
        } catch (error) {
            console.error('Failed to start simulation:', error);
            alert('Failed to start simulation. Check console for details.');
        } finally {
            setInitializing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-[#0a0e14] text-white p-8">
            <div className="max-w-7xl mx-auto pb-12">
                {/* Header */}
                <header className="flex items-center justify-between mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
                            Select Scenario
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Choose a traffic environment to simulate</p>
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="animate-spin text-cyan-400">
                            <Activity className="w-12 h-12" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {scenarios.map((scenario) => (
                            <motion.div
                                key={scenario.id}
                                layoutId={scenario.id}
                                onClick={() => setSelectedId(scenario.id)}
                                className={`relative group cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden
                  ${selectedId === scenario.id
                                        ? 'bg-cyan-900/10 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                                        : 'bg-[#151a21] border-white/5 hover:border-cyan-500/50 hover:bg-[#1a202c]'
                                    }`}
                            >
                                <div className="p-8">
                                    {/* Badge */}
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase
                      ${scenario.badge === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                scenario.badge === 'HIGH LOAD' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            }`}
                                        >
                                            {scenario.badge}
                                        </span>
                                        <span className="text-xs font-mono text-gray-500">{scenario.code}</span>
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">
                                        {scenario.name}
                                    </h3>
                                    <p className="text-gray-400 mb-8 line-clamp-3">
                                        {scenario.description}
                                    </p>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-black/20 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                                <AlertTriangle className="w-3 h-3" /> COMPLEXITY
                                            </div>
                                            <div className="font-mono text-sm font-semibold">{scenario.complexity}</div>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                                <Users className="w-3 h-3" /> AGENTS
                                            </div>
                                            <div className="font-mono text-sm font-semibold">{scenario.agents}</div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {scenario.features.map((feature, idx) => (
                                            <span key={idx} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action */}
                                    <div className={`flex items-center justify-end transition-opacity duration-300
                    ${selectedId === scenario.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (initializing) return;
                                                setSelectedId(scenario.id); // Ensure scenario is selected
                                                handleStartSimulation(scenario.id);
                                            }}
                                            disabled={initializing}
                                            className={`flex items-center gap-2 bg-cyan-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-cyan-400 transition-colors ${initializing ? 'opacity-75 cursor-wait' : ''}`}
                                        >
                                            {initializing ? (
                                                <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                            {initializing ? 'STARTING...' : 'INITIALIZE'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioSelection;
