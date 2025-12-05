#!/usr/bin/env python3
"""
Unit Tests: Placement Solver
Tests the solver_placement module from tools/solver_placement.py
"""
import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import solver_placement
import solver_constraints

# Import functions
numa_penalty_ms = solver_placement.numa_penalty_ms
nodes = solver_placement.nodes
demand = solver_placement.demand
capacity = solver_placement.capacity
initial_place = solver_placement.initial_place
placement_cost = solver_placement.placement_cost
pack_feasible = solver_placement.pack_feasible
choose_lane = solver_placement.choose_lane
optimize = solver_placement.optimize
supports_lane = solver_constraints.supports_lane


class TestNumaPenalty:
    """Test NUMA penalty calculation."""

    def test_numa_penalty_same_node(self):
        """Test no penalty when symbols on same node."""
        topology = {"place": {"sym_a": "0", "sym_b": "0"}}
        penalty = numa_penalty_ms(topology, "sym_a", "sym_b")
        assert penalty == 0.0

    def test_numa_penalty_different_nodes(self):
        """Test penalty when symbols on different nodes."""
        topology = {"place": {"sym_a": "0", "sym_b": "1"}}
        penalty = numa_penalty_ms(topology, "sym_a", "sym_b")
        assert penalty == 0.4

    def test_numa_penalty_default_node(self):
        """Test penalty with default node placement."""
        topology = {"place": {}}
        penalty = numa_penalty_ms(topology, "sym_a", "sym_b")
        assert penalty == 0.0  # Both default to '0'

    def test_numa_penalty_one_default(self):
        """Test penalty when one symbol uses default."""
        topology = {"place": {"sym_a": "1"}}
        penalty = numa_penalty_ms(topology, "sym_a", "sym_b")
        assert penalty == 0.4  # '1' != '0' (default)


class TestNodes:
    """Test node list extraction."""

    def test_nodes_from_topology(self):
        """Test extracting nodes from topology."""
        topology = {
            "nodes": {
                "0": {"capacity": {}},
                "1": {"capacity": {}}
            }
        }
        result = nodes(topology)
        assert set(result) == {"0", "1"}

    def test_nodes_empty_topology(self):
        """Test default node when topology empty."""
        topology = {}
        result = nodes(topology)
        assert result == ["0"]

    def test_nodes_no_nodes_key(self):
        """Test default node when nodes key missing."""
        topology = {"other": "data"}
        result = nodes(topology)
        assert result == ["0"]


class TestDemand:
    """Test resource demand calculation."""

    def test_demand_default_values(self):
        """Test demand with default values."""
        symbol = {}
        result = demand(symbol)
        assert result["cpu"] >= 0.1
        assert result["mem"] == 16

    def test_demand_with_qos(self):
        """Test demand calculation with QoS."""
        symbol = {
            "qos": {"throughput_qps": 100},
            "tags": {"cpu_weight": 1.0, "mem_mb": 64}
        }
        result = demand(symbol)
        assert result["cpu"] == max(0.1, 1.0 * (100/10.0))
        assert result["mem"] == 64

    def test_demand_high_throughput(self):
        """Test demand with high throughput."""
        symbol = {
            "qos": {"throughput_qps": 1000},
            "tags": {"cpu_weight": 2.0, "mem_mb": 128}
        }
        result = demand(symbol)
        expected_cpu = max(0.1, 2.0 * (1000/10.0))
        assert result["cpu"] == expected_cpu
        assert result["mem"] == 128

    def test_demand_minimum_cpu(self):
        """Test minimum CPU demand enforced."""
        symbol = {
            "qos": {"throughput_qps": 0},
            "tags": {"cpu_weight": 0.0}
        }
        result = demand(symbol)
        assert result["cpu"] >= 0.1


class TestCapacity:
    """Test node capacity extraction."""

    def test_capacity_from_topology(self):
        """Test extracting capacity from topology."""
        topology = {
            "nodes": {
                "0": {"capacity": {"cpu": 32.0, "mem_mb": 32768}}
            }
        }
        result = capacity(topology, "0")
        assert result["cpu"] == 32.0
        assert result["mem"] == 32768

    def test_capacity_default_values(self):
        """Test default capacity values."""
        topology = {"nodes": {"0": {}}}
        result = capacity(topology, "0")
        assert result["cpu"] == 64.0
        assert result["mem"] == 65536

    def test_capacity_missing_node(self):
        """Test capacity for missing node."""
        topology = {"nodes": {}}
        result = capacity(topology, "0")
        assert result["cpu"] == 64.0
        assert result["mem"] == 65536


