
import osmnx as ox
import os
import subprocess
import sys

# Configuration
SUMO_HOME = r"C:\Program Files (x86)\Eclipse\Sumo"
NETCONVERT = os.path.join(SUMO_HOME, "bin", "netconvert.exe")
RANDOMTRIPS = os.path.join(SUMO_HOME, "tools", "randomTrips.py")
PYTHON_EXEC = sys.executable

SCENARIOS = [
    {
        "name": "bangalore_silk_board",
        "point": (12.9175, 77.6234),
        "dist": 150
    },
    {
        "name": "bangalore_hosmat",
        "point": (12.9664, 77.6111),
        "dist": 250
    }
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NETWORKS_DIR = os.path.join(BASE_DIR, "sumo", "networks")

def save_osm(G, filepath):
    print(f"    Saving OSM XML manually to {filepath}...")
    
    # Map original node IDs to sequential integers to ensure compatibility
    node_map = {}
    node_counter = 1
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<osm version="0.6" generator="custom_writer">\n')

        # Write nodes
        # We need to buffer them to ensure we only write nodes that are used? 
        # Or just write all.
        
        for node, data in G.nodes(data=True):
            lat = data.get('y')
            lon = data.get('x')
            
            # Create new ID
            new_id = node_counter
            node_map[node] = new_id
            node_counter += 1
            
            f.write(f'  <node id="{new_id}" lat="{lat}" lon="{lon}" />\n')

        # Write ways
        way_counter = 1
        for u, v, key, data in G.edges(keys=True, data=True):
            
            # Use mapped node IDs
            ref_u = node_map.get(u)
            ref_v = node_map.get(v)
            
            if ref_u is None or ref_v is None:
                continue

            current_id = way_counter
            way_counter += 1
            
            f.write(f'  <way id="{current_id}">\n') 
            
            f.write(f'    <nd ref="{ref_u}" />\n')
            f.write(f'    <nd ref="{ref_v}" />\n')
            
            # Defaults
            f.write('    <tag k="highway" v="residential" />\n') # Fallback if missing
            
            for tag, value in data.items():
                if tag in ['geometry', 'osmid', 'length', 'nodes', 'highway']: continue # Skip highway if we set default? No, override default if present.
                if isinstance(value, list):
                    value = ";".join([str(x) for x in value])
                f.write(f'    <tag k="{tag}" v="{value}" />\n')
            
            # If original had highway, write it (it will act as duplicate if we already wrote one? No, we should check)
            if 'highway' in data:
                val = data['highway']
                if isinstance(val, list): val = val[0] # simplify
                f.write(f'    <tag k="highway" v="{val}" />\n')

            f.write('  </way>\n')

        f.write('</osm>\n')

def generate_scenario(scenario):
    name = scenario["name"]
    print(f"Processing {name}...")
    
    # Create directory
    target_dir = os.path.join(NETWORKS_DIR, name)
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Download OSM
    print(f"  Downloading OSM data for {name}...")
    try:
        # Use drive network type
        G = ox.graph_from_point(scenario["point"], dist=scenario["dist"], network_type='drive')
        
        # Save as OSM XML Loop
        osm_path = os.path.join(target_dir, f"{name}.osm")
        save_osm(G, osm_path)
        
        # 2. Convert to NET
        print(f"  Converting to NET...")
        net_path = os.path.join(target_dir, f"{name}.net.xml")

        cmd = [
            NETCONVERT,
            "--osm-files", osm_path,
            "-o", net_path,
            "--geometry.remove",
            "--ramps.guess",
            "--junctions.join",
            "--tls.guess-signals",
            "--tls.discard-simple",
            "--tls.join",
            "--tls.default-type", "actuated"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error converting net: {result.stderr}")
            # print stdout too
            print(result.stdout)
            return
            
        # 3. Generate Trips/Routes
        print(f"  Generating Random Trips...")
        trips_path = os.path.join(target_dir, "trips.trips.xml")
        routes_path = os.path.join(target_dir, "routes.rou.xml")
        
        # Remove existing if any
        if os.path.exists(routes_path):
            try:
                os.remove(routes_path)
            except: pass
            
        cmd_trips = [
            PYTHON_EXEC,
            RANDOMTRIPS,
            "-n", net_path,
            "-o", trips_path,
            "-r", routes_path,
            "-e", "1000",
            "-p", "2.0",
            "--validate"
        ]
        trip_res = subprocess.run(cmd_trips, capture_output=True, text=True)
        if trip_res.returncode != 0:
            print(f"Error generating trips: {trip_res.stderr}")
        
        # 4. Create Config
        print(f"  Creating sumocfg...")
        config_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{os.path.basename(net_path)}"/>
        <route-files value="{os.path.basename(routes_path)}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="5400"/>
    </time>
</configuration>
"""
        config_path = os.path.join(target_dir, "sumo_config.sumocfg")
        with open(config_path, "w") as f:
            f.write(config_content)
            
        print(f"Finished {name}.")
        
    except Exception as e:
        print(f"Failed to process {name}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    for s in SCENARIOS:
        generate_scenario(s)
