
import os
import subprocess
import sys

# Configuration
SUMO_HOME = r"C:\Program Files (x86)\Eclipse\Sumo"
NETCONVERT = os.path.join(SUMO_HOME, "bin", "netconvert.exe")
NETGENERATE = os.path.join(SUMO_HOME, "bin", "netgenerate.exe")
RANDOMTRIPS = os.path.join(SUMO_HOME, "tools", "randomTrips.py")
PYTHON_EXEC = sys.executable

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NETWORKS_DIR = os.path.join(BASE_DIR, "sumo", "networks")

def run_cmd(cmd, desc):
    print(f"  {desc}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error {desc}: {result.stderr}")
        return False
    return True

def create_sumo_config(target_dir, net_name, route_name):
    config_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{net_name}"/>
        <route-files value="{route_name}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="5400"/>
    </time>
</configuration>
"""
    with open(os.path.join(target_dir, "sumo_config.sumocfg"), "w") as f:
        f.write(config_content)

def generate_single_intersection():
    name = "single_intersection"
    print(f"Processing {name}...")
    target_dir = os.path.join(NETWORKS_DIR, name)
    os.makedirs(target_dir, exist_ok=True)
    
    # Define custom nodes, edges, connections for precise control
    # 4 arms, 500m long.
    # Center at 0,0
    
    nodes_xml = os.path.join(target_dir, "single.nod.xml")
    edges_xml = os.path.join(target_dir, "single.edg.xml")
    con_xml = os.path.join(target_dir, "single.con.xml")
    net_path = os.path.join(target_dir, "single.net.xml")
    
    # 1. Nodes
    with open(nodes_xml, "w") as f:
        f.write("""<?xml version="1.0" encoding="UTF-8"?>
<nodes xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/nodes_file.xsd">
    <node id="C" x="0.0" y="0.0" type="traffic_light"/>
    <node id="N" x="0.0" y="500.0" type="priority"/>
    <node id="S" x="0.0" y="-500.0" type="priority"/>
    <node id="E" x="500.0" y="0.0" type="priority"/>
    <node id="W" x="-500.0" y="0.0" type="priority"/>
</nodes>
""")

    # 2. Edges (2 lanes each)
    # Incoming to C
    # Outgoing from C
    with open(edges_xml, "w") as f:
        f.write("""<?xml version="1.0" encoding="UTF-8"?>
<edges xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/edges_file.xsd">
    <edge id="N2C" from="N" to="C" numLanes="2" speed="13.89" priority="78"/>
    <edge id="S2C" from="S" to="C" numLanes="2" speed="13.89" priority="78"/>
    <edge id="E2C" from="E" to="C" numLanes="2" speed="13.89" priority="78"/>
    <edge id="W2C" from="W" to="C" numLanes="2" speed="13.89" priority="78"/>
    
    <edge id="C2N" from="C" to="N" numLanes="2" speed="13.89" priority="78"/>
    <edge id="C2S" from="C" to="S" numLanes="2" speed="13.89" priority="78"/>
    <edge id="C2E" from="C" to="E" numLanes="2" speed="13.89" priority="78"/>
    <edge id="C2W" from="C" to="W" numLanes="2" speed="13.89" priority="78"/>
</edges>
""")

    # 3. Connections
    # Lane 1 (Leftmost): Left turn only
    # Lane 0 (Rightmost): Straight + Right
    # Sumo lane indexing: 0 is rightmost, max is leftmost.
    # N2C (North to Center):
    #   Lane 1 -> Left to C2E
    #   Lane 0 -> Straight to C2S, Right to C2W
    with open(con_xml, "w") as f:
        f.write("""<?xml version="1.0" encoding="UTF-8"?>
