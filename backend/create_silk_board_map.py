
import osmnx as ox
import os
import subprocess
import sys
import networkx as nx

# Configuration
SUMO_HOME = r"C:\Program Files (x86)\Eclipse\Sumo"
NETCONVERT = os.path.join(SUMO_HOME, "bin", "netconvert.exe")
RANDOMTRIPS = os.path.join(SUMO_HOME, "tools", "randomTrips.py")
PYTHON_EXEC = sys.executable

# Silk Board Coordinates
POINT = (12.9174, 77.6236)
DIST = 400  # Increased distance to capture approaches, will crop later if needed

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(BASE_DIR, "sumo", "networks", "bangalore_silk_board")

def save_osm(G, filepath):
    print(f"    Saving OSM XML manually to {filepath}...")
    
    node_map = {}
    node_counter = 1
    extra_nodes = [] # List of dicts {id, lat, lon}
    
    # Pre-calculate node IDs for existing nodes
    for node in G.nodes():
        node_map[node] = node_counter
        node_counter += 1

    # Store way node references (list of IDs)
    way_refs = {} 

    # Extract intermediate nodes from edge geometries
    for u, v, k, data in G.edges(keys=True, data=True):
        if u not in node_map or v not in node_map:
            continue
            
        ref_u = node_map[u]
        ref_v = node_map[v]
        
        refs = [ref_u]
        
        if 'geometry' in data:
            # geometry is a shapely LineString
            # coords includes start and end points which correspond to u and v
            coords = list(data['geometry'].coords)
            
            # We take the intermediate points
            if len(coords) > 2:
                for lon, lat in coords[1:-1]:
                    new_id = node_counter
                    node_counter += 1
                    extra_nodes.append({'id': new_id, 'lat': lat, 'lon': lon})
                    refs.append(new_id)
        
        refs.append(ref_v)
        way_refs[(u, v, k)] = refs

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<osm version="0.6" generator="custom_writer">\n')

        # Write original nodes
        # Write original nodes
        for node, data in G.nodes(data=True):
            lat = data.get('y')
            lon = data.get('x')
            new_id = node_map[node]
            
            # Force TLS on central nodes (approx 20m radius)
            # 0.0002 degrees is roughly 22 meters
            dist_sq = (lat - POINT[0])**2 + (lon - POINT[1])**2
            if dist_sq < (0.0002)**2:
                f.write(f'  <node id="{new_id}" lat="{lat}" lon="{lon}">\n')
                f.write('    <tag k="highway" v="traffic_signals" />\n')
                f.write('  </node>\n')
            else:
                f.write(f'  <node id="{new_id}" lat="{lat}" lon="{lon}" />\n')
            
        # Write intermediate nodes
        for n in extra_nodes:
            f.write(f'  <node id="{n["id"]}" lat="{n["lat"]}" lon="{n["lon"]}" />\n')

        # Write ways
        way_counter = 1
        seen_edges = set()
        
        for u, v, k, data in G.edges(keys=True, data=True):
            if (u, v, k) not in way_refs:
                continue

            # User Fix: Deduplicate edges to prevent double-lanes
            edge_id = tuple(sorted((u, v)))
            if edge_id in seen_edges:
                continue
            seen_edges.add(edge_id)

            current_id = way_counter
            way_counter += 1
            
            f.write(f'  <way id="{current_id}">\n') 
            
            # Write all node refs for this way
            for ref_id in way_refs[(u, v, k)]:
                f.write(f'    <nd ref="{ref_id}" />\n')
            
            # Default fallback
            if 'highway' not in data:
                 f.write('    <tag k="highway" v="residential" />\n') 

            # User Fix: Defaults for missing data
            if 'lanes' not in data:
                f.write('    <tag k="lanes" v="2" />\n')
            if 'maxspeed' not in data:
                f.write('    <tag k="maxspeed" v="40" />\n')

            for tag, value in data.items():
                if tag in ['geometry', 'osmid', 'length', 'nodes', 'highway', 'lanes', 'maxspeed']: continue
                if isinstance(value, list):
                    value = ";".join([str(x) for x in value])
                f.write(f'    <tag k="{tag}" v="{value}" />\n')
            
            # Write highway tag if present
            if 'highway' in data:
                val = data['highway']
                if isinstance(val, list): val = val[0]
                f.write(f'    <tag k="highway" v="{val}" />\n')
            
            f.write('  </way>\n')

        f.write('</osm>\n')

