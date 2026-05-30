// BeamUI Tachometer Controller
// Connects to BeamNG vehicle data and animates tachometer needle
// Includes indicator lights and multifunction display

class Tachometer {
    constructor() {
        this.rpm = 0;
        this.maxRPM = 8000;
        this.speed = 0;
        this.gear = 'N';
        this.fuel = 100;
        this.engineTemp = 0;
        this.oilPressure = 0;
        this.batteryVoltage = 14;
        
        this.needleGroup = null;
        this.indicatorLights = {};
        this.mfdLines = {};
        this.lastRPM = 0;
        this.initialized = false;
        this.animationFrameId = null;
        
        this.init();
    }

    init() {
        // Get SVG elements
        this.needleGroup = document.getElementById('needle-group');

        // Get indicator light elements
        this.indicatorLights = {
            oil: document.getElementById('light-oil'),
            temp: document.getElementById('light-temp'),
            battery: document.getElementById('light-battery'),
            check: document.getElementById('light-check')
        };

        // Get MFD display lines
        this.mfdLines = {
            line1: document.getElementById('mfd-line1'),
            line2: document.getElementById('mfd-line2'),
            line3: document.getElementById('mfd-line3')
        };

        // Ensure needle group has proper transform origin
        if (this.needleGroup) {
            this.needleGroup.style.transformOrigin = '125px 110px';
            this.needleGroup.style.transform = 'rotate(0deg)';
        }

        // Wait for BeamNG API to be available
        if (typeof be !== 'undefined' && be.ui) {
            this.setupBeamNGCallbacks();
            this.initialized = true;
            console.log('[Tachometer] BeamNG API initialized');
        } else {
            setTimeout(() => this.init(), 500);
        }
    }

    setupBeamNGCallbacks() {
        try {
            if (be.ui.onVehicleData) {
                be.ui.onVehicleData.connect(this, this.onVehicleData.bind(this));
            }
            
            if (be.ui.vehicleStateBus) {
                be.ui.vehicleStateBus.subscribe('engine', this.onEngineData.bind(this));
                be.ui.vehicleStateBus.subscribe('transmission', this.onTransmissionData.bind(this));
                be.ui.vehicleStateBus.subscribe('fuel', this.onFuelData.bind(this));
            }
        } catch (e) {
            console.error('[Tachometer] Error setting up BeamNG callbacks:', e);
        }
    }

    onVehicleData(data) {
        if (!data) return;

        // Engine data
        if (data.engine) {
            const newRPM = data.engine.rpm || 0;
            const newMaxRPM = data.engine.maxRpm || 8000;
            this.engineTemp = data.engine.engineTemp || 0;
            this.oilPressure = data.engine.oilPressure || 0;
            
            if (newMaxRPM !== this.maxRPM) {
                this.maxRPM = Math.max(1, newMaxRPM);
            }
            
            if (newRPM !== this.lastRPM) {
                this.setRPM(newRPM);
            }
        }

        // Transmission/Drivetrain data
        if (data.drivetrain) {
            const gearIdx = data.drivetrain.gear || 0;
            this.updateGear(gearIdx);
        }

        // Speed data
        if (data.dynamics) {
            this.speed = Math.abs(data.dynamics.vel || 0) * 3.6; // Convert m/s to km/h
        }

        // Fuel data
        if (data.fuel) {
            this.fuel = (data.fuel.fuelCapacity > 0) ? (data.fuel.fuel / data.fuel.fuelCapacity) * 100 : 0;
        }

        // Battery data
        if (data.electrical) {
            this.batteryVoltage = data.electrical.batteryVoltage || 14;
        }
    }

    onEngineData(engineState) {
        if (engineState) {
            const rpm = engineState.rpm || 0;
            const maxRpm = engineState.maxRpm || this.maxRPM;
            this.engineTemp = engineState.engineTemp || 0;
            this.oilPressure = engineState.oilPressure || 0;
            
            if (maxRpm !== this.maxRPM) {
                this.maxRPM = Math.max(1, maxRpm);
            }
            
            if (rpm !== this.lastRPM) {
                this.setRPM(rpm);
            }
        }
    }

    onTransmissionData(transmissionState) {
        if (transmissionState) {
            const gearIdx = transmissionState.gear || 0;
            this.updateGear(gearIdx);
        }
    }

    onFuelData(fuelState) {
        if (fuelState) {
            const fuelCapacity = fuelState.fuelCapacity || 1;
            this.fuel = (fuelCapacity > 0) ? (fuelState.fuel / fuelCapacity) * 100 : 0;
        }
    }