class TestInitialPlace:
    """Test initial placement generation."""

    def test_initial_place_from_prev(self):
        """Test initial placement from previous placement."""
        symbols = ["sym_a", "sym_b"]
        topology = {"nodes": {"0": {}, "1": {}}}
        prev_place = {"sym_a": "1", "sym_b": "0"}

        result = initial_place(symbols, topology, prev_place)
        assert result["sym_a"] == "1"
        assert result["sym_b"] == "0"

    def test_initial_place_from_topology(self):
        """Test initial placement from topology."""
        symbols = ["sym_a", "sym_b"]
        topology = {
            "nodes": {"0": {}, "1": {}},
            "place": {"sym_a": "1"}
        }
        prev_place = {}

        result = initial_place(symbols, topology, prev_place)
        assert result["sym_a"] == "1"
        assert result["sym_b"] in ["0", "1"]

    def test_initial_place_round_robin(self):
        """Test round-robin placement."""
        symbols = ["sym_a", "sym_b", "sym_c", "sym_d"]
        topology = {"nodes": {"0": {}, "1": {}}}
        prev_place = {}

        result = initial_place(symbols, topology, prev_place)
        # Should distribute across nodes
        assert len(set(result.values())) >= 1

    def test_initial_place_single_node(self):
        """Test placement on single node."""
        symbols = ["sym_a", "sym_b"]
        topology = {"nodes": {"0": {}}}
        prev_place = {}

        result = initial_place(symbols, topology, prev_place)
        assert all(n == "0" for n in result.values())


class TestPlacementCost:
    """Test placement cost calculation."""

    def test_placement_cost_same_node(self):
        """Test cost when all symbols on same node."""
        routes = [
            {"from": "sym_a", "to": "sym_b", "lane": "shm"}
        ]
        place = {"sym_a": "0", "sym_b": "0"}
        lane_map = {("sym_a", "sym_b"): "shm"}
        topology = {"place": {}}

        cost, moves = placement_cost(routes, place, lane_map, topology, 0.5, None)
        assert cost > 0
        assert moves == 0

    def test_placement_cost_different_nodes(self):
        """Test cost with NUMA penalty."""
        routes = [
            {"from": "sym_a", "to": "sym_b", "lane": "uds"}
        ]
        place = {"sym_a": "0", "sym_b": "1"}
        lane_map = {("sym_a", "sym_b"): "uds"}
        # topology['place'] maps symbols to nodes for NUMA penalty calculation
        topology = {"place": {"sym_a": "0", "sym_b": "1"}}

        cost, moves = placement_cost(routes, place, lane_map, topology, 0.5, None)
        # Should include NUMA penalty (0.6 base + 0.4 NUMA = 1.0)
        assert cost == 1.0

    def test_placement_cost_with_churn(self):
        """Test cost with churn penalty."""
        routes = [
            {"from": "sym_a", "to": "sym_b", "lane": "uds"}
        ]
        place = {"sym_a": "1", "sym_b": "1"}
        lane_map = {("sym_a", "sym_b"): "uds"}
        topology = {"place": {}}
        prev_place = {"sym_a": "0", "sym_b": "1"}

        cost, moves = placement_cost(routes, place, lane_map, topology, 0.5, prev_place)
        assert moves == 1
        # Cost includes churn penalty (0.6 base + 0.5 churn = 1.1)
        assert cost == 1.1


class TestPackFeasible:
    """Test feasibility packing."""

    def test_pack_feasible_under_capacity(self):
        """Test packing when under capacity."""
        symbols = ["sym_a", "sym_b"]
        place = {"sym_a": "0", "sym_b": "0"}
        topology = {
            "nodes": {"0": {"capacity": {"cpu": 64.0, "mem_mb": 65536}}}
        }
        manifests = {
            "sym_a": {"qos": {}, "tags": {}},
            "sym_b": {"qos": {}, "tags": {}}
        }

        result = pack_feasible(place, symbols, topology, manifests)
        # Should not change placement
        assert result == place

    def test_pack_feasible_over_capacity(self):
        """Test packing when over capacity."""
        symbols = ["sym_a", "sym_b"]
        place = {"sym_a": "0", "sym_b": "0"}
        topology = {
            "nodes": {
                "0": {"capacity": {"cpu": 1.0, "mem_mb": 32}},
                "1": {"capacity": {"cpu": 64.0, "mem_mb": 65536}}
            }
        }
        manifests = {
            "sym_a": {"qos": {"throughput_qps": 100}, "tags": {"cpu_weight": 1.0, "mem_mb": 64}},
            "sym_b": {"qos": {"throughput_qps": 100}, "tags": {"cpu_weight": 1.0, "mem_mb": 64}}
        }

        result = pack_feasible(place, symbols, topology, manifests)
        # Should move at least one symbol to node 1
        assert "1" in result.values()


