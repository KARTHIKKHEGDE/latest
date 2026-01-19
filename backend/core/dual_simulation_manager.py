"""
Dual Simulation Manager
Orchestrates parallel execution of Fixed-Time and RL-based traffic control
"""
import os
import sys
import traci
import numpy as np
from typing import Dict, List, Tuple, Optional
import time
import threading
import queue

# Add parent directory to import traffic generator
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from generator import TrafficGenerator

from .rl_agent import RLAgent
from .fixed_time_controller import FixedTimeController


class DualSimulationManager:
    """
    Manages two parallel SUMO simulations:
    1. Fixed-time control (baseline)
    2. RL-based adaptive control
    
    Both simulations receive identical traffic demand for fair comparison.
    """
    
    def __init__(
        self,
        network_path: str,
        model_path: str,
        max_steps: int = 5400,
        n_cars: int = 1000,
        green_duration_rl: int = 10,
        green_duration_fixed: int = 30,
        yellow_duration: int = 4,
        gui: bool = False,
        seed: int = 42
    ):
        """
        Initialize dual simulation manager.
        
        Args:
            network_path: Path to SUMO network directory
            model_path: Path to trained RL model
            max_steps: Maximum simulation steps
            n_cars: Number of cars to generate
            green_duration_rl: Green duration for RL agent
            green_duration_fixed: Green duration for fixed-time controller
            yellow_duration: Yellow phase duration
            gui: Whether to show SUMO GUI
            seed: Random seed for reproducibility
        """
        self.network_path = network_path
        self.model_path = model_path
        self.max_steps = max_steps
        self.n_cars = n_cars
        self.green_duration_rl = green_duration_rl
        self.green_duration_fixed = green_duration_fixed
        self.yellow_duration = yellow_duration
        self.gui = gui
        self.seed = seed
        
        # SUMO configuration - Try to find SUMO binary
        self.sumo_binary = self._find_sumo_binary(gui)
        print(f"Using SUMO binary: {self.sumo_binary}")
        
        # Traffic generator
        self.traffic_gen = TrafficGenerator(
            max_steps=max_steps,
            n_cars_generated=n_cars
        )
        
        # Simulation state
        self.is_running = False
        self.current_step = 0
        
        # Controllers (initialized when simulation starts)
        self.rl_agent: Optional[RLAgent] = None
        self.fixed_controller: Optional[FixedTimeController] = None
        
        # Metrics storage
        self.rl_metrics = []
        self.fixed_metrics = []
        
        # Real-time data queue for WebSocket streaming
        self.data_queue = queue.Queue()
    
    def _find_sumo_binary(self, gui: bool) -> str:
        """
        Find SUMO binary in system PATH or common installation locations.
        """
        import shutil
        
        binary_name = "sumo-gui" if gui else "sumo"
        
        # First, try to find in PATH
        sumo_path = shutil.which(binary_name)
        if sumo_path:
            return binary_name
        
        # Try common Windows installation paths
        common_paths = [
            r"C:\Program Files (x86)\Eclipse\Sumo\bin",
            r"C:\Program Files\Eclipse\Sumo\bin",
            r"C:\Sumo\bin",
            os.path.join(os.environ.get("SUMO_HOME", ""), "bin")
        ]
        
        for path in common_paths:
            if not path:
                continue
            full_path = os.path.join(path, f"{binary_name}.exe")
            if os.path.exists(full_path):
                return full_path
        
        # If not found, return the binary name and hope it's in PATH
        print(f"⚠️  Warning: {binary_name} not found in common locations")
        print("   Make sure SUMO is installed and added to your system PATH")
        print("   Or set the SUMO_HOME environment variable")
        return binary_name
        
    def initialize(self):
        """
        Initialize simulation environment and controllers.
        """
        # Generate route file with same seed for both simulations
        route_file = os.path.join(self.network_path, "episode_routes.rou.xml")
        self.traffic_gen.generate_routefile(seed=self.seed)
        
        # Move generated route file to network directory
        src_route = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "intersection",
            "episode_routes.rou.xml"
        )
        if os.path.exists(src_route):
            try:
                import shutil
                shutil.copy(src_route, route_file)
            except Exception as e:
                print(f"Warning: Could not copy route file: {e}")

        # Start SUMO
        sumocfg = os.path.join(self.network_path, "sumo_config.sumocfg")
        
        self.sumo_cmd = [
            self.sumo_binary,
            "-c", sumocfg,
            "--no-step-log", "true",
            "--waiting-time-memory", "10000",
            "--time-to-teleport", "-1",
            "--seed", str(self.seed),
            "--start"
        ]
        
        # Discover Traffic Lights
        # We need to start TRACI momentarily to get IDs, then close? 
        # Or just initialize lists and populate them inside run_simulation?
        # Populating inside run_simulation is safer as TRACI connection is active then.
        print("✓ Simulation manager configured")
        print(f"  Network: {self.network_path}")
        
    
    def run_simulation(self, strategy: str = "both") -> Dict:
        """
        Run simulation with specified strategy.
        Supports simultaneous parallel execution for 'both' strategy.
        """
        results = {}
        # self.is_running will be set after successful start
        self.rl_metrics = []
        self.fixed_metrics = []
        
        # --- PARELLEL EXECUTION (Both Windows Simultaneously) ---
        if strategy == "both":
            print("\n🚦 Starting Dual-Window Parallel Simulation...")
            print("  Window 1 (RL Agent) | Window 2 (Fixed-Time Controller)")
            
            # Force Cleanup & Restart logic (No early return)
            try:
                # Cleanup existing connections if any
                try: traci.getConnection("RL").close()
                except: pass
                try: traci.getConnection("Fixed").close()
                except: pass
                
                # Start both SUMO instances with unique labels
                print(f"DEBUG: Launching SUMO with cmd: {self.sumo_cmd}")
                traci.start(self.sumo_cmd, label="RL")
                traci.start(self.sumo_cmd, label="Fixed")
                
                # Set Running Flag AFTER successful start
                self.is_running = True
                
                conn_rl = traci.getConnection("RL")
                conn_fixed = traci.getConnection("Fixed")
                
                # 1. Discover Traffic Lights (assume same for both as same network)
                tls_ids = conn_rl.trafficlight.getIDList()
                print(f"  Found {len(tls_ids)} traffic lights")
                
                # 2. Instantiate Controllers
                rl_agents = []
                fixed_agents = []
                
                for tls_id in tls_ids:
                    # RL Agents bound to RL connection
                    rl_agents.append(RLAgent(
                        tls_id=tls_id,
                        model_path=self.model_path,
                        connection=conn_rl,
                        green_duration=self.green_duration_rl,
                        yellow_duration=self.yellow_duration
                    ))
                    
                    # Fixed Agents bound to Fixed connection
                    fixed_agents.append(FixedTimeController(
                        tls_id=tls_id,
                        connection=conn_fixed,
                        green_duration=self.green_duration_fixed,
                        yellow_duration=self.yellow_duration
                    ))
                
                # 3. Interleaved Simulation Loop
                step = 0
                start_time = time.time()
                
                print(f"  Simulating parallel ({len(tls_ids)} intersections)...")
                
                while step < self.max_steps and self.is_running:
                    # Step both simulations
                    conn_rl.simulationStep()
                    conn_fixed.simulationStep()
                    
                    # --- RL STEP ---
                    rl_arrived = conn_rl.simulation.getArrivedNumber()
                    rl_step_metrics = {'waiting_time': 0, 'queue_length': 0, 'throughput': rl_arrived}
                    for agent in rl_agents:
                        m = agent.step(step)
                        rl_step_metrics['waiting_time'] += m.get('waiting_time', 0)
                        rl_step_metrics['queue_length'] += m.get('queue_length', 0)
                    self.rl_metrics.append(rl_step_metrics)
                    
                    # --- FIXED STEP ---
                    fixed_arrived = conn_fixed.simulation.getArrivedNumber()
                    fixed_step_metrics = {'waiting_time': 0, 'queue_length': 0, 'throughput': fixed_arrived}
                    for agent in fixed_agents:
                        m = agent.step(step)
                        fixed_step_metrics['waiting_time'] += m.get('waiting_time', 0)
                        fixed_step_metrics['queue_length'] += m.get('queue_length', 0)
                    self.fixed_metrics.append(fixed_step_metrics)
                    
                    # Queue data for frontend (combine both)
                    self.data_queue.put({
                        'step': step,
                        'controller': 'both',
                        'rl_metrics': rl_step_metrics,
                        'fixed_metrics': fixed_step_metrics
                    })
                    
                    step += 1
                    if step % 1000 == 0:
                        print(f"    Step {step}/{self.max_steps}")
                
                elapsed = time.time() - start_time
                print(f"  ✓ Parallel simulation complete ({elapsed:.1f}s)")
                
                # Cleanup
                try:
                    conn_rl.close()
                    conn_fixed.close()
                except: pass
                
                results['rl'] = self._calc_final_metrics(self.rl_metrics, elapsed, "RL")
                results['fixed'] = self._calc_final_metrics(self.fixed_metrics, elapsed, "Fixed")
                
            except Exception as e:
                print(f"Simulation Error: {e}")
                import traceback
                traceback.print_exc()
                try:
                    traci.close() # Close any dangling
                except: pass
                
                
            self.is_running = False
            return results
        
        # --- SINGLE EXECUTION ---
        if strategy == "rl":
            print("\n🚦 Running RL-based simulation...")
            results['rl'] = self._run_single_simulation("RL")
            
        if strategy == "fixed":
            print("\n🚦 Running Fixed-time simulation...")
            results['fixed'] = self._run_single_simulation("Fixed")
            
        self.is_running = False
        return results

    def _calc_final_metrics(self, metrics_list, elapsed, name):
        avg_wait = np.mean([m['waiting_time'] for m in metrics_list]) if metrics_list else 0
        avg_queue = np.mean([m['queue_length'] for m in metrics_list]) if metrics_list else 0
        return {
            'avg_waiting_time': avg_wait,
            'avg_queue_length': avg_queue,
            'simulation_time': elapsed,
            'controller': name
        }

    def _run_single_simulation(self, name: str) -> Dict:
        """
        Run a single simulation (RL or Fixed).
        """
        try:
            traci.start(self.sumo_cmd, label=name)
            conn = traci.getConnection(name)
            
            tls_ids = conn.trafficlight.getIDList()
            controllers = []
            
            for tls_id in tls_ids:
                if name == "RL":
                    controllers.append(RLAgent(
                        tls_id=tls_id,
                        model_path=self.model_path,
                        connection=conn,
                        green_duration=self.green_duration_rl,
                        yellow_duration=self.yellow_duration
                    ))
                else:
                    controllers.append(FixedTimeController(
                        tls_id=tls_id,
                        connection=conn,
                        green_duration=self.green_duration_fixed,
                        yellow_duration=self.yellow_duration
                    ))
            
            print(f"  Simulating {name}...")
            step = 0
            start_time = time.time()
            metrics_storage = self.rl_metrics if name == "RL" else self.fixed_metrics
            
            while step < self.max_steps and self.is_running:
                conn.simulationStep()
                
                step_metrics = {'waiting_time': 0, 'queue_length': 0}
                for agent in controllers:
                    m = agent.step(step)
                    step_metrics['waiting_time'] += m.get('waiting_time', 0)
                    step_metrics['queue_length'] += m.get('queue_length', 0)
                
                metrics_storage.append(step_metrics)
                
                self.data_queue.put({
                    'step': step,
                    'controller': name,
                    'metrics': step_metrics
                })
                step += 1
            
            elapsed = time.time() - start_time
            conn.close()
            return self._calc_final_metrics(metrics_storage, elapsed, name)
            
        except Exception as e:
            print(f"Error in {name}: {e}")
            try: traci.close()
            except: pass
            return {}
    
    def get_comparison_metrics(self) -> Dict:
        """
        Get comparative analysis between RL and Fixed-time control.
        
        Returns:
            Comparison metrics
        """
        if not self.rl_metrics or not self.fixed_metrics:
            return {}
        
        # Extract time series data
        rl_waiting = [m['waiting_time'] for m in self.rl_metrics]
        fixed_waiting = [m['waiting_time'] for m in self.fixed_metrics]
        
        rl_queue = [m['queue_length'] for m in self.rl_metrics]
        fixed_queue = [m['queue_length'] for m in self.fixed_metrics]

        # Calculate Throughput (Total Arrived)
        rl_throughput = sum([m.get('throughput', 0) for m in self.rl_metrics])
        fixed_throughput = sum([m.get('throughput', 0) for m in self.fixed_metrics])
        
        # Calculate improvements
        avg_wait_improvement = (
            (np.mean(fixed_waiting) - np.mean(rl_waiting)) / np.mean(fixed_waiting) * 100
        ) if np.mean(fixed_waiting) > 0 else 0
        
        avg_queue_improvement = (
            (np.mean(fixed_queue) - np.mean(rl_queue)) / np.mean(fixed_queue) * 100
        ) if np.mean(fixed_queue) > 0 else 0

        throughput_improvement = (
            (rl_throughput - fixed_throughput) / fixed_throughput * 100
        ) if fixed_throughput > 0 else 0
        
        return {
            'rl': {
                'avg_waiting_time': float(np.mean(rl_waiting)),
                'avg_queue_length': float(np.mean(rl_queue)),
                'max_waiting_time': float(np.max(rl_waiting)),
                'max_queue_length': float(np.max(rl_queue)),
                'total_throughput': int(rl_throughput)
            },
            'fixed': {
                'avg_waiting_time': float(np.mean(fixed_waiting)),
                'avg_queue_length': float(np.mean(fixed_queue)),
                'max_waiting_time': float(np.max(fixed_waiting)),
                'max_queue_length': float(np.max(fixed_queue)),
                'total_throughput': int(fixed_throughput)
            },
            'improvement': {
                'waiting_time_reduction': float(avg_wait_improvement),
                'queue_length_reduction': float(avg_queue_improvement),
                'throughput_increase': float(throughput_improvement)
            },
            'time_series': {
                'rl_waiting': rl_waiting[::10],  # Downsample for efficiency
                'fixed_waiting': fixed_waiting[::10],
                'rl_queue': rl_queue[::10],
                'fixed_queue': fixed_queue[::10]
            }
        }
    
    def get_realtime_data(self) -> Optional[Dict]:
        """
        Get real-time data from queue (non-blocking).
        
        Returns:
            Latest simulation data or None
        """
        try:
            return self.data_queue.get_nowait()
        except queue.Empty:
            return None
    
    def stop(self):
        """Stop simulation."""
        self.is_running = False
        # Try to close specific labeled connections first
        try: traci.getConnection("RL").close()
        except: pass
        try: traci.getConnection("Fixed").close()
        except: pass
        # Try standard close as fallback
        try: traci.close() 
        except: pass
