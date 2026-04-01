# Load Testing with k6

k6 is a load testing tool that runs in Node.js (dev environment), not in the Cloudflare Worker.

## Installation

k6 must be installed separately (not via npm):

**Windows (via Chocolatey):**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Usage

1. Start the worker locally:
```bash
npm run dev
```

2. In another terminal, run k6:
```bash
npm run test:load
```

Or with custom worker URL:
```bash
WORKER_URL=http://localhost:8787 k6 run tests/k6/concurrency.test.js
```

## Test Configuration

Tests are configured in `concurrency.test.js`:
- Stages: Ramp up to 50 concurrent users over 30s
- Thresholds: 95% of requests < 2s, error rate < 10%

Modify `options` in the test file to adjust load patterns.