def main():
    print("Generating Silk Board Map...")
    os.makedirs(TARGET_DIR, exist_ok=True)

    # 1. Download OSM Data
    # Filter for driving, but we will exclude bridges manually
    print("Downloading OSM data...")
    G = ox.graph_from_point(POINT, dist=DIST, network_type='drive', simplify=True)

    # 2. Filter out Flyovers (Bridges)
    print("Filtering out flyovers...")
    edges_to_remove = []
    for u, v, k, data in G.edges(keys=True, data=True):
        # Check for bridge tag
        if 'bridge' in data and data['bridge'] == 'yes':
            edges_to_remove.append((u, v, k))
            continue
        
        # Check for layer tag (flyovers are usually layer 1 or higher)
        if 'layer' in data:
            try:
                if int(float(data['layer'])) > 0:
                    edges_to_remove.append((u, v, k))
                    continue
            except:
                pass
        
        # Check for specific highway types that might be flyovers if not covered by above
        # Silk board flyover is usually marked as motorway_link or similar, but let's stick to bridge/layer first.
    
    print(f"Removing {len(edges_to_remove)} flyover edges...")
    G.remove_edges_from(edges_to_remove)
    
    # Remove isolated nodes
    if nx.is_directed(G):
        G.remove_nodes_from(list(nx.isolates(G)))
    else:
        G.remove_nodes_from(list(nx.isolates(G)))

    # Get the largest strongly connected component to ensure connectivity
    # G = ox.utils_graph.get_largest_component(G, strongly=True) # Optional, might remove approaches if they are one-way entering

    # 3. Save to OSM
    osm_path = os.path.join(TARGET_DIR, "bangalore_silk_board.osm")
    save_osm(G, osm_path)

    # 4. Netconvert
    print("Converting to NET...")
    net_path = os.path.join(TARGET_DIR, "bangalore_silk_board.net.xml")
    
    # Adjusted options for cleaner geometry and signals (Option 2: Force TLS)
    cmd = [
        NETCONVERT,
        "--osm-files", osm_path,
        "-o", net_path,
        "--junctions.join", "true",
        "--junctions.corner-detail", "8",
        "--tls.guess", "true",
        "--tls.guess.threshold", "2",
        "--tls.join", "true",
        "--tls.default-type", "actuated"
    ]

    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error converting net: {result.stderr}")
        with open("netconvert_error.txt", "w") as f:
            f.write(result.stderr)
        return

    # 5. Generate Random Trips (for background traffic)
    print("Generating Trips...")
    trips_path = os.path.join(TARGET_DIR, "trips.trips.xml")
    routes_path = os.path.join(TARGET_DIR, "routes.rou.xml")
    
    # Clean up old
    if os.path.exists(routes_path): os.remove(routes_path)

    cmd_trips = [
        PYTHON_EXEC,
        RANDOMTRIPS,
        "-n", net_path,
        "-o", trips_path,
        "-r", routes_path,
        "-e", "600",
        "-p", "1.0",
        "--validate"
    ]
    subprocess.run(cmd_trips, capture_output=True, text=True)

    # Create Emergency Vehicle Type definition
    add_content = """<additional>
    <vType id="emergency" vClass="emergency" guiShape="emergency" color="red" accel="2.0" decel="6.0" length="6.0" minGap="2.5" maxSpeed="35" speedFactor="1.5" sigma="0.0">
        <param key="has.siren" value="true"/>
    </vType>
</additional>
"""
    add_path = os.path.join(TARGET_DIR, "emergency.add.xml")
    with open(add_path, "w") as f:
        f.write(add_content)

    # 6. Create SUMO Config
    config_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="bangalore_silk_board.net.xml"/>
        <route-files value="routes.rou.xml"/>
        <additional-files value="emergency.add.xml"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="5400"/>
    </time>
</configuration>
"""
    config_path = os.path.join(TARGET_DIR, "sumo_config.sumocfg")
    with open(config_path, "w") as f:
        f.write(config_content)

    print("Done! Files created in:", TARGET_DIR)

if __name__ == "__main__":
    main()
