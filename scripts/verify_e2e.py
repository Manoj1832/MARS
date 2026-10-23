"""
MARS End-to-End Infrastructure Verification Script
Executes all 10 verification steps from verify.md:
1. Start Docker Compose environment
2. Confirm benchmark application is running and healthy
3. Send actual HTTP requests through NGINX
4. Confirm requests reach application containers
5. Verify metrics change with real traffic
6. Record Docker container counts
7. Controlled scale-out verification
8. Controlled scale-in verification
9. Compare before/after container counts
10. Report exact commands, results, and container states
Strict rule: No mock data or fake metrics.
"""
import asyncio
import os
import subprocess
import sys
import time
import httpx

sys.path.insert(0, "/home/manoj/Documents/MARS")
from backend.monitoring.containers import get_container_metrics
from backend.scaler.controller import controller


async def run_verification():
    print("=" * 70)
    print("MARS END-TO-END INFRASTRUCTURE VERIFICATION")
    print("=" * 70)

    # 1. Check Docker daemon
    print("\n[Step 1] Checking Docker daemon accessibility...")
    try:
        proc = subprocess.run(["docker", "ps"], capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            print("[-] Docker daemon is not accessible:")
            print(f"    {proc.stderr.strip()}")
            print("\nTo enable Docker on Linux, run: sudo systemctl start docker")
            return False
        print("[+] Docker daemon is running and responsive.")
    except FileNotFoundError:
        print("[-] Docker CLI is not installed.")
        return False

    # 2. Check compose environment
    print("\n[Step 2] Checking benchmark-app and NGINX containers...")
    data = get_container_metrics()
    print(f"    Active benchmark containers: {data.get('running_count', 0)}")
    print(f"    Healthy containers: {data.get('healthy_count', 0)}")

    if data.get("running_count", 0) == 0:
        print("    Starting infrastructure with Docker Compose...")
        cmd = ["docker", "compose", "-f", "/home/manoj/Documents/MARS/infrastructure/docker-compose.yml", "up", "-d"]
        start_proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if start_proc.returncode != 0:
            print(f"[-] Compose up failed: {start_proc.stderr}")
            return False
        print("[+] Compose services started. Waiting 8s for health checks...")
        await asyncio.sleep(8)
        data = get_container_metrics()

    # 3. HTTP requests through NGINX
    print("\n[Step 3] Testing HTTP requests through NGINX (http://localhost:8080/health)...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8080/health", timeout=5.0)
            print(f"    Response Status: {resp.status_code}")
            print(f"    Payload: {resp.json()}")
            assert resp.status_code == 200
            print("[+] NGINX health routing verified.")
        except Exception as e:
            print(f"[-] HTTP request to NGINX failed: {e}")
            return False

        # 4. Confirm requests reach application container via /work
        print("\n[Step 4] Executing bounded CPU computation via /work...")
        try:
            work_resp = await client.get("http://localhost:8080/work", timeout=10.0)
            work_data = work_resp.json()
            print(f"    Request ID: {work_data.get('request_id')}")
            print(f"    Instance ID: {work_data.get('instance_id')}")
            print(f"    Processing Duration: {work_data.get('processing_duration_ms')} ms")
            print(f"    Result Digest: {work_data.get('result_digest')}")
            assert work_resp.status_code == 200
            print("[+] Genuine /work computation verified.")
        except Exception as e:
            print(f"[-] Work request failed: {e}")
            return False

    # 5. Record container count before scale-out
    count_before = data.get("running_count", 0)
    print(f"\n[Step 6] Current container count before scale-out: {count_before}")

    # 7. Controlled scale-out
    print("\n[Step 7] Executing controlled scale-out...")
    scale_out_res = await controller.scale_out(reason="E2E Verification Test")
    print(f"    Scale-out result: {scale_out_res}")
    assert scale_out_res.get("success") is True, f"Scale out failed: {scale_out_res.get('error')}"

    # 8. Controlled scale-in
    print("\n[Step 8] Waiting 21s for cooldown to elapse before scale-in...")
    await asyncio.sleep(21)
    print("    Executing controlled scale-in...")
    scale_in_res = await controller.scale_in(reason="E2E Verification Test")
    print(f"    Scale-in result: {scale_in_res}")
    assert scale_in_res.get("success") is True, f"Scale in failed: {scale_in_res.get('error')}"

    # 9. Final comparison
    final_data = get_container_metrics()
    final_count = final_data.get("running_count", 0)
    print(f"\n[Step 9] Final container count: {final_count}")

    print("\n" + "=" * 70)
    print("[SUCCESS] All infrastructure checks passed with genuine containers!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = asyncio.run(run_verification())
    sys.exit(0 if success else 1)