    updateGear(gearIdx) {
        if (gearIdx === 0) {
            this.gear = 'N';
        } else if (gearIdx === -1) {
            this.gear = 'R';
        } else if (gearIdx > 0) {
            this.gear = String(gearIdx);
        }
    }

    setRPM(rpm) {
        this.rpm = Math.max(0, Math.min(rpm, this.maxRPM * 1.1));
        this.lastRPM = rpm;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(() => this.update());
    }

    update() {
        this.updateNeedle();
        this.updateIndicatorLights();
        this.updateMFDisplay();
    }

    updateNeedle() {
        if (!this.needleGroup) return;

        const maxRotation = 270;
        const startAngle = -135;
        const rpmRatio = this.rpm / this.maxRPM;
        const targetRotation = startAngle + (rpmRatio * maxRotation);
        
        this.needleGroup.style.transform = `rotate(${targetRotation}deg)`;
    }

    updateIndicatorLights() {
        // Oil pressure warning (typically < 0.5 bar)
        if (this.indicatorLights.oil) {
            const oilWarning = this.oilPressure < 0.5;
            this.setLightState(this.indicatorLights.oil, oilWarning);
        }

        // Temperature warning (typically > 110°C)
        if (this.indicatorLights.temp) {
            const tempWarning = this.engineTemp > 110;
            this.setLightState(this.indicatorLights.temp, tempWarning);
        }

        // Battery warning (typically < 12V or > 15V)
        if (this.indicatorLights.battery) {
            const batteryWarning = this.batteryVoltage < 12 || this.batteryVoltage > 15;
            this.setLightState(this.indicatorLights.battery, batteryWarning);
        }

        // Check engine light (placeholder - would be connected to fault codes)
        if (this.indicatorLights.check) {
            this.setLightState(this.indicatorLights.check, false);
        }
    }

    setLightState(lightElement, isActive) {
        if (!lightElement) return;
        
        if (isActive) {
            lightElement.setAttribute('fill-opacity', '0.8');
            lightElement.style.filter = 'drop-shadow(0 0 4px currentColor)';
        } else {
            lightElement.setAttribute('fill-opacity', '0.2');
            lightElement.style.filter = 'drop-shadow(0 0 0px currentColor)';
        }
    }

    updateMFDisplay() {
        // Line 1: Gear indicator
        if (this.mfdLines.line1) {
            this.mfdLines.line1.textContent = `GEAR: ${this.gear}`;
        }

        // Line 2: Speed
        if (this.mfdLines.line2) {
            const speedStr = Math.round(this.speed).toString().padStart(3, ' ');
            this.mfdLines.line2.textContent = `SPD: ${speedStr} km/h`;
        }

        // Line 3: Fuel percentage
        if (this.mfdLines.line3) {
            const fuelStr = Math.round(this.fuel).toString().padStart(3, ' ');
            this.mfdLines.line3.textContent = `FUEL: ${fuelStr}%`;
        }
    }

    // Debug method to test animation without BeamNG
    testAnimation() {
        console.log('[Tachometer] Testing animation...');
        let testRPM = 0;
        const increment = this.maxRPM / 100;
        let testSpeed = 0;
        let speedDir = 1;
        
        const testInterval = setInterval(() => {
            testRPM += increment;
            if (testRPM > this.maxRPM) {
                testRPM = 0;
            }
            
            // Simulate speed changes
            testSpeed += speedDir * 5;
            if (testSpeed > 200 || testSpeed < 0) {
                speedDir *= -1;
            }
            
            this.setRPM(testRPM);
            this.speed = testSpeed;
            this.fuel = 50 + Math.sin(testRPM / this.maxRPM * Math.PI) * 40;
            this.updateMFDisplay();
            
            console.log(`[Tachometer] Test - RPM: ${Math.round(testRPM)}, Speed: ${Math.round(testSpeed)} km/h`);
        }, 50);
        
        // Stop after 10 seconds
        setTimeout(() => clearInterval(testInterval), 10000);
    }
}

// Initialize tachometer when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Tachometer] DOM loaded, initializing...');
    window.tachometer = new Tachometer();
    
    // Uncomment to test without BeamNG:
    // setTimeout(() => window.tachometer.testAnimation(), 1000);
});

// Handle window unload
window.addEventListener('beforeunload', () => {
    if (window.tachometer && window.tachometer.animationFrameId) {
        cancelAnimationFrame(window.tachometer.animationFrameId);
    }
});