<connections xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/connections_file.xsd">
    <!-- N incoming -->
    <connection from="N2C" to="C2E" fromLane="1" toLane="1"/> <!-- Left -->
    <connection from="N2C" to="C2S" fromLane="0" toLane="0"/> <!-- Straight -->
    <connection from="N2C" to="C2W" fromLane="0" toLane="0"/> <!-- Right -->

    <!-- S incoming -->
    <connection from="S2C" to="C2W" fromLane="1" toLane="1"/> <!-- Left -->
    <connection from="S2C" to="C2N" fromLane="0" toLane="0"/> <!-- Straight -->
    <connection from="S2C" to="C2E" fromLane="0" toLane="0"/> <!-- Right -->

    <!-- E incoming -->
    <connection from="E2C" to="C2S" fromLane="1" toLane="1"/> <!-- Left -->
    <connection from="E2C" to="C2W" fromLane="0" toLane="0"/> <!-- Straight -->
    <connection from="E2C" to="C2N" fromLane="0" toLane="0"/> <!-- Right -->

    <!-- W incoming -->
    <connection from="W2C" to="C2N" fromLane="1" toLane="1"/> <!-- Left -->
    <connection from="W2C" to="C2E" fromLane="0" toLane="0"/> <!-- Straight -->
    <connection from="W2C" to="C2S" fromLane="0" toLane="0"/> <!-- Right -->
</connections>
""")

    # 4. Build Net
    cmd = [
        NETCONVERT,
        "--node-files", nodes_xml,
        "--edge-files", edges_xml,
        "--connection-files", con_xml,
        "-o", net_path,
        "--tls.default-type", "actuated",
        "--tls.guess-signals",
        "--tls.allred.time", "2",
        "--tls.yellow.time", "3"
    ]
    if run_cmd(cmd, "Building Single Intersection Network"):
        # 5. Generate Trips
        trips_path = os.path.join(target_dir, "trips.trips.xml")
        routes_path = os.path.join(target_dir, "routes.rou.xml")
        
        cmd_trips = [
            PYTHON_EXEC,
            RANDOMTRIPS,
            "-n", net_path,
            "-o", trips_path,
            "-r", routes_path,
            "-e", "3600",
            "-p", "1.0", # moderate traffic
            "--validate"
        ]
        run_cmd(cmd_trips, "Generating Trips")
        
        create_sumo_config(target_dir, "single.net.xml", "routes.rou.xml")
        print("Finished Single Intersection.")

def generate_grid_network():
    name = "grid_network"
    print(f"Processing {name}...")
    target_dir = os.path.join(NETWORKS_DIR, name)
    os.makedirs(target_dir, exist_ok=True)
    
    net_path = os.path.join(target_dir, "grid.net.xml")
    
    # 4 x 3 Grid = 12 Intersections
    # 200m spacing
    # default lanes option is -L or --default.lanes? 
    # help says: --default.lanes is not there. It seems default.lanes is for netconvert?
    # For netgenerate, it's -L or --lanes? No wait. 
    # Let's check docs or try -L.
    # Looking at common usage, it is often --default.lanes if using netconvert on plain XML. 
    # netgenerate accepts specific options.
    # Based on online docs for netgenerate:
    # --default.lanes INT : Number of lanes in an edge
    # Warning message said: "No option with the name 'default.lanes' exists."
    # Let's try --default-lanes? Or maybe it's just --default-lanes is only in netconvert?
    # netgenerate has --spider.arm-number, --grid.x-number etc.
    # Standard options: --default.lanenumber ? 
    # It might be `-L` (capital L). The help output was truncated so I couldn't see all.
    # Let's assume standard default is 1, and I want 2.
    # I will try `-L 2`.
    
    cmd = [
        NETGENERATE,
        "--grid",
        "--grid.x-number", "4",
        "--grid.y-number", "3",
        "--grid.length", "200",
        "-L", "2",  # Trying short option for lanes
        "--default.speed", "13.89",
        "--tls.guess", 
        "--tls.default-type", "actuated",
        "-o", net_path
    ]
    
    if run_cmd(cmd, "Building Grid Network"):
        trips_path = os.path.join(target_dir, "trips.trips.xml")
        routes_path = os.path.join(target_dir, "routes.rou.xml")
        
        cmd_trips = [
            PYTHON_EXEC,
            RANDOMTRIPS,
            "-n", net_path,
            "-o", trips_path,
            "-r", routes_path,
            "-e", "3600",
            "-p", "2.0",
            "--validate"
        ]
        run_cmd(cmd_trips, "Generating Trips")
        
        create_sumo_config(target_dir, "grid.net.xml", "routes.rou.xml")
        print("Finished Grid Network.")

if __name__ == "__main__":
    generate_single_intersection()
    generate_grid_network()
