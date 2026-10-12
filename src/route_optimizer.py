"""
BRIDGE — Route Optimization Engine (Phase 5)
Pure Python / NumPy Deterministic Nearest-Neighbor + 2-Opt TSP Heuristic.

Provides fast (<10ms), zero-dependency, reproducible route optimization with
calibrated urban circuity modeling and smart-intervention consolidation.
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np


# Calibrated urban circuity factor for metropolitan street grids (Los Angeles / DLA3)
DEFAULT_CIRCUITY_FACTOR: float = 1.35
EARTH_RADIUS_KM: float = 6371.0088
DEFAULT_URBAN_SPEED_KMH: float = 25.0
DEFAULT_STOP_SERVICE_MINUTES: float = 3.0


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    circuity: float = DEFAULT_CIRCUITY_FACTOR
) -> float:
    """
    Computes great-circle distance between two GPS coordinates using Haversine formula,
    scaled by an empirical urban circuity factor to approximate road network travel.

    Note: This is an approximate road-distance model, not a live turn-by-turn navigation graph.
    """
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlam = np.radians(lon2 - lon1)

    a = (
        np.sin(dphi / 2.0) ** 2
        + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2.0) ** 2
    )
    d = 2.0 * EARTH_RADIUS_KM * np.arcsin(np.clip(np.sqrt(a), 0.0, 1.0))
    return float(d * circuity)


def compute_distance_matrix(
    coords: np.ndarray,
    circuity: float = DEFAULT_CIRCUITY_FACTOR
) -> np.ndarray:
    """
    Vectorized computation of NxN distance matrix for an array of (latitude, longitude) coordinates.
    """
    if len(coords) == 0:
        return np.empty((0, 0), dtype=np.float64)

    lats = np.radians(coords[:, 0])
    lons = np.radians(coords[:, 1])

    dlat = lats[:, np.newaxis] - lats[np.newaxis, :]
    dlon = lons[:, np.newaxis] - lons[np.newaxis, :]

    a = (
        np.sin(dlat / 2.0) ** 2
        + np.cos(lats[:, np.newaxis]) * np.cos(lats[np.newaxis, :]) * np.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * EARTH_RADIUS_KM * np.arcsin(np.clip(np.sqrt(a), 0.0, 1.0))
    return c * circuity


def solve_tsp_nearest_neighbor(
    dist_matrix: np.ndarray,
    start_idx: int = 0
) -> List[int]:
    """
    Deterministic greedy Nearest-Neighbor initialization starting at start_idx.
    """
    n = dist_matrix.shape[0]
    if n <= 1:
        return list(range(n))

    unvisited = set(range(n))
    unvisited.remove(start_idx)
    tour = [start_idx]
    current = start_idx

    while unvisited:
        next_node = min(unvisited, key=lambda node: (dist_matrix[current, node], node))
        tour.append(next_node)
        unvisited.remove(next_node)
        current = next_node

    return tour


def calculate_tour_distance(
    tour: List[int],
    dist_matrix: np.ndarray,
    return_to_depot: bool = False
) -> float:
    """Computes total travel distance for a tour sequence."""
    if len(tour) <= 1:
        return 0.0

    dist = sum(dist_matrix[tour[i], tour[i + 1]] for i in range(len(tour) - 1))
    if return_to_depot and len(tour) > 2:
        dist += dist_matrix[tour[-1], tour[0]]
    return float(dist)


def solve_tsp_2opt(
    dist_matrix: np.ndarray,
    initial_tour: Optional[List[int]] = None,
    max_iterations: int = 500,
    return_to_depot: bool = False
) -> List[int]:
    """
    Deterministic 2-Opt local search refinement.
    Reverses sub-tours when pairwise edge swaps strictly reduce total route distance.
    """
    n = dist_matrix.shape[0]
    if n <= 3:
        return list(range(n)) if initial_tour is None else list(initial_tour)

    tour = list(initial_tour) if initial_tour is not None else solve_tsp_nearest_neighbor(dist_matrix, start_idx=0)

    iteration = 0
    improved = True

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1

        for i in range(1, n - 1):
            for j in range(i + 1, n):
                if return_to_depot:
                    next_j = (j + 1) % n
                    old_cost = dist_matrix[tour[i - 1], tour[i]] + dist_matrix[tour[j], tour[next_j]]
                    new_cost = dist_matrix[tour[i - 1], tour[j]] + dist_matrix[tour[i], tour[next_j]]
                else:
                    old_cost = dist_matrix[tour[i - 1], tour[i]] + (dist_matrix[tour[j], tour[j + 1]] if j + 1 < n else 0.0)
                    new_cost = dist_matrix[tour[i - 1], tour[j]] + (dist_matrix[tour[i], tour[j + 1]] if j + 1 < n else 0.0)

                # Strict improvement threshold to prevent floating-point oscillation
                if new_cost < old_cost - 1e-6:
                    tour[i:j + 1] = reversed(tour[i:j + 1])
                    improved = True
                    break
            if improved:
                break

    return tour


class RouteOptimizer:
    """
    High-level route optimization interface supporting stop extraction,
    spatial sequencing, and smart intervention consolidation.
    """

    def __init__(self, circuity_factor: float = DEFAULT_CIRCUITY_FACTOR):
        self.circuity_factor = circuity_factor

    def optimize_stops(
        self,
        stops: List[Dict[str, Any]],
        start_stop_id: Optional[str] = None,
        return_to_depot: bool = False
    ) -> Dict[str, Any]:
        """
        Optimizes a list of stops dictionaries containing 'stop_id', 'latitude', 'longitude'.
        Preserves original sequence for baseline comparison.
        """
        if not stops:
            return {
                "original_stop_sequence": [],
                "optimized_stop_sequence": [],
                "original_distance_km": 0.0,
                "optimized_distance_km": 0.0,
                "distance_savings_km": 0.0,
                "distance_savings_pct": 0.0,
                "stops": [],
                "stops_count": 0,
                "estimated_duration_minutes": 0.0,
                "savings_target_met": False,
                "circuity_factor": self.circuity_factor,
                "is_approximate_road_distance": True
            }

        # Deduplicate stops while preserving first appearance order
        unique_stops = []
        seen_ids = set()
        for s in stops:
            sid = str(s.get("stop_id", f"stop_{len(unique_stops)}"))
            if sid not in seen_ids:
                seen_ids.add(sid)
                unique_stops.append({
                    "stop_id": sid,
                    "latitude": float(s.get("latitude", 0.0)),
                    "longitude": float(s.get("longitude", 0.0)),
                    "package_count": s.get("package_count", 1),
                    "package_ids": s.get("package_ids", [])
                })

        coords = np.array([[s["latitude"], s["longitude"]] for s in unique_stops], dtype=np.float64)
        dist_mat = compute_distance_matrix(coords, circuity=self.circuity_factor)

        # Baseline distance in original sequence order
        original_indices = list(range(len(unique_stops)))
        original_distance = calculate_tour_distance(original_indices, dist_mat, return_to_depot=return_to_depot)

        # Determine start index
        start_idx = 0
        if start_stop_id:
            for idx, s in enumerate(unique_stops):
                if s["stop_id"] == start_stop_id:
                    start_idx = idx
                    break

        # Solve via Nearest Neighbor + 2-Opt
        nn_tour = solve_tsp_nearest_neighbor(dist_mat, start_idx=start_idx)
        opt_tour = solve_tsp_2opt(dist_mat, initial_tour=nn_tour, return_to_depot=return_to_depot)
        optimized_distance = calculate_tour_distance(opt_tour, dist_mat, return_to_depot=return_to_depot)

        savings_km = max(0.0, original_distance - optimized_distance)
        savings_pct = (savings_km / (original_distance + 1e-6)) * 100.0

        ordered_stops = []
        for step_order, idx in enumerate(opt_tour):
            stop_meta = dict(unique_stops[idx])
            stop_meta["sequence_order"] = step_order + 1
            ordered_stops.append(stop_meta)

        # Estimate travel duration
        drive_minutes = (optimized_distance / DEFAULT_URBAN_SPEED_KMH) * 60.0
        service_minutes = len(unique_stops) * DEFAULT_STOP_SERVICE_MINUTES
        total_duration = round(drive_minutes + service_minutes, 1)

        return {
            "original_stop_sequence": [unique_stops[i]["stop_id"] for i in original_indices],
            "optimized_stop_sequence": [unique_stops[i]["stop_id"] for i in opt_tour],
            "original_distance_km": round(original_distance, 3),
            "optimized_distance_km": round(optimized_distance, 3),
            "distance_savings_km": round(savings_km, 3),
            "distance_savings_pct": round(savings_pct, 1),
            "stops": ordered_stops,
            "stops_count": len(ordered_stops),
            "estimated_duration_minutes": total_duration,
            "savings_target_met": bool(savings_pct >= 12.0),
            "circuity_factor": self.circuity_factor,
            "is_approximate_road_distance": True
        }

    def optimize_route_from_shipments(
        self,
        shipments: List[Dict[str, Any]],
        apply_interventions: bool = False,
        return_to_depot: bool = False
    ) -> Dict[str, Any]:
        """
        Groups shipment records by stop_id, applies customer interventions if requested,
        and solves the route optimization.
        """
        if not shipments:
            return self.optimize_stops([], return_to_depot=return_to_depot)

        # Map shipments by stop
        stops_dict: Dict[str, Dict[str, Any]] = {}
        for s in shipments:
            sid = str(s.get("stop_id") or s.get("package_id") or "UNKNOWN")
            lat = float(s.get("latitude") or s.get("dropoff_lat") or 0.0)
            lng = float(s.get("longitude") or s.get("dropoff_lng") or 0.0)
            pkg_id = s.get("package_id")

            # Check if this shipment has an active intervention
            intervention = s.get("applied_intervention") or {}
            int_id = intervention.get("id") if isinstance(intervention, dict) else None

            if sid not in stops_dict:
                stops_dict[sid] = {
                    "stop_id": sid,
                    "latitude": lat,
                    "longitude": lng,
                    "packages": [],
                    "package_ids": []
                }
            stops_dict[sid]["packages"].append(s)
            if pkg_id:
                stops_dict[sid]["package_ids"].append(pkg_id)

        # If apply_interventions is enabled:
        # 1. Packages held at station or rescheduled are removed from today's stops
        # 2. Packages routed to smart locker are consolidated into a dedicated hub stop
        processed_stops: List[Dict[str, Any]] = []
        locker_packages: List[Dict[str, Any]] = []

        if apply_interventions:
            for sid, sdata in stops_dict.items():
                active_pkgs = []
                for pkg in sdata["packages"]:
                    int_info = pkg.get("applied_intervention") or {}
                    action = int_info.get("id") if isinstance(int_info, dict) else None

                    if action in ("hold_pickup", "reschedule_day"):
                        # Package deferred/held at station — skip this stop for this package
                        continue
                    elif action == "access_point":
                        # Package redirected to locker hub
                        locker_packages.append(pkg)
                    else:
                        active_pkgs.append(pkg)

                if active_pkgs:
                    processed_stops.append({
                        "stop_id": sid,
                        "latitude": sdata["latitude"],
                        "longitude": sdata["longitude"],
                        "package_count": len(active_pkgs),
                        "package_ids": [p.get("package_id") for p in active_pkgs if p.get("package_id")]
                    })

            if locker_packages:
                # Place consolidated locker at median cluster centroid of the locker packages
                lock_lat = float(np.median([p.get("latitude", 34.095) for p in locker_packages]))
                lock_lng = float(np.median([p.get("longitude", -118.285) for p in locker_packages]))
                processed_stops.append({
                    "stop_id": "HUB_LOCKER_CONSOLIDATED",
                    "latitude": lock_lat,
                    "longitude": lock_lng,
                    "package_count": len(locker_packages),
                    "package_ids": [p.get("package_id") for p in locker_packages if p.get("package_id")]
                })
        else:
            for sid, sdata in stops_dict.items():
                processed_stops.append({
                    "stop_id": sid,
                    "latitude": sdata["latitude"],
                    "longitude": sdata["longitude"],
                    "package_count": len(sdata["packages"]),
                    "package_ids": sdata["package_ids"]
                })

        result = self.optimize_stops(processed_stops, return_to_depot=return_to_depot)
        result["interventions_applied"] = apply_interventions
        return result
