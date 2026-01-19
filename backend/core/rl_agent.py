"""
RL-Based Traffic Signal Controller
Uses the trained Deep Q-Learning model for adaptive traffic control
"""
import os
import sys
import numpy as np
import traci
from typing import Dict, List, Tuple

# Add parent directory to path to import model
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from model import TestModel


class RLAgent:
    """
    Reinforcement Learning agent for traffic signal control.
    Uses trained DQN model to make adaptive decisions based on traffic state.
    """
    
    # Phase codes based on SUMO network configuration
    PHASE_NS_GREEN = 0      # North-South straight
    PHASE_NS_YELLOW = 1
    PHASE_NSL_GREEN = 2     # North-South left turn
    PHASE_NSL_YELLOW = 3
    PHASE_EW_GREEN = 4      # East-West straight
    PHASE_EW_YELLOW = 5
    PHASE_EWL_GREEN = 6     # East-West left turn
    PHASE_EWL_YELLOW = 7
    
    
    def __init__(
        self,
        tls_id: str,
        model_path: str,
        connection, # TraCI connection
        num_states: int = 80,
        num_actions: int = 4,
        green_duration: int = 10,
        yellow_duration: int = 4
    ):
        """
        Initialize RL agent with trained model.
        """
        self.tls_id = tls_id
        self.connection = connection
        self.num_states = num_states
        self.num_actions = num_actions
        self.green_duration = green_duration
        self.yellow_duration = yellow_duration
        
        # Load trained model
        self.model = TestModel(input_dim=num_states, model_path=model_path)
        
        # State tracking
        self.current_phase = 0
        self.time_since_last_change = 0
        self.waiting_times = {}
        self.total_waiting_time = 0
        self.queue_length = 0
        
        # Performance metrics
        self.metrics = {
            'waiting_time': [],
            'queue_length': [],
            'throughput': 0,
            'phase_changes': 0,
            'decisions': []
        }
        
    def step(self, simulation_step: int) -> Dict:
        """
        Execute one decision cycle.
        """
        # Get current traffic state
        state = self._get_state()
        
        # Collect metrics
        self._collect_waiting_times()
        self.queue_length = self._get_queue_length()
        
        # Make decision every green_duration + yellow_duration seconds
        decision_interval = self.green_duration + self.yellow_duration
        
        if self.time_since_last_change >= decision_interval:
            # Choose action using trained model
            action = self._choose_action(state)
            
            # Apply action (with yellow phase transition if needed)
            if action != self.current_phase:
                self._set_yellow_phase(self.current_phase)
                self.current_phase = action
                self.metrics['phase_changes'] += 1
                
            self.time_since_last_change = 0
            
            # Record decision
            self.metrics['decisions'].append({
                'step': simulation_step,
                'state': state.tolist(),
                'action': int(action),
                'waiting_time': self.total_waiting_time,
                'queue_length': self.queue_length
            })
        else:
            # Continue current phase
            if self.time_since_last_change == self.yellow_duration:
                # Yellow phase complete, activate green
                self._set_green_phase(self.current_phase)
        
        self.time_since_last_change += 1
        
        # Update metrics
        self.metrics['waiting_time'].append(self.avg_waiting_time)
        self.metrics['queue_length'].append(self.queue_length)
        
        return {
            'tls_id': self.tls_id,
            'current_phase': int(self.current_phase),
            'waiting_time': float(self.avg_waiting_time),
            'queue_length': int(self.queue_length),
            'time_since_change': int(self.time_since_last_change),
            'state': state.tolist()
        }
    
    def _choose_action(self, state: np.ndarray) -> int:
        """
        Choose action using trained RL model.
        """
        q_values = self.model.predict_one(state)
        action = np.argmax(q_values)
        return action
    
    def _get_state(self) -> np.ndarray:
        """
        Get current traffic state from SUMO.
        """
        state = np.zeros(self.num_states)
        
        try:
            # Dynamically get controlled lanes for this TLS
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            # Remove duplicates (getControlledLanes returns a list with duplicates for multiple connections)
            incoming_lanes = list(set(controlled_lanes))
            
            for lane_id in incoming_lanes:
                lane_group = self._get_lane_group(lane_id)
                if lane_group == -1: continue

                # Get vehicles on this lane
                vehicles = self.connection.lane.getLastStepVehicleIDs(lane_id)
                
                for car_id in vehicles:
                    lane_pos = self.connection.vehicle.getLanePosition(car_id)
                    lane_len = self.connection.lane.getLength(lane_id)
                    
                    # Invert position
                    dist_to_tls = lane_len - lane_pos
                    
                    # Map distance to cell (0-9)
                    if dist_to_tls < 7: lane_cell = 0
                    elif dist_to_tls < 14: lane_cell = 1
                    elif dist_to_tls < 21: lane_cell = 2
                    elif dist_to_tls < 28: lane_cell = 3
                    elif dist_to_tls < 40: lane_cell = 4
                    elif dist_to_tls < 60: lane_cell = 5
                    elif dist_to_tls < 100: lane_cell = 6
                    elif dist_to_tls < 160: lane_cell = 7
                    elif dist_to_tls < 400: lane_cell = 8
                    else: lane_cell = 9
                    
                    # Compose position index (0-79)
                    if lane_group == 0:
                        car_position = lane_cell
                    else:
                        car_position = int(str(lane_group) + str(lane_cell))
                    
                    if car_position < self.num_states:
                        state[car_position] = 1
                    
        except traci.exceptions.TraCIException:
            pass
        
        return state
    
    def _get_lane_group(self, lane_id: str) -> int:
        """
        Map lane ID to lane group index based on compass direction.
        """
        try:
            shape = self.connection.lane.getShape(lane_id)
            if len(shape) < 2: return -1
            
            # Vector from start to end
            x1, y1 = shape[-2]
            x2, y2 = shape[-1]
            dx = x2 - x1
            dy = y2 - y1
            
            # Determine main direction (N=1, E=2, S=3, W=4 approx)
            angle = np.degrees(np.arctan2(dy, dx)) % 360
            
            # Map angle to N/S/E/W
            direction = -1
            if 315 <= angle or angle < 45: # East incoming (Western arm) -> 0,1
                direction = 0 # "W2TL" equivalent
            elif 45 <= angle < 135: # North inbound (Southern arm going North) -> 6,7 (S2TL)
                direction = 6 # "S2TL"
            elif 135 <= angle < 225: # West inbound (Eastern arm) -> 4,5 (E2TL)
                direction = 4 # "E2TL"
            elif 225 <= angle < 315: # South inbound (Northern arm) -> 2,3 (N2TL)
                direction = 2 # "N2TL"
                
            if direction == -1: return -1
            
            # Check if left turn lane
            edge_id = self.connection.lane.getEdgeID(lane_id)
            num_lanes = self.connection.edge.getLaneNumber(edge_id)
            index = int(lane_id.split('_')[-1])
            
            is_left = (index == num_lanes - 1) and num_lanes > 1
            
            return direction + (1 if is_left else 0)
            
        except:
            return -1
    
    def _collect_waiting_times(self):
        """
        Collect waiting times for all vehicles in incoming lanes.
        """
        try:
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            incoming_lanes = list(set(controlled_lanes))
            
            current_waiting_time = 0
            num_waiting_vehicles = 0
            
            for lane in incoming_lanes:
                vehicles = self.connection.lane.getLastStepVehicleIDs(lane)
                for car_id in vehicles:
                    wait_time = self.connection.vehicle.getAccumulatedWaitingTime(car_id)
                    if wait_time > 0:
                        current_waiting_time += wait_time
                        num_waiting_vehicles += 1
            
            self.total_waiting_time = current_waiting_time
            self.avg_waiting_time = self.total_waiting_time / num_waiting_vehicles if num_waiting_vehicles > 0 else 0
            
        except traci.exceptions.TraCIException:
            pass
    
    def _get_queue_length(self) -> int:
        """
        Get total number of halted vehicles in incoming lanes.
        """
        queue_length = 0
        
        try:
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            incoming_lanes = list(set(controlled_lanes))
            
            for lane in incoming_lanes:
                queue_length += self.connection.lane.getLastStepHaltingNumber(lane)
        except traci.exceptions.TraCIException:
            pass
        
        return queue_length
    
    def _set_yellow_phase(self, old_action: int):
        """
        Activate yellow phase for transition.
        """
        yellow_phase_code = old_action * 2 + 1
        try:
            # Check if phase exists
            max_phase = 0
            logics = self.connection.trafficlight.getAllProgramLogics(self.tls_id)
            if logics:
                max_phase = len(logics[0].phases) - 1
            
            if yellow_phase_code <= max_phase:
                self.connection.trafficlight.setPhase(self.tls_id, yellow_phase_code)
        except traci.exceptions.TraCIException:
            pass
    
    def _set_green_phase(self, action: int):
        """
        Activate green phase.
        """
        phase_map = {
            0: self.PHASE_NS_GREEN,
            1: self.PHASE_NSL_GREEN,
            2: self.PHASE_EW_GREEN,
            3: self.PHASE_EWL_GREEN
        }
        
        target_phase = phase_map.get(action, 0)
        
        try:
            # Check if phase exists
            max_phase = 0
            logics = self.connection.trafficlight.getAllProgramLogics(self.tls_id)
            if logics:
                max_phase = len(logics[0].phases) - 1
                
            if target_phase <= max_phase:
                self.connection.trafficlight.setPhase(self.tls_id, target_phase)
            else:
                 # Fallback: modulo or phase 0?
                 self.connection.trafficlight.setPhase(self.tls_id, target_phase % (max_phase + 1))
                 
        except traci.exceptions.TraCIException:
            pass
    
    def get_metrics(self) -> Dict:
        """
        Get performance metrics.
        
        Returns:
            Dictionary with all metrics
        """
        return {
            'avg_waiting_time': np.mean(self.metrics['waiting_time']) if self.metrics['waiting_time'] else 0,
            'avg_queue_length': np.mean(self.metrics['queue_length']) if self.metrics['queue_length'] else 0,
            'total_phase_changes': self.metrics['phase_changes'],
            'decisions': self.metrics['decisions']
        }
    
    def reset(self):
        """Reset agent state for new episode."""
        self.current_phase = 0
        self.time_since_last_change = 0
        self.waiting_times = {}
        self.total_waiting_time = 0
        self.queue_length = 0
        self.metrics = {
            'waiting_time': [],
            'queue_length': [],
            'throughput': 0,
            'phase_changes': 0,
            'decisions': []
        }
