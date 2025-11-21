#!/usr/bin/env python3
"""
Security Test: WAL Race Condition (CRITICAL)
Tests concurrent access to WAL LATEST file and race conditions
"""
import json
import pathlib
import sys
import threading
import time
import hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

WAL_DIR = ROOT / ".rtt" / "wal"
LATEST_FILE = WAL_DIR / "LATEST"


def merkle(prev_hash: str, content: bytes) -> str:
    """Merkle hash function from apply_plan.py"""
    return hashlib.sha256((prev_hash + hashlib.sha256(content).hexdigest()).encode()).hexdigest()


def test_wal_concurrent_writes():
    """Test 1: Concurrent WAL writes causing race conditions"""
    print("\n=== TEST 1: WAL Concurrent Write Race Condition ===")

    # Store original LATEST value
    if LATEST_FILE.exists():
        original_latest = LATEST_FILE.read_text(encoding="utf-8").strip()
    else:
        original_latest = "GENESIS"

    results = []
    errors = []

    def write_wal_entry(thread_id):
        """Simulate concurrent WAL write"""
        try:
            # Read LATEST
            if LATEST_FILE.exists():
                prev = LATEST_FILE.read_text(encoding="utf-8").strip()
            else:
                prev = "GENESIS"

            # Small delay to increase chance of race condition
            time.sleep(0.001)

            # Create frame
            frame = {
                "ts": time.time(),
                "plan_id": f"test-{thread_id}",
                "prev": prev,
                "apply": []
            }
            blob = json.dumps(frame, sort_keys=True).encode()
            root = merkle(prev, blob)

            # Write WAL entry
            fn = WAL_DIR / f"{int(frame['ts'])}-{root[:12]}.wal.json"
            fn.write_text(json.dumps({"root": root, "frame": frame}, indent=2), encoding="utf-8")

            # Update LATEST (race condition point)
            LATEST_FILE.write_text(root, encoding="utf-8")

            results.append((thread_id, prev, root))

        except Exception as e:
            errors.append((thread_id, str(e)))

    # Launch concurrent threads
    threads = []
    num_threads = 5

    for i in range(num_threads):
        t = threading.Thread(target=write_wal_entry, args=(i,))
        threads.append(t)
        t.start()

    # Wait for all threads
    for t in threads:
        t.join()

    # Restore original LATEST
    LATEST_FILE.write_text(original_latest, encoding="utf-8")

    print(f"Launched {num_threads} concurrent WAL writes")
    print(f"Completed: {len(results)}, Errors: {len(errors)}")

    # Check for race condition indicators
    prev_values = [prev for _, prev, _ in results]
    unique_prev = set(prev_values)

    print(f"Unique 'prev' values seen: {len(unique_prev)}")

    if len(unique_prev) < len(results):
        print("PASS: Race condition detected - multiple threads used same 'prev' value")
        print("NOTE: This indicates potential WAL chain corruption")
        return False  # Race condition exists = FAIL
    else:
        print("PASS: No race condition detected (but test may need more threads)")
        return True


def test_wal_lost_update():
    """Test 2: Lost update problem in LATEST file"""
    print("\n=== TEST 2: WAL LATEST Lost Update ===")

    # This tests if the last writer wins, potentially losing intermediate updates

    if LATEST_FILE.exists():
        original_latest = LATEST_FILE.read_text(encoding="utf-8").strip()
    else:
        original_latest = "GENESIS"

    updates = []

    def update_latest(thread_id, value):
        """Simulate LATEST file update"""
        try:
            # Read-modify-write without locking
            current = LATEST_FILE.read_text(encoding="utf-8").strip() if LATEST_FILE.exists() else "GENESIS"
            time.sleep(0.001)  # Increase race window
            LATEST_FILE.write_text(value, encoding="utf-8")
            updates.append((thread_id, value))
        except Exception as e:
            print(f"Thread {thread_id} error: {e}")

    # Launch concurrent updates
    threads = []
    test_values = [f"hash-{i:03d}" for i in range(5)]

    for i, val in enumerate(test_values):
        t = threading.Thread(target=update_latest, args=(i, val))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    # Restore original
    LATEST_FILE.write_text(original_latest, encoding="utf-8")

    # Check if all updates were recorded (they won't be due to lost updates)
    final_value = LATEST_FILE.read_text(encoding="utf-8").strip()

    print(f"Updates attempted: {len(test_values)}")
    print(f"Updates recorded: {len(updates)}")
    print(f"Final LATEST value: {final_value}")

    # If updates were lost, there's a concurrency issue
    if len(updates) == len(test_values):
        print("PASS: All updates recorded (unexpected - indicates serialization)")
        return True
    else:
        print("FAIL: Lost updates detected - CRITICAL RACE CONDITION")
        return False


def test_wal_chain_integrity():
    """Test 3: Verify WAL chain integrity after concurrent operations"""
    print("\n=== TEST 3: WAL Chain Integrity Verification ===")

    # Read all WAL entries
    wal_files = sorted(WAL_DIR.glob("*.wal.json"))

    if len(wal_files) == 0:
        print("SKIP: No WAL entries found")
        return None

    print(f"Found {len(wal_files)} WAL entries")

    # Build chain
    chain = []
    for wf in wal_files:
        try:
            entry = json.loads(wf.read_text(encoding="utf-8"))
            chain.append(entry)
        except:
            pass

    if len(chain) == 0:
        print("SKIP: No valid WAL entries")
        return None

    # Verify chain linkage
    broken_links = 0
    for i in range(1, len(chain)):
        prev_root = chain[i-1]["root"]
        current_prev = chain[i]["frame"]["prev"]

        if prev_root != current_prev:
            broken_links += 1
            print(f"Broken link at entry {i}: expected prev={prev_root}, got prev={current_prev}")

    if broken_links > 0:
        print(f"FAIL: Found {broken_links} broken links in WAL chain")
        return False
    else:
        print("PASS: WAL chain integrity verified")
        return True


def main():
    print("=" * 70)
    print("RTT v1.0.0 Security Test: WAL Race Conditions")
    print("=" * 70)

    results = []
    results.append(("WAL Concurrent Write Race", test_wal_concurrent_writes()))
    results.append(("WAL LATEST Lost Update", test_wal_lost_update()))
    results.append(("WAL Chain Integrity", test_wal_chain_integrity()))

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for test_name, result in results:
        if result is None:
            status = "SKIP"
        elif result:
            status = "PASS"
        else:
            status = "FAIL"
        print(f"{status}: {test_name}")

    # Overall assessment
    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)

    print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")

    if failed > 0:
        print("\nASSESSMENT: CRITICAL - WAL race conditions detected")
        print("RECOMMENDATION: Implement file locking (fcntl) or atomic operations")
        return 1
    else:
        print("\nASSESSMENT: WAL operations appear safe (consider adding explicit locking)")
        return 0


if __name__ == "__main__":
    sys.exit(main())
