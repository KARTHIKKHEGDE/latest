import numpy as np

class CurveGenerator:
    @staticmethod
    def generate_fixed_waiting_time(steps):
        """
        Simulates increasing congestion over time.
        Fixed-time controller gets worse as traffic builds up.
        """
        # Random starting waiting time (Low traffic initially)
        # User Req: First 20s < 20-30s
        start_wait = np.random.uniform(22, 28)
        
        # Random ending waiting time (Heavy congestion)
        # User Req: Increase till 80-120s
        end_wait = np.random.uniform(95, 115)
        
        # Normalized time
        t = np.linspace(0, 1, steps)
        
        # Non-linear congestion growth
        # Uses quadratic + linear blend (mimics real traffic buildup)
        base_curve = start_wait + (end_wait - start_wait) * (0.6 * t + 0.4 * t**2)
        
        # Add realistic micro-fluctuations (High Variance)
        noise = np.random.normal(0, 8.0, steps)  # Increased noise from 2.5 to 8.0
        # Light smoothing to keep it jagged but readable
        smoothed_noise = np.convolve(noise, np.ones(3)/3, mode='same')
        
        # Combine
        fixed_wait = base_curve + smoothed_noise
        
        # Ensure values stay in realistic bounds
        fixed_wait = np.clip(fixed_wait, start_wait * 0.8, end_wait * 1.1)
        
        return fixed_wait

    @staticmethod
    def generate_improvement_curve(steps, metric_type='waiting_time'):
        """
        Creates phase-based learning curve with proper RL characteristics.
        """
        # Metric-specific ranges
        ranges = {
            'waiting_time': {'start': (0.07, 0.15), 'sat': (0.44, 0.67)},   # User Req: 44-67%
            'queue_length': {'start': (0.05, 0.12), 'sat': (0.25, 0.33)},   # User Req: 25-33%
            'throughput':   {'start': (0.08, 0.14), 'sat': (0.32, 0.39)},   # User Req: 32-39%
            'efficiency':   {'start': (0.12, 0.18), 'sat': (0.35, 0.70)}
        }
        
        config = ranges.get(metric_type, ranges['waiting_time'])
        
        # Random start and saturation within bounds
        start_improvement = np.random.uniform(*config['start'])
        saturation_improvement = np.random.uniform(*config['sat'])
        
        # Initialize curve
        t = np.linspace(0, 1, steps)
        curve = np.zeros(steps)
        curve[0] = start_improvement
        
        # Random learning rate for mid-phase
        k_mid = np.random.uniform(3.0, 6.0)
        
        # PHASE-BASED GENERATION
        for i in range(1, steps):
            ti = t[i]
            
            # EARLY PHASE (0-20%): Exploration, almost flat but volatile
            if ti < 0.20:
                k = np.random.uniform(0.05, 0.15)
                
            # MID PHASE (20-70%): Active learning, steep climb
            elif ti < 0.70:
                k = k_mid
                
            # LATE PHASE (70-100%): Convergence
            else:
                k = np.random.uniform(0.01, 0.05)  
            
            # Calculate incremental improvement
            delta = (saturation_improvement - curve[i-1]) * k * (1.0 / steps)
            
            # Add stochastic noise (High Variance for RL learning)
            noise = np.random.normal(0, 0.015) # Increased from 0.003
            
            # Update curve
            curve[i] = curve[i-1] + delta + noise
        
        # Add oscillation in late phase
        late_start_idx = int(0.7 * steps)
        oscillation_amplitude = np.random.uniform(0.02, 0.04) # Increased oscillation
        if steps > late_start_idx:
            oscillation = oscillation_amplitude * np.sin(
                np.linspace(0, 12 * np.pi, steps - late_start_idx) # Faster oscillation
            )
            curve[late_start_idx:] += oscillation
        
        # Final clipping
        curve = np.clip(curve, start_improvement * 0.8, saturation_improvement * 1.1)
        
        return curve

    @staticmethod
    def generate_rl_values(fixed_values, improvement_curve):
        """
        Derives RL performance from fixed baseline and improvement curve.
        """
        steps = len(fixed_values)
        
        # Policy stochasticity (High Variance)
        policy_noise = np.random.normal(0, 5.0, steps) # Increased from 1.5
        policy_noise = np.convolve(policy_noise, np.ones(2)/2, mode='same') # Less smoothing
        
        # Core calculation
        rl_values = fixed_values * (1 - improvement_curve) + policy_noise
        
        # Ensure RL never exceeds Fixed (worse than baseline) too much
        rl_values = np.minimum(rl_values, fixed_values * 0.98)
        
        # Ensure RL isn't unrealistically better
        rl_values = np.maximum(rl_values, fixed_values * 0.2)
        
        return rl_values

    @staticmethod
    def generate_rl_throughput(fixed_values, improvement_curve):
        """
        Derives RL throughput (HIGHER is better).
        """
        steps = len(fixed_values)
        policy_noise = np.random.normal(0, 15, steps) # Increased noise
        
        # Throughput increases with improvement
        rl_values = fixed_values * (1 + improvement_curve) + policy_noise
        
        return rl_values

    @classmethod
    def generate_complete_training_data(cls):
        """
        Generates all data for one training run across multiple metrics.
        """
        # Step 1: Random duration
        duration_sec = np.random.uniform(120, 180) # 2-3 minutes
        step_length = 0.5 # 0.5s resolution for smooth real-time playback
        steps = int(duration_sec / step_length)

        
        time_seconds = np.arange(steps) * step_length
        
        # --- Waiting Time (Lower is Better) ---
        wait_fixed = cls.generate_fixed_waiting_time(steps)
        wait_imp = cls.generate_improvement_curve(steps, 'waiting_time')
        wait_rl = cls.generate_rl_values(wait_fixed, wait_imp)
        
        # --- Queue Length (Lower is Better) ---
        # Queue roughly correlates with waiting time but with different scale
        queue_scale_factor = np.random.uniform(0.15, 0.25)
        queue_fixed = wait_fixed * queue_scale_factor + np.random.normal(0, 1, steps)
        queue_imp = cls.generate_improvement_curve(steps, 'queue_length')
        queue_rl = cls.generate_rl_values(queue_fixed, queue_imp)
        
        # --- Throughput (Higher is Better) ---
        # Throughput is roughly inverse of congestion, or just increasing over time as more cars enter?
        # Actually, if congestion is high (wait time high), throughput might saturate or drop.
        # But usually throughput is "cars served".
        # Let's generate a base throughput that climbs then plateaus
        t = np.linspace(0, 1, steps)
        thru_base = 800 + 400 * np.sin(t * np.pi / 2) + np.random.normal(0, 10, steps) # Base flow
        thru_fixed = thru_base  # Fixed serves this much
        thru_imp = cls.generate_improvement_curve(steps, 'throughput')
        thru_rl = cls.generate_rl_throughput(thru_fixed, thru_imp)

        # --- Efficiency (Higher is Better) ---
        # Synthetic score
        eff_fixed = np.random.uniform(40, 60, steps) # Baseline efficiency usually low/steady
        eff_imp = cls.generate_improvement_curve(steps, 'efficiency')
        eff_rl = eff_fixed * (1 + eff_imp * 1.5) # RL boosts efficiency significantly

        return {
            'duration': duration_sec,
            'time_points': time_seconds.tolist(),
            'metrics': {
                'waiting_time': {
                    'fixed': wait_fixed.tolist(),
                    'rl': wait_rl.tolist(),
                    'improvement': (wait_imp * 100).tolist()
                },
                'queue_length': {
                    'fixed': queue_fixed.tolist(),
                    'rl': queue_rl.tolist(),
                    'improvement': (queue_imp * 100).tolist()
                },
                'throughput': {
                    'fixed': thru_fixed.tolist(),
                    'rl': thru_rl.tolist(),
                    'improvement': (thru_imp * 100).tolist()
                },
                'efficiency': {
                    'fixed': eff_fixed.tolist(),
                    'rl': eff_rl.tolist(),
                    'improvement': (eff_imp * 100).tolist()
                }
            },
            'summary': {
                'waiting_time_improvement': float(wait_imp[-1] * 100),
                'queue_improvement': float(queue_imp[-1] * 100),
                'throughput_increase': float(thru_imp[-1] * 100),
                'rl_avg_wait': float(np.mean(wait_rl)),
                'fixed_avg_wait': float(np.mean(wait_fixed))
            }
        }
