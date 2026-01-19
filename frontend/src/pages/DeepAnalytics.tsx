
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DeepAnalytics = () => {
    const navigate = useNavigate();

    // Mock data for visualization
    const data = [
        { name: 'Cycle 1', rl: 400, fixed: 240 },
        { name: 'Cycle 2', rl: 300, fixed: 139 },
        { name: 'Cycle 3', rl: 200, fixed: 980 },
        { name: 'Cycle 4', rl: 278, fixed: 390 },
        { name: 'Cycle 5', rl: 189, fixed: 480 },
    ];

    return (
        <div className="min-h-screen bg-[#0a0e14] text-white p-8">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/live')}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <h1 className="text-3xl font-bold">Deep Analytics</h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors">
                        <Share2 className="w-4 h-4" /> Share Report
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#151a21] rounded-2xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold mb-6">Throughput Analysis</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="name" stroke="#ffffff50" />
                                <YAxis stroke="#ffffff50" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Bar dataKey="rl" name="RL Agent" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="fixed" name="Fixed Time" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#151a21] rounded-2xl p-6 border border-white/5 space-y-6">
                    <h3 className="text-lg font-semibold">Key Insights</h3>

                    <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20">
                        <div className="text-sm text-gray-400 mb-1">Overall Efficiency</div>
                        <div className="text-2xl font-bold text-cyan-400">+42.5%</div>
                        <div className="text-xs text-gray-500 mt-2">RL Agent consistently outperforms Fixed Time logic in high-density scenarios.</div>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/20">
                        <div className="text-sm text-gray-400 mb-1">Peak Queue Length</div>
                        <div className="text-2xl font-bold text-purple-400">-18 Vehicles</div>
                        <div className="text-xs text-gray-500 mt-2">Maximum queue length reduced significantly during peak hours.</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeepAnalytics;
