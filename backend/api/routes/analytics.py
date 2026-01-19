"""
Analytics API Routes
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List
import numpy as np

router = APIRouter()

# In-memory storage for analytics data
analytics_data: Dict = {
    'rl': [],
    'fixed': []
}


@router.get("/metrics")
async def get_metrics() -> Dict:
    """
    Get current performance metrics for both controllers.
    """
    if not analytics_data['rl'] or not analytics_data['fixed']:
        return {
            'rl': {
                'waiting_time': 0,
                'queue_length': 0,
                'throughput': 0
            },
            'fixed': {
                'waiting_time': 0,
                'queue_length': 0,
                'throughput': 0
            }
        }
    
    # Get latest metrics
    rl_latest = analytics_data['rl'][-1] if analytics_data['rl'] else {}
    fixed_latest = analytics_data['fixed'][-1] if analytics_data['fixed'] else {}
    
    return {
        'rl': rl_latest,
        'fixed': fixed_latest
    }


@router.get("/comparison")
async def get_comparison() -> Dict:
    """
    Get comparative analysis between RL and Fixed-time control.
    """
    if not analytics_data['rl'] or not analytics_data['fixed']:
        raise HTTPException(status_code=404, detail="No data available")
    
    # Extract metrics
    rl_waiting = [d.get('waiting_time', 0) for d in analytics_data['rl']]
    fixed_waiting = [d.get('waiting_time', 0) for d in analytics_data['fixed']]
    
    rl_queue = [d.get('queue_length', 0) for d in analytics_data['rl']]
    fixed_queue = [d.get('queue_length', 0) for d in analytics_data['fixed']]
    
    # Calculate improvements
    avg_wait_improvement = 0
    avg_queue_improvement = 0
    
    if np.mean(fixed_waiting) > 0:
        avg_wait_improvement = (
            (np.mean(fixed_waiting) - np.mean(rl_waiting)) / np.mean(fixed_waiting) * 100
        )
    
    if np.mean(fixed_queue) > 0:
        avg_queue_improvement = (
            (np.mean(fixed_queue) - np.mean(rl_queue)) / np.mean(fixed_queue) * 100
        )
    
    return {
        'rl': {
            'avg_waiting_time': float(np.mean(rl_waiting)),
            'avg_queue_length': float(np.mean(rl_queue)),
            'max_waiting_time': float(np.max(rl_waiting)),
            'max_queue_length': float(np.max(rl_queue))
        },
        'fixed': {
            'avg_waiting_time': float(np.mean(fixed_waiting)),
            'avg_queue_length': float(np.mean(fixed_queue)),
            'max_waiting_time': float(np.max(fixed_waiting)),
            'max_queue_length': float(np.max(fixed_queue))
        },
        'improvement': {
            'waiting_time_reduction': float(avg_wait_improvement),
            'queue_length_reduction': float(avg_queue_improvement)
        }
    }


@router.post("/update")
async def update_metrics(data: Dict):
    """
    Update analytics data (called by simulation).
    """
    controller = data.get('controller', '').lower()
    
    if controller == 'rl':
        analytics_data['rl'].append(data.get('metrics', {}))
    elif controller == 'fixed':
        analytics_data['fixed'].append(data.get('metrics', {}))
    
    return {"status": "updated"}


@router.post("/reset")
async def reset_analytics():
    """
    Reset analytics data.
    """
    global analytics_data
    analytics_data = {
        'rl': [],
        'fixed': []
    }
    return {"status": "reset"}
