"""
Scenarios API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class Scenario(BaseModel):
    id: str
    name: str
    code: str
    complexity: str
    agents: str
    description: str
    badge: str
    features: List[str]


@router.get("/list")
async def list_scenarios() -> List[Scenario]:
    """
    Get list of available simulation scenarios.
    """
    scenarios = [
        Scenario(
            id="single",
            name="JUST ONE INTERSECTION",
            code="SCENARIO_001",
            complexity="LOW",
            agents="01",
            description="Focus on peak-hour management for a single high-density four-way intersection. Ideal for testing baseline heuristic measures.",
            badge="CRITICAL",
            features=["Deploy Logic Immediately", "Single Junction Analysis", "High-Density Traffic"]
        ),
        Scenario(
            id="grid",
            name="12-15 INTERSECTIONS",
            code="SCENARIO_012",
            complexity="HIGH",
            agents="12+",
            description="Full grid network simulation. Orchestrate traffic across multiple junctions to minimize green-waste throughput using synchronized heuristic agents.",
            badge="HIGH LOAD",
            features=["Enterprise Load Test", "Network Coordination", "Multi-Junction Optimization"]
        ),
        Scenario(
            id="bangalore_silk_board",
            name="BANGALORE - SILK BOARD JUNCTION",
            code="SCENARIO_BLR_001",
            complexity="EXTREME",
            agents="01",
            description="Real-world simulation of Bangalore's most congested intersection (Silk Board). 150m radius scope focusing on the central junction dynamics.",
            badge="REAL WORLD",
            features=["Actual Road Network", "Observed Traffic Data", "Complex Geometry"]
        ),
        Scenario(
            id="bangalore_hosmat",
            name="BANGALORE - HOSMAT MAP",
            code="SCENARIO_BLR_002",
            complexity="HIGH",
            agents="04",
            description="Real-world simulation of the Hosmat Hospital Junction. Specific focus on ambulance priority lanes and mixed vehicle dynamics.",
            badge="REAL WORLD",
            features=["Ambulance Priority", "Hospital Zone Logic", "Mixed Vehicle Types"]
        )
    ]
    
    return scenarios


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str) -> Scenario:
    """
    Get details of a specific scenario.
    """
    scenarios = await list_scenarios()
    
    for scenario in scenarios:
        if scenario.id == scenario_id:
            return scenario
    
    return None
