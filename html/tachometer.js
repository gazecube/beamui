// BeamUI Tachometer Controller

class Tachometer {
    constructor() {
        this.rpm = 0;
        this.maxRPM = 8000;
        this.needle = null;
        this.rpmDisplay = null;
        this.initialized = false;
        
        this.init();
    }

    init() {
        // Wait for BeamNG API to be available
        if (typeof be !== 'undefined' && be.ui) {
            this.setupBeamNGCallbacks();
            this.initialized = true;
        } else {
            // Retry if BeamNG API not ready
            setTimeout(() => this.init(), 100);
        }
    }

    setupBeamNGCallbacks() {
        // Subscribe to vehicle data updates
        if (be.ui.inputActionCalled) {
            be.ui.inputActionCalled.connect(this, this.onInputAction);
        }

        // Request vehicle state updates
        if (be.ui.onVehicleData) {
            be.ui.onVehicleData.connect(this, this.onVehicleData);
        }
    }

    onVehicleData(data) {
        if (data && data.engine) {
            this.rpm = data.engine.rpm || 0;
            this.update();
        }
    }

    onInputAction(action) {
        // Handle input actions if needed
    }

    update() {
        this.updateNeedle();
        this.updateRPMDisplay();
    }

    updateNeedle() {
        // Calculate rotation based on RPM (0-270 degrees typically for tachometers)
        const maxRotation = 270;
        const rotation = (this.rpm / this.maxRPM) * maxRotation;
        
        // Find needle element in SVG and rotate it
        const needle = document.querySelector('[data-needle]');
        if (needle) {
            needle.style.transform = `rotate(${rotation}deg)`;
        }
    }

    updateRPMDisplay() {
        // Update RPM text display if present
        const display = document.querySelector('[data-rpm-display]');
        if (display) {
            display.textContent = Math.round(this.rpm);
        }
    }

    setMaxRPM(maxRPM) {
        this.maxRPM = maxRPM;
    }
}

// Initialize tachometer when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tachometer = new Tachometer();
});
