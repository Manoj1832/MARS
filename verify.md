Verify MARS's real infrastructure end to end.

1. Start the Docker Compose environment.
2. Confirm the benchmark application is running and healthy.
3. Send actual HTTP requests through NGINX.
4. Confirm the requests reach the running application containers.
5. Verify that request counts, response latency, and Prometheus metrics change as real traffic is generated.
6. Record the actual Docker container count.
7. Execute a controlled scale-out through the backend controller and verify that a new healthy container starts and receives requests.
8. Execute a controlled scale-in and verify that the container is safely removed and the remaining replicas continue serving requests.
9. Compare container counts before and after each operation.
10. Run the tests and fix any errors.

Do not implement fake metrics or simulated scaling to make the dashboard look functional. If an operation fails, investigate the logs and correct the underlying issue.

Report the exact commands run, test results, active container counts, and any remaining blockers. Do not proceed to DQN training until the infrastructure tests pass.