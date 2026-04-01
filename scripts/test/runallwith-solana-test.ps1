# PowerShell script to run tests with WSL Solana validator
# This script handles EVERYTHING: starts validator, builds, deploys, initializes accounts, runs tests
# One script to rule them all - no juggling between terminals

param(
    [switch]$SkipSetup,
    [switch]$SkipValidator,
    [switch]$SkipBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# Program configuration
$PROGRAM_ID = "7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696"
$REGISTRY_PDA = "8heRqJrZRXYSQg1LBAfzg5KNZY9GhP3NYgjMAeEFoCwe"
$CONFIG_PDA = "HR8RVLAzoDvEnJPxVJghgWDy7595aHBXqCUN4BEF2qDT"

# Initialize setup info array
$setupInfo = @()

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Ocentra Games Test Runner" -ForegroundColor Cyan
Write-Host "  One script to rule them all" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get script root (scripts folder)
$scriptRoot = $PSScriptRoot
$projectRoot = Split-Path $scriptRoot -Parent

# Convert Windows path to WSL path
$wslProjectRoot = "/mnt/" + ($projectRoot -replace '\\', '/' -replace ':', '').ToLower()

# Change to project root for npm commands
Push-Location $projectRoot

try {
    # ============================================================
    # Step 1: Detect WSL IP
    # ============================================================
    Write-Host "1. Detecting WSL IP address..." -ForegroundColor Cyan
    $setupInfo += "Step 1: Detecting WSL IP address..."

    $wslIp = $null
    try {
        $wslIp = (wsl hostname -I).Trim().Split()[0]
        if ([string]::IsNullOrWhiteSpace($wslIp)) {
            $setupInfo += "ERROR: Could not detect WSL IP address"
            Write-Host "   ERROR: Could not detect WSL IP address" -ForegroundColor Red
            Write-Host "   Make sure WSL is running: wsl hostname -I" -ForegroundColor Yellow
            exit 1
        }
        $setupInfo += "SUCCESS: WSL IP: $wslIp"
        Write-Host "   SUCCESS: WSL IP: $wslIp" -ForegroundColor Green
    } catch {
        $setupInfo += "ERROR: $($_)"
        Write-Host "   ERROR: $_" -ForegroundColor Red
        exit 1
    }

    $rpcUrl = "http://${wslIp}:8899"
    $env:SOLANA_RPC_URL = $rpcUrl
    Write-Host "   RPC URL: $rpcUrl" -ForegroundColor Gray

    # ============================================================
    # Step 2: Check/Start Solana Validator
    # ============================================================
    Write-Host "`n2. Checking Solana validator..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 2: Checking Solana validator..."

    $validatorAccessible = $false
    try {
        $healthCheck = @{
            jsonrpc = "2.0"
            id = 1
            method = "getHealth"
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $healthCheck -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
        $validatorAccessible = $true
        $setupInfo += "SUCCESS: Validator is accessible"
        Write-Host "   SUCCESS: Validator is accessible" -ForegroundColor Green
    } catch {
        if ($SkipValidator) {
            $setupInfo += "WARNING: Validator not accessible, skipping (--SkipValidator)"
            Write-Host "   WARNING: Validator not accessible, skipping" -ForegroundColor Yellow
        } else {
            $setupInfo += "Validator not running, starting it..."
            Write-Host "   Validator not running, starting it in WSL..." -ForegroundColor Yellow

            # Step 1: Kill any existing validator
            Write-Host "   Step 1: Killing any existing validator..." -ForegroundColor Gray
            wsl bash -c "pkill -f solana-test-validator 2>/dev/null || true"
            Start-Sleep -Seconds 2

            # Step 2: Check if solana-test-validator is available
            Write-Host "   Step 2: Checking solana-test-validator..." -ForegroundColor Gray
            $solanaCheck = wsl bash -l -c "which solana-test-validator"
            if ($LASTEXITCODE -ne 0) {
                $setupInfo += "ERROR: solana-test-validator not found in PATH"
                Write-Host "   ERROR: solana-test-validator not found in PATH" -ForegroundColor Red
                Write-Host "   Make sure Solana CLI is installed in WSL" -ForegroundColor Yellow
                exit 1
            }
            Write-Host "   Found at: $solanaCheck" -ForegroundColor Gray

            # Step 3: Clean up old ledger
            Write-Host "   Step 3: Cleaning up old ledger..." -ForegroundColor Gray
            # Use the correct directory path where you manually ran the command
            $rustProjectRoot = "$wslProjectRoot/rust/ocentra-games"
            wsl bash -c "cd $rustProjectRoot && rm -rf test-ledger"

            # Step 4: Try different approaches to start the validator
            Write-Host "   Step 4: Starting validator..." -ForegroundColor Gray
            $solanaPath = $solanaCheck.Trim()
            
            # First, let's try running it manually to see the full error with different configurations
            Write-Host "   Testing validator startup with different configurations..." -ForegroundColor Gray
            
            # Try without bind-address first (default localhost)
            Write-Host "   Testing 1: Default settings (localhost)..." -ForegroundColor Gray
            $simpleCmd = "cd $rustProjectRoot && RUST_BACKTRACE=full timeout 15s $solanaPath --reset --ledger test-ledger 2>&1"
            $simpleOutput = wsl bash -l -c $simpleCmd
            $simpleWorks = ($simpleOutput -notmatch "panicked" -and $simpleOutput -notmatch "Error:") -and ($simpleOutput -match "Initializing" -or $simpleOutput -match "Ledger location")
            
            if ($simpleWorks) {
                Write-Host "   SUCCESS: Default settings work!" -ForegroundColor Green
                
                # Kill any processes from the test
                wsl bash -c "pkill -f solana-test-validator 2>/dev/null || true"
                Start-Sleep -Seconds 2
                
                # Try with just --rpc-port (should still use default bind-address)
                Write-Host "   Testing 2: With --rpc-port 8899..." -ForegroundColor Gray
                $rpcOnlyCmd = "cd $rustProjectRoot && RUST_BACKTRACE=full timeout 15s $solanaPath --reset --ledger test-ledger --rpc-port 8899 2>&1"
                $rpcOnlyOutput = wsl bash -l -c $rpcOnlyCmd
                $rpcOnlyWorks = ($rpcOnlyOutput -notmatch "panicked" -and $rpcOnlyOutput -notmatch "Error:") -and ($rpcOnlyOutput -match "Initializing" -or $rpcOnlyOutput -match "Ledger location")
                
                if ($rpcOnlyWorks) {
                    Write-Host "   SUCCESS: --rpc-port works! Starting validator in background..." -ForegroundColor Green
                    
                    # Kill any processes from the test
                    wsl bash -c "pkill -f solana-test-validator 2>/dev/null || true"
                    Start-Sleep -Seconds 2
                    
                    # Track which method we're using
                    $usingTmux = $false
                    $usingScreen = $false
                    $sessionName = "nohup"
                    
                    # Start with tmux/screen/nohup using --rpc-port only
                    $tmuxCheck = wsl bash -c "which tmux"
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "   Using tmux to run validator..." -ForegroundColor Gray
                        $usingTmux = $true
                        $validatorCmd = "cd $rustProjectRoot && tmux new-session -d -s solana-validator '$solanaPath --reset --ledger test-ledger --rpc-port 8899'"
                        Write-Host "   Running: $validatorCmd" -ForegroundColor Gray
                        wsl bash -l -c $validatorCmd
                        $sessionName = "tmux: solana-validator"
                    } else {
                        # Fallback to nohup
                        Write-Host "   Using nohup to run validator..." -ForegroundColor Gray
                        $validatorCmd = "cd $rustProjectRoot && nohup $solanaPath --reset --ledger test-ledger --rpc-port 8899 > validator.log 2>&1 &"
                        Write-Host "   Running: $validatorCmd" -ForegroundColor Gray
                        wsl bash -l -c $validatorCmd
                        $sessionName = "nohup"
                    }
                    
                } else {
                    Write-Host "   WARNING: --rpc-port test failed, using default settings..." -ForegroundColor Yellow
                    Write-Host "   Output: $rpcOnlyOutput" -ForegroundColor Yellow
                    
                    # Kill any processes from the test
                    wsl bash -c "pkill -f solana-test-validator 2>/dev/null || true"
                    Start-Sleep -Seconds 2
                    
                    # Use default settings (no --rpc-port)
                    $usingTmux = $false
                    $tmuxCheck = wsl bash -c "which tmux"
                    if ($LASTEXITCODE -eq 0) {
                        $usingTmux = $true
                        $validatorCmd = "cd $rustProjectRoot && tmux new-session -d -s solana-validator '$solanaPath --reset --ledger test-ledger'"
                        wsl bash -l -c $validatorCmd
                        $sessionName = "tmux: solana-validator"
                    } else {
                        $validatorCmd = "cd $rustProjectRoot && nohup $solanaPath --reset --ledger test-ledger > validator.log 2>&1 &"
                        wsl bash -l -c $validatorCmd
                        $sessionName = "nohup"
                    }
                }
            } else {
                Write-Host "   ERROR: Default settings failed!" -ForegroundColor Red
                Write-Host "   Output:" -ForegroundColor Yellow
                $simpleOutput | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
                
                $setupInfo += "ERROR: Validator fails even with default settings"
                Write-Host "   ERROR: Validator fails even with default settings" -ForegroundColor Red
                Write-Host "   This might be a Solana installation or system issue" -ForegroundColor Yellow
                exit 1
            }

            # Step 5: Wait for validator to initialize (longer wait time)
            Write-Host "   Step 5: Waiting for validator to initialize..." -ForegroundColor Gray
            Write-Host "   NOTE: 'Unable to connect to validator' errors are normal during startup" -ForegroundColor Yellow
            
            $maxWait = 60  # Increased wait time to 60 seconds
            $waited = 0
            $validatorAccessible = $false
            
            while ($waited -lt $maxWait -and -not $validatorAccessible) {
                Start-Sleep -Seconds 2
                $waited += 2
                
                try {
                    # Try to connect to the RPC endpoint
                    $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $healthCheck -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
                    $validatorAccessible = $true
                    Write-Host "   SUCCESS: Validator is now accessible after ${waited}s" -ForegroundColor Green
                    break
                } catch {
                    if ($waited % 10 -eq 0) {
                        Write-Host "   Still waiting for validator to start... ($waited/$maxWait seconds)" -ForegroundColor Gray
                        
                        # Check if the process is running
                        $processCheck = wsl bash -c "ps aux | grep '[s]olana-test-validator' | wc -l"
                        if ($processCheck -gt 0) {
                            Write-Host "   Validator process is running, waiting for RPC to be ready..." -ForegroundColor Gray
                            
                            # Show the process details
                            $processDetails = wsl bash -c "ps aux | grep '[s]olana-test-validator'"
                            Write-Host "   Process details: $processDetails" -ForegroundColor Gray
                            
                            # Check if the validator is listening on the right port
                            $portCheck = wsl bash -c "netstat -tlnp 2>/dev/null | grep 8899 || echo 'Port not yet listening'"
                            Write-Host "   Port status: $portCheck" -ForegroundColor Gray
                        } else {
                            Write-Host "   WARNING: Validator process not found" -ForegroundColor Yellow
                            
                            # Check if there are any logs
                            $logCheck = wsl bash -c "ls -la $rustProjectRoot/test-ledger/validator.log 2>/dev/null || echo 'Log not found'"
                            Write-Host "   Log file: $logCheck" -ForegroundColor Yellow
                            
                            if ($logCheck -notlike "*Log not found*") {
                                $logTail = wsl bash -c "tail -n 5 $rustProjectRoot/test-ledger/validator.log"
                                Write-Host "   Last 5 lines of log:" -ForegroundColor Yellow
                                $logTail | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
                            }
                        }
                    }
                }
            }

            if ($validatorAccessible) {
                $setupInfo += "SUCCESS: Validator started and accessible"
                Write-Host "   SUCCESS: Validator started and accessible" -ForegroundColor Green
                
                # Show how to check validator logs
                Write-Host "   Validator is running in background ($sessionName)" -ForegroundColor Gray
                Write-Host "   To check validator logs:" -ForegroundColor Gray
                if ($usingTmux) {
                    Write-Host "     wsl tmux attach -t solana-validator" -ForegroundColor Gray
                } elseif ($usingScreen) {
                    Write-Host "     wsl screen -r solana-validator" -ForegroundColor Gray
                } else {
                    Write-Host "     wsl cat $rustProjectRoot/test-ledger/validator.log" -ForegroundColor Gray
                }
            } else {
                $setupInfo += "ERROR: Validator failed to start after ${maxWait}s"
                Write-Host "   ERROR: Validator failed to start" -ForegroundColor Red
                
                # Try to get more information
                Write-Host "   Checking what happened..." -ForegroundColor Yellow
                
                # Check if the process is running
                $processCheck = wsl bash -c "ps aux | grep '[s]olana-test-validator'"
                if (-not [string]::IsNullOrWhiteSpace($processCheck)) {
                    Write-Host "   Process is running:" -ForegroundColor Yellow
                    $processCheck | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
                } else {
                    Write-Host "   Process is not running" -ForegroundColor Yellow
                }
                
                # Check if we can see any logs
                $logCheck = wsl bash -c "ls -la $rustProjectRoot/test-ledger/validator.log 2>/dev/null || echo 'Log not found'"
                Write-Host "   Log file: $logCheck" -ForegroundColor Yellow
                
                if ($logCheck -notlike "*Log not found*") {
                    $logTail = wsl bash -c "tail -n 20 $rustProjectRoot/test-ledger/validator.log"
                    Write-Host "   Last 20 lines of log:" -ForegroundColor Yellow
                    $logTail | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
                }
                
                # Try to run the validator manually to see the error
                Write-Host "   Trying to run validator manually to see the error..." -ForegroundColor Yellow
                $manualCmd = "cd $rustProjectRoot && timeout 10s $solanaPath --reset --ledger test-ledger --bind-address 0.0.0.0 --rpc-port 8899 2>&1"
                Write-Host "   Running: $manualCmd" -ForegroundColor Gray
                $manualOutput = wsl bash -l -c $manualCmd
                Write-Host "   Manual output:" -ForegroundColor Yellow
                $manualOutput | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
                
                exit 1
            }
        }
    }

    # ============================================================
    # Step 3: Build Program (if needed)
    # ============================================================
    Write-Host "`n3. Checking program build..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 3: Checking program build..."

    $idlPath = Join-Path $projectRoot "Rust\ocentra-games\target\idl\ocentra_games.json"
    $needsBuild = -not (Test-Path $idlPath)

    if ($needsBuild -and -not $SkipBuild) {
        Write-Host "   IDL not found, building program..." -ForegroundColor Yellow
        $setupInfo += "Building program..."

        # Use login shell to ensure Solana/Anchor are in PATH
        $buildCmd = "cd $wslProjectRoot/Rust/ocentra-games && anchor build 2>&1"
        Write-Host "   Running: anchor build" -ForegroundColor Gray

        $buildOutput = wsl bash -l -c $buildCmd
        $buildOutput | ForEach-Object {
            if ($Verbose) { Write-Host "   $_" -ForegroundColor Gray }
            $setupInfo += $_
        }

        if (Test-Path $idlPath) {
            $setupInfo += "SUCCESS: Program built"
            Write-Host "   SUCCESS: Program built" -ForegroundColor Green
        } else {
            $setupInfo += "ERROR: Build failed"
            Write-Host "   ERROR: Build failed" -ForegroundColor Red
            exit 1
        }
    } elseif ($SkipBuild) {
        Write-Host "   Skipping build (--SkipBuild)" -ForegroundColor Yellow
    } else {
        Write-Host "   IDL exists, skipping build" -ForegroundColor Green
    }

    # ============================================================
    # Step 4: Check/Deploy Program
    # ============================================================
    Write-Host "`n4. Checking program deployment..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 4: Checking program deployment..."

    $programDeployed = $false
    try {
        $checkProgram = @{
            jsonrpc = "2.0"
            id = 1
            method = "getAccountInfo"
            params = @($PROGRAM_ID, @{ encoding = "base58" })
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $checkProgram -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        if ($data.result.value) {
            $programDeployed = $true
            $setupInfo += "SUCCESS: Program deployed at $PROGRAM_ID"
            Write-Host "   SUCCESS: Program deployed" -ForegroundColor Green
        } else {
            $setupInfo += "Program not deployed, deploying..."
            Write-Host "   Program not deployed, deploying..." -ForegroundColor Yellow

            # Use login shell to ensure Solana/Anchor are in PATH
            $deployCmd = "cd $wslProjectRoot/Rust/ocentra-games && anchor deploy 2>&1"
            Write-Host "   Running: anchor deploy" -ForegroundColor Gray

            $deployOutput = wsl bash -l -c $deployCmd
            $deployOutput | ForEach-Object {
                if ($Verbose -or $_ -match "Program Id:|Deploying|Deploy success") {
                    Write-Host "   $_" -ForegroundColor Gray
                }
                $setupInfo += $_
            }

            # Check again
            Start-Sleep -Seconds 2
            $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $checkProgram -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
            $data = $response.Content | ConvertFrom-Json

            if ($data.result.value) {
                $programDeployed = $true
                $setupInfo += "SUCCESS: Program deployed"
                Write-Host "   SUCCESS: Program deployed" -ForegroundColor Green
            } else {
                $setupInfo += "ERROR: Deployment failed"
                Write-Host "   ERROR: Deployment failed" -ForegroundColor Red
                exit 1
            }
        }
    } catch {
        $setupInfo += "ERROR: $_"
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }

    # ============================================================
    # Step 5: Validate IDL
    # ============================================================
    Write-Host "`n5. Validating IDL..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 5: Validating IDL..."

    $idlPath = Join-Path $projectRoot "Rust\ocentra-games\target\idl\ocentra_games.json"
    $idlValid = $false
    if (Test-Path $idlPath) {
        try {
            $idl = Get-Content $idlPath -Raw | ConvertFrom-Json
            if ($idl.address -eq $PROGRAM_ID) {
                $idlValid = $true
                $setupInfo += "SUCCESS: IDL valid ($($idl.instructions.Count) instructions)"
                Write-Host "   SUCCESS: IDL valid" -ForegroundColor Green
                Write-Host "   Instructions: $($idl.instructions.Count)" -ForegroundColor Gray
            } else {
                $setupInfo += "WARNING: IDL address mismatch"
                Write-Host "   WARNING: IDL address doesn't match program ID" -ForegroundColor Yellow
            }
        } catch {
            $setupInfo += "ERROR: Cannot parse IDL: $_"
            Write-Host "   ERROR: Cannot parse IDL" -ForegroundColor Red
        }
    } else {
        $setupInfo += "ERROR: IDL not found at $idlPath"
        Write-Host "   ERROR: IDL not found" -ForegroundColor Red
        Write-Host "   Build: cd Rust/ocentra-games && anchor build" -ForegroundColor Yellow
    }

    # ============================================================
    # Step 6: Check/Initialize GameRegistry
    # ============================================================
    Write-Host "`n6. Checking GameRegistry..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 6: Checking GameRegistry..."

    $registryInitialized = $false
    try {
        $checkRegistry = @{
            jsonrpc = "2.0"
            id = 1
            method = "getAccountInfo"
            params = @($REGISTRY_PDA, @{ encoding = "base58" })
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $checkRegistry -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        if ($data.result.value) {
            $registryInitialized = $true
            $setupInfo += "SUCCESS: GameRegistry initialized"
            Write-Host "   SUCCESS: GameRegistry initialized" -ForegroundColor Green
            Write-Host "   PDA: $REGISTRY_PDA" -ForegroundColor Gray
        } else {
            $setupInfo += "GameRegistry not found - needs initialization"
            Write-Host "   GameRegistry not found - needs initialization" -ForegroundColor Yellow
        }
    } catch {
        $setupInfo += "ERROR: $_"
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }

    # ============================================================
    # Step 7: Check/Initialize ConfigAccount
    # ============================================================
    Write-Host "`n7. Checking ConfigAccount..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 7: Checking ConfigAccount..."

    $configInitialized = $false
    try {
        $checkConfig = @{
            jsonrpc = "2.0"
            id = 1
            method = "getAccountInfo"
            params = @($CONFIG_PDA, @{ encoding = "base58" })
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri $rpcUrl -Method Post -Body $checkConfig -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        if ($data.result.value) {
            $configInitialized = $true
            $setupInfo += "SUCCESS: ConfigAccount initialized"
            Write-Host "   SUCCESS: ConfigAccount initialized" -ForegroundColor Green
            Write-Host "   PDA: $CONFIG_PDA" -ForegroundColor Gray
        } else {
            $setupInfo += "ConfigAccount not found - needs initialization"
            Write-Host "   ConfigAccount not found - needs initialization" -ForegroundColor Yellow
        }
    } catch {
        $setupInfo += "ERROR: $_"
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }

    # ============================================================
    # Step 8: Initialize Missing Accounts (via Node.js inline script)
    # ============================================================
    if ((-not $registryInitialized -or -not $configInitialized) -and -not $SkipSetup) {
        Write-Host "`n8. Initializing missing accounts..." -ForegroundColor Cyan
        $setupInfo += ""
        $setupInfo += "Step 8: Initializing missing accounts..."

        # Create inline Node.js script for initialization
        $initScript = @"
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = '$PROGRAM_ID';
const RPC_URL = '$rpcUrl';

async function main() {
    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);

    // Load or create authority keypair
    const keypairPath = path.join(process.cwd(), '.local-authority.json');
    let authorityKeypair;
    if (fs.existsSync(keypairPath)) {
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        authorityKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        console.log('Loaded authority: ' + authorityKeypair.publicKey.toString());
    } else {
        authorityKeypair = Keypair.generate();
        fs.writeFileSync(keypairPath, JSON.stringify(Array.from(authorityKeypair.secretKey)));
        console.log('Created authority: ' + authorityKeypair.publicKey.toString());
    }

    // Airdrop if needed
    const balance = await connection.getBalance(authorityKeypair.publicKey);
    if (balance < 1e9) {
        console.log('Requesting airdrop...');
        const sig = await connection.requestAirdrop(authorityKeypair.publicKey, 2e9);
        await connection.confirmTransaction(sig, 'confirmed');
        console.log('Airdrop complete');
    }

    // Load IDL
    const idlPath = path.join(process.cwd(), 'Rust', 'ocentra-games', 'target', 'idl', 'ocentra_games.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

    // Create program
    const wallet = new Wallet(authorityKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl, provider);

    // PDAs
    const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from('game_registry')], programId);
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config_account')], programId);

    // Initialize GameRegistry if needed
    const registryInfo = await connection.getAccountInfo(registryPda);
    if (!registryInfo) {
        console.log('Initializing GameRegistry...');
        const tx = await program.methods.initializeRegistry()
            .accounts({
                registry: registryPda,
                authority: authorityKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([authorityKeypair])
            .rpc();
        console.log('GameRegistry initialized: ' + tx);
    }

    // Initialize ConfigAccount if needed
    const configInfo = await connection.getAccountInfo(configPda);
    if (!configInfo) {
        console.log('Initializing ConfigAccount...');
        const tx = await program.methods.initializeConfig(authorityKeypair.publicKey)
            .accounts({
                configAccount: configPda,
                authority: authorityKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([authorityKeypair])
            .rpc();
        console.log('ConfigAccount initialized: ' + tx);
    }

    // Register CLAIM game if needed
    const registry = await program.account.gameRegistry.fetch(registryPda);
    let claimRegistered = false;
    for (let i = 0; i < registry.gameCount; i++) {
        if (registry.games[i].gameId === 0) {
            claimRegistered = true;
            break;
        }
    }

    if (!claimRegistered) {
        console.log('Registering CLAIM game...');
        const tx = await program.methods.registerGame(0, 'CLAIM', 2, 10, 'https://ocentra.io', 1)
            .accounts({
                registry: registryPda,
                authority: authorityKeypair.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([authorityKeypair])
            .rpc();
        console.log('CLAIM game registered: ' + tx);
    }

    console.log('Setup complete!');
}

main().catch(e => {
    console.error('Setup failed:', e.message);
    process.exit(1);
});
"@

        # Run the init script
        $initOutput = $initScript | node 2>&1
        $initOutput | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
            $setupInfo += $_
        }

        if ($LASTEXITCODE -eq 0) {
            $registryInitialized = $true
            $configInitialized = $true
            $setupInfo += "SUCCESS: Accounts initialized"
            Write-Host "   SUCCESS: Accounts initialized" -ForegroundColor Green
        } else {
            $setupInfo += "ERROR: Initialization failed"
            Write-Host "   ERROR: Initialization failed" -ForegroundColor Red
        }
    } elseif ($SkipSetup) {
        Write-Host "`n8. Skipping initialization (--SkipSetup)" -ForegroundColor Yellow
    } else {
        Write-Host "`n8. All accounts already initialized" -ForegroundColor Green
    }

    # ============================================================
    # Step 9: Setup Test Results Directory
    # ============================================================
    Write-Host "`n9. Setting up test results..." -ForegroundColor Cyan
    $setupInfo += ""
    $setupInfo += "Step 9: Setting up test results..."

    $reportsDir = Join-Path $projectRoot "test-results"
    if (-not (Test-Path $reportsDir)) {
        New-Item -ItemType Directory -Path $reportsDir | Out-Null
    }

    # Clean old reports
    $oldReports = Get-ChildItem -Path $reportsDir -Filter "test-report*.md" -ErrorAction SilentlyContinue
    foreach ($report in $oldReports) {
        Remove-Item $report.FullName -Force
    }
    if ($oldReports.Count -gt 0) {
        Write-Host "   Cleaned $($oldReports.Count) old report(s)" -ForegroundColor Gray
    }

    # ============================================================
    # Step 10: Run Tests
    # ============================================================
    Write-Host "`n10. Running tests..." -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Gray

    $testStartTime = Get-Date
    $testOutputLines = @()

    npm test 2>&1 | ForEach-Object {
        [Console]::Out.WriteLine($_)
        $testOutputLines += $_
    }

    $testOutput = $testOutputLines -join "`n"
    $testEndTime = Get-Date
    $testDuration = $testEndTime - $testStartTime

    Write-Host "============================================================" -ForegroundColor Gray

    # ============================================================
    # Step 11: Generate Report
    # ============================================================
    Write-Host "`n11. Generating report..." -ForegroundColor Cyan

    # Clean output for markdown
    $cleanOutput = $testOutput -replace '\x1b\[[0-9;]*[a-zA-Z]', '' -replace '\x1b\][0-9;]*', ''
    $cleanOutput = $cleanOutput -replace '[^\x00-\x7F]', ''

    # Parse test results
    $passedTests = 0
    $failedTests = 0
    $skippedTests = 0
    $totalTests = 0

    if ($cleanOutput -match "Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed\s+\|\s+(\d+)\s+skipped") {
        $failedTests = [int]$matches[1]
        $passedTests = [int]$matches[2]
        $skippedTests = [int]$matches[3]
        $totalTests = $failedTests + $passedTests + $skippedTests
    }

    $passedPercent = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 1) } else { 0 }
    $overallStatus = if ($failedTests -eq 0) { "PASSED" } else { "FAILED" }

    $reportPath = Join-Path $reportsDir "test-report.md"
    $date = $testStartTime.ToString("yyyy-MM-dd HH:mm:ss")

    $markdown = @"
# Test Report

**Date:** $date
**Duration:** $($testDuration.TotalSeconds.ToString("F2"))s

## Environment

| Property | Value |
|----------|-------|
| RPC URL | ``$rpcUrl`` |
| Program ID | ``$PROGRAM_ID`` |
| WSL IP | $wslIp |

## Setup Status

| Check | Status |
|-------|--------|
| Validator | $(if ($validatorAccessible) { "Accessible" } else { "Unreachable" }) |
| Program | $(if ($programDeployed) { "Deployed" } else { "Not Found" }) |
| IDL | $(if ($idlValid) { "Valid" } else { "Invalid" }) |
| GameRegistry | $(if ($registryInitialized) { "Initialized" } else { "Not Found" }) |
| ConfigAccount | $(if ($configInitialized) { "Initialized" } else { "Not Found" }) |

## Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total** | $totalTests | 100% |
| **Passed** | $passedTests | ${passedPercent}% |
| **Failed** | $failedTests | $([math]::Round(($failedTests / [math]::Max($totalTests, 1)) * 100, 1))% |
| **Skipped** | $skippedTests | $([math]::Round(($skippedTests / [math]::Max($totalTests, 1)) * 100, 1))% |

### Overall Status: $overallStatus

## Setup Logs

``````
$($setupInfo -join "`n")
``````
"@

    # Parse failed tests from JSON if available
    $failedTestsSection = ""
    $jsonResultsPath = Join-Path $reportsDir "test-results.json"
    if (Test-Path $jsonResultsPath) {
        try {
            $jsonResults = Get-Content $jsonResultsPath | ConvertFrom-Json
            $failedTestsList = @()
            
            foreach ($testFile in $jsonResults.testResults) {
                foreach ($test in $testFile.assertionResults) {
                    if ($test.status -eq "failed") {
                        $filePath = $testFile.name -replace [regex]::Escape($projectRoot), "" -replace "^\\", "" -replace "^/", ""
                        $testName = $test.fullName
                        $errorMsg = if ($test.failureMessages -and $test.failureMessages.Count -gt 0) {
                            ($test.failureMessages[0] -split "`n" | Select-Object -First 5 | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }) -join "`n"
                        } else { "No error message" }
                        
                        $failedTestsList += @"
### [$testName]($filePath)

**File:** ``$filePath``  
**Duration:** $($test.duration)ms

**Error:**
``````
$errorMsg
``````

"@
                    }
                }
            }
            
            if ($failedTestsList.Count -gt 0) {
                $failedTestsSection = @"

## Failed Tests ($failedTestsList.Count)

$($failedTestsList -join "`n`n---`n`n")
"@
            }
        } catch {
            # If JSON parsing fails, continue without failed tests section
            $failedTestsSection = ""
        }
    }

    $markdown += $failedTestsSection + @"

## Test Output

<details>
<summary>Click to expand raw output</summary>

``````
$cleanOutput
``````

</details>
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($reportPath, $markdown, $utf8NoBom)

    Write-Host "   Report saved: $reportPath" -ForegroundColor Green

    # ============================================================
    # Summary
    # ============================================================
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  Test Run Complete" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Results: $passedTests passed, $failedTests failed, $skippedTests skipped" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Yellow" })
    Write-Host "  Duration: $($testDuration.TotalSeconds.ToString("F2"))s" -ForegroundColor Gray
    Write-Host "  Report: $reportPath" -ForegroundColor Gray
    Write-Host ""

} finally {
    Pop-Location
}