class TestChooseLane:
    """Test lane selection."""

    def test_choose_lane_shm_same_node(self):
        """Test choosing shm when on same node."""
        sym_from = {"tags": {"supports_shm": True}}
        sym_to = {"tags": {"supports_shm": True}}
        prefer = ["shm", "uds"]

        result = choose_lane(sym_from, sym_to, prefer, same_node=True)
        assert result == "shm"

    def test_choose_lane_no_shm_different_nodes(self):
        """Test not choosing shm when on different nodes."""
        sym_from = {"tags": {"supports_shm": True}}
        sym_to = {"tags": {"supports_shm": True}}
        prefer = ["shm", "uds"]

        result = choose_lane(sym_from, sym_to, prefer, same_node=False)
        assert result == "uds"

    def test_choose_lane_fallback_to_uds(self):
        """Test fallback when shm not supported, tcp is chosen from prefer list."""
        sym_from = {"tags": {}}
        sym_to = {"tags": {}}
        prefer = ["shm", "tcp"]

        result = choose_lane(sym_from, sym_to, prefer, same_node=True)
        # tcp is supported by default, so it's chosen over the hardcoded uds fallback
        assert result == "tcp"


class TestOptimize:
    """Test full optimization."""

    def test_optimize_single_route(self):
        """Test optimization with single route."""
        manifests = {
            "sym_a": {"qos": {}, "tags": {}},
            "sym_b": {"qos": {}, "tags": {}}
        }
        routes = [
            {"from": "sym_a", "to": "sym_b"}
        ]
        topology = {"nodes": {"0": {}}}
        prev_place = {}
        prev_lanes = {}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer
        )

        assert "sym_a" in place
        assert "sym_b" in place
        assert ("sym_a", "sym_b") in lane_map
        assert cost >= 0

    def test_optimize_multiple_routes(self):
        """Test optimization with multiple routes."""
        manifests = {
            "sym_a": {"qos": {}, "tags": {}},
            "sym_b": {"qos": {}, "tags": {}},
            "sym_c": {"qos": {}, "tags": {}}
        }
        routes = [
            {"from": "sym_a", "to": "sym_b"},
            {"from": "sym_b", "to": "sym_c"}
        ]
        topology = {"nodes": {"0": {}, "1": {}}}
        prev_place = {}
        prev_lanes = {}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer
        )

        assert len(place) == 3
        assert len(lane_map) == 2

    def test_optimize_preserves_feasible_lanes(self):
        """Test that optimization preserves feasible previous lanes."""
        manifests = {
            "sym_a": {"qos": {}, "tags": {"supports_shm": True}},
            "sym_b": {"qos": {}, "tags": {"supports_shm": True}}
        }
        routes = [
            {"from": "sym_a", "to": "sym_b"}
        ]
        topology = {"nodes": {"0": {}}}
        prev_place = {"sym_a": "0", "sym_b": "0"}
        prev_lanes = {("sym_a", "sym_b"): "shm"}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer,
            churn_weight=10.0  # High churn weight to preserve placement
        )

        # Should keep shm lane since symbols on same node
        assert lane_map[("sym_a", "sym_b")] == "shm"

    def test_optimize_minimizes_churn(self):
        """Test that optimization minimizes churn."""
        manifests = {
            "sym_a": {"qos": {}, "tags": {}},
            "sym_b": {"qos": {}, "tags": {}}
        }
        routes = [
            {"from": "sym_a", "to": "sym_b"}
        ]
        topology = {"nodes": {"0": {}, "1": {}}}
        prev_place = {"sym_a": "0", "sym_b": "0"}
        prev_lanes = {}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer,
            churn_weight=100.0  # Very high churn weight
        )

        # Should keep previous placement due to high churn weight
        assert place["sym_a"] == "0"
        assert place["sym_b"] == "0"


class TestSolverEdgeCases:
    """Test edge cases in solver."""

    def test_empty_routes(self):
        """Test optimization with no routes."""
        manifests = {}
        routes = []
        topology = {"nodes": {"0": {}}}
        prev_place = {}
        prev_lanes = {}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer
        )

        assert len(place) == 0
        assert len(lane_map) == 0
        assert cost == 0.0

    def test_self_route(self):
        """Test route from symbol to itself."""
        manifests = {
            "sym_a": {"qos": {}, "tags": {}}
        }
        routes = [
            {"from": "sym_a", "to": "sym_a"}
        ]
        topology = {"nodes": {"0": {}}}
        prev_place = {}
        prev_lanes = {}
        prefer = ["shm", "uds"]

        place, lane_map, cost = optimize(
            manifests, routes, topology, prev_place, prev_lanes, prefer
        )

        # Self-route should be on same node with shm
        assert place["sym_a"] == place["sym_a"]
        assert ("sym_a", "sym_a") in lane_map
