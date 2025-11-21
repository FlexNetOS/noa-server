// RTT Planner - SECURITY HARDENED
// Generates execution plans with security validation

use anyhow::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::{fs, path::PathBuf};

#[derive(Serialize, Deserialize, Clone)]
struct Route {
    from: String,
    to: String,
}

#[derive(Serialize, Deserialize)]
struct Routes {
    routes: Vec<Route>,
}

#[derive(Serialize, Deserialize)]
struct Plan {
    plan_id: String,
    routes_add: Vec<Route>,
    routes_del: Vec<Route>,
    order: Vec<String>,
    sign: Option<Sign>,
}

#[derive(Serialize, Deserialize)]
struct Sign {
    alg: String,
    key_id: String,
    sig: String,
}

fn hash_bytes(b: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(b);
    format!("sha256-{:x}", h.finalize())
}

fn validate_path(path: &str, purpose: &str) -> Result<PathBuf> {
    let p = PathBuf::from(path);

    // Check for path traversal
    if path.contains("..") || path.contains("~") {
        bail!("Path traversal detected in {}: {}", purpose, path);
    }

    // Check for absolute paths trying to escape
    if p.is_absolute() {
        bail!("Absolute paths not allowed in {}: {}", purpose, path);
    }

    Ok(p)
}

fn safe_execute_signer(key_path: &str, plan_path: &PathBuf) -> Result<String> {
    // Validate inputs
    if key_path.contains(";") || key_path.contains("|") || key_path.contains("&") {
        bail!("Invalid characters in key path");
    }

    let plan_str = plan_path.to_string_lossy();
    if plan_str.contains(";") || plan_str.contains("|") || plan_str.contains("&") {
        bail!("Invalid characters in plan path");
    }

    // Use fixed signer path (no user input)
    let signer_paths = [
        "./tools/rtt_sign_rs/target/release/rtt-sign",
        "../tools/rtt_sign_rs/target/release/rtt-sign",
        "rtt-sign", // In PATH
    ];

    let mut last_error = None;

    for signer_path in &signer_paths {
        let output = std::process::Command::new(signer_path)
            .args(&["sign", key_path, &plan_str])
            .output();

        match output {
            Ok(o) if o.status.success() => {
                let sig = String::from_utf8_lossy(&o.stdout).trim().to_string();
                return Ok(sig);
            }
            Ok(o) => {
                last_error = Some(anyhow!(
                    "Signer exited with error: {}",
                    String::from_utf8_lossy(&o.stderr)
                ));
            }
            Err(e) => {
                last_error = Some(anyhow!("Failed to execute signer: {}", e));
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow!("No signer found")))
}

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 4 {
        eprintln!("RTT Planner v1.0.0 - SECURITY HARDENED");
        eprintln!();
        eprintln!("usage: rtt-planner <routes.json> <manifests_dir> <out_plan.json> [sign_key_b64]");
        eprintln!();
        eprintln!("Arguments:");
        eprintln!("  routes.json      - Input routes file");
        eprintln!("  manifests_dir    - Directory containing manifests");
        eprintln!("  out_plan.json    - Output plan file");
        eprintln!("  sign_key_b64     - Optional signing key (base64)");
        bail!("Invalid arguments");
    }

    // Validate all input paths
    let routes_path = validate_path(&args[1], "routes file")?;
    let _manifests_dir = validate_path(&args[2], "manifests directory")?;
    let out_path = validate_path(&args[3], "output file")?;

    // Load routes
    let routes_content = fs::read_to_string(&routes_path)
        .with_context(|| format!("Failed to read routes file: {:?}", routes_path))?;

    let routes: Routes = serde_json::from_str(&routes_content)
        .with_context(|| "Failed to parse routes JSON")?;

    // Create plan
    let mut plan = Plan {
        plan_id: "sha256-PLACEHOLDER".to_string(),
        routes_add: routes.routes.clone(),
        routes_del: vec![],
        order: vec!["BATCH-1".into()],
        sign: None,
    };

    // Compute plan hash
    let plan_json = serde_json::to_vec(&plan)?;
    let pid = hash_bytes(&plan_json);
    plan.plan_id = pid.clone();

    // Write initial plan
    fs::write(&out_path, serde_json::to_vec_pretty(&plan)?)
        .with_context(|| format!("Failed to write output file: {:?}", out_path))?;

    // Sign if key provided
    if args.len() > 4 {
        eprintln!("[INFO] Signing plan with provided key");

        match safe_execute_signer(&args[4], &out_path) {
            Ok(sig) => {
                let mut signed_plan = plan;
                signed_plan.sign = Some(Sign {
                    alg: "ed25519".into(),
                    key_id: "dev".into(),
                    sig,
                });

                fs::write(&out_path, serde_json::to_vec_pretty(&signed_plan)?)
                    .with_context(|| "Failed to write signed plan")?;

                eprintln!("[OK] Plan signed successfully");
            }
            Err(e) => {
                eprintln!("[WARN] Signing failed: {}", e);
                eprintln!("[WARN] Plan written without signature");
            }
        }
    }

    // Print plan ID
    println!("{}", pid);
    eprintln!("[OK] Plan generated: {:?}", out_path);

    Ok(())
}
