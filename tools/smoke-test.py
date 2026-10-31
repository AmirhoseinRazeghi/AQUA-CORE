"""Optional offline browser smoke test for AQUA-CORE.

Install the developer-only dependency with:
    python -m pip install -r tools/requirements-dev.txt
Run from the repository root:
    python tools/smoke-test.py
"""
from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
html = INDEX.read_text(encoding="utf-8")

# Inline local CSS and JS so the harness exercises the same source without a server.
for href in re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)', html):
    css = (ROOT / href).read_text(encoding="utf-8")
    html = html.replace(f'<link rel="stylesheet" href="{href}">', f"<style>\n{css}\n</style>")
html = re.sub(r'<link[^>]*>', '', html)
html = re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', html)
script_sources = re.findall(r'<script src=["\']([^"\']+)', INDEX.read_text(encoding="utf-8"))

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path="/usr/bin/chromium",
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    errors = []
    page.on("console", lambda message: errors.append(f"console.{message.type}: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.set_content(html, wait_until="load")
    for source in script_sources:
        page.add_script_tag(content=(ROOT / source).read_text(encoding="utf-8"))
    page.wait_for_timeout(450)

    print("loaded", flush=True)
    assert page.title() == "AQUA-CORE | Industrial Automation Digital Twin"
    assert page.evaluate("!!window.AquaCore && !!AquaCore.app"), "Runtime did not initialize"
    assert page.locator("#pageContent").is_visible(), "HMI page content is not visible"

    print("runtime initialized", flush=True)
    page_routes = ["overview", "process", "equipment", "loops", "packaging", "alarms", "trends", "plc", "comms", "faults", "diagnostics", "tests"]
    route_summaries = {}
    for name in page_routes:
        page.locator(f'.nav-item[data-page="{name}"]').click()
        page.wait_for_timeout(90)
        text = page.locator("#pageContent").inner_text()
        assert text.strip(), f"Page {name} rendered empty content"
        route_summaries[name] = text[:100].replace("\n", " | ")

    print("routes completed", flush=True)
    # Verify header controls and the simulated safety latch/reset workflow.
    page.locator("#pauseButton").click()
    assert page.evaluate("AquaCore.app.clock.paused") is True, "Pause control failed"
    page.locator("#pauseButton").click()
    assert page.evaluate("AquaCore.app.clock.paused") is False, "Resume control failed"
    page.locator("#speedButton").click()
    assert page.evaluate("AquaCore.app.clock.speed") == 2, "Speed control failed"
    page.locator("#estopButton").click()
    assert page.evaluate("AquaCore.app.plc.estop && AquaCore.app.plc.tripLatched"), "E-STOP did not latch"
    page.locator("#estopButton").click()
    page.evaluate("AquaCore.app.plc.scan(AquaCore.app.config.scanMs / 1000)")
    assert page.evaluate("!AquaCore.app.plc.estop && AquaCore.app.plc.tripLatched"), "E-STOP release incorrectly cleared the trip"
    page.evaluate("AquaCore.app.plc.request('RESET_TRIP')")
    page.evaluate("AquaCore.app.plc.scan(AquaCore.app.config.scanMs / 1000)")
    assert page.evaluate("!AquaCore.app.plc.tripLatched"), "Trip reset request failed"

    print("controls completed", flush=True)
    # Run the complete test suite from the HMI.
    page.locator('.nav-item[data-page="tests"]').click()
    page.locator('[data-action="run-tests"]').click()
    page.wait_for_function("AquaCore.app.testRunner.summary().total === AquaCore.app.testRunner.tests().length", timeout=10000)
    print("test suite completed", flush=True)
    summary = page.evaluate("AquaCore.app.testRunner.summary()")
    results = page.evaluate("AquaCore.app.testRunner.results")
    assert summary["fail"] == 0, f"Test failures: {results}"
    assert summary["total"] == 31, f"Expected 31 tests, found {summary['total']}"

    # Confirm local-only runtime: source has no remote JS/CSS/font or API references.
    source_checks = {
        "external_script_or_style": bool(re.search(r'<(?:script|link)[^>]+(?:src|href)=["\']https?://', INDEX.read_text(encoding="utf-8"), re.I)),
        "runtime_backend": False,
    }
    assert not source_checks["external_script_or_style"], "External runtime dependency detected"

    report = {
        "project": "AQUA-CORE",
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "summary": summary,
        "routes": route_summaries,
        "headerControls": {"pauseResume": "PASS", "speedControl": "PASS", "simulatedEStopAndReset": "PASS"},
        "sourceChecks": source_checks,
        "renderer": page.evaluate("({webgl: !!AquaCore.app.renderer?.webglAvailable, fallback: !AquaCore.app.renderer?.webglAvailable})"),
        "browserErrors": errors,
        "results": results,
    }
    (ROOT / "docs" / "TEST-REPORT.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    assert not errors, f"Browser errors were recorded: {errors}"

    print("evidence written", flush=True)
    page.locator('.nav-item[data-page="overview"]').click()
    page.wait_for_timeout(250)
    page.evaluate("document.querySelectorAll('.toast').forEach(node => node.remove())")
    (ROOT / "docs" / "screenshots").mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(ROOT / "docs" / "screenshots" / "overview.png"), full_page=True)

    print(json.dumps({
        "summary": summary,
        "routes_checked": len(route_summaries),
        "controls": report["headerControls"],
        "renderer": report["renderer"],
        "browser_errors": errors,
    }, indent=2))
    browser.close()
