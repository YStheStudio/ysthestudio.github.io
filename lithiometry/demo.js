document.addEventListener('DOMContentLoaded', () => {
    const keyboard = document.getElementById('demo-keyboard');
    const magsafe = document.getElementById('demo-magsafe');

    if (!keyboard || !magsafe) return;

    // Extend the cable infinitely to the left
    const magsafeBaseImg = magsafe.querySelector('.magsafe-base');
    const magsafeChargingImg = magsafe.querySelector('.magsafe-charging');

    function createCablePattern(img, parent, className) {
        if (!img || !parent) return;
        const generate = () => {
            const canvas = document.createElement('canvas');
            // We only want the left half of the image
            const w = img.naturalWidth / 2;
            const h = img.naturalHeight;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);

            const extDiv = document.createElement('div');
            extDiv.className = `cable-ext ${className}`;
            extDiv.style.backgroundImage = `url(${canvas.toDataURL()})`;

            parent.prepend(extDiv);
        };

        if (img.complete && img.naturalWidth > 0) {
            generate();
        } else {
            img.addEventListener('load', generate);
        }
    }

    createCablePattern(magsafeBaseImg, magsafe, 'base-ext');
    createCablePattern(magsafeChargingImg, magsafe, 'charging-ext');

    // Also extend the USB-C cable
    const usbcContainer = document.getElementById('demo-usbc');
    if (usbcContainer) {
        const usbcBaseImg = usbcContainer.querySelector('.usbc-base');
        createCablePattern(usbcBaseImg, usbcContainer, 'base-ext');
    }

    let isDragging = false;
    let startX = 0;
    let currentTranslateX = 0;
    let baseTranslateX = 0;
    let isPluggedIn = false;

    let initialMagsafeTipX = 0;
    let portX = 0;

    // We only want horizontal dragging
    magsafe.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        magsafe.classList.add('dragging');
        magsafe.classList.remove('animating');

        const magsafeRect = magsafe.getBoundingClientRect();
        const keyboardRect = keyboard.getBoundingClientRect();

        initialMagsafeTipX = magsafeRect.right - baseTranslateX;
        portX = keyboardRect.left;

        magsafe.setPointerCapture(e.pointerId);
    });

    magsafe.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        let intendedTranslateX = baseTranslateX + dx;

        // Prevent dragging too far left
        if (intendedTranslateX < -50) {
            intendedTranslateX = -50;
        }

        let snapTranslateX = portX + 6 - initialMagsafeTipX;

        // Prevent dragging too far right (into the keyboard)
        if (intendedTranslateX > snapTranslateX) {
            intendedTranslateX = snapTranslateX;
        }

        const intendedTipX = initialMagsafeTipX + intendedTranslateX;
        const distance = Math.abs(portX - intendedTipX);
        const snapThreshold = window.innerWidth <= 768 ? 30 : 15; // Larger snap zone for touch screens

        if (distance < snapThreshold && intendedTipX < portX + 40) {
            // Magnetically snap!
            magsafe.style.transform = `translateY(-50%) translateX(${snapTranslateX}px)`;
            if (!isPluggedIn) setPluggedIn(true);
        } else {
            // Follow mouse
            magsafe.style.transform = `translateY(-50%) translateX(${intendedTranslateX}px)`;
            if (isPluggedIn) setPluggedIn(false);
        }
    });

    const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        magsafe.classList.remove('dragging');
        magsafe.classList.add('animating');

        const dx = e.clientX - startX;
        let intendedTranslateX = baseTranslateX + dx;

        let snapTranslateX = portX + 5 - initialMagsafeTipX;

        if (intendedTranslateX > snapTranslateX) {
            intendedTranslateX = snapTranslateX;
        }

        const intendedTipX = initialMagsafeTipX + intendedTranslateX;
        const distance = Math.abs(portX - intendedTipX);
        const snapThreshold = window.innerWidth <= 768 ? 30 : 15; // Larger snap zone for touch screens

        if (distance < snapThreshold && intendedTipX < portX + 40) {
            // Keep it snapped
            baseTranslateX = snapTranslateX;
            magsafe.style.transform = `translateY(-50%) translateX(${baseTranslateX}px)`;
            setPluggedIn(true);
        } else {
            // Snap back to start
            baseTranslateX = 0;
            magsafe.style.transform = `translateY(-50%) translateX(0px)`;
            setPluggedIn(false);
        }

        if (e.pointerId) {
            magsafe.releasePointerCapture(e.pointerId);
        }
    };

    magsafe.addEventListener('pointerup', endDrag);
    magsafe.addEventListener('pointercancel', endDrag);

    function setPluggedIn(plugged) {
        if (isPluggedIn === plugged) return;
        isPluggedIn = plugged;
        const battery = document.getElementById('demo-battery');

        if (plugged) {
            battery.classList.add('plugged-in');
            magsafe.classList.add('plugged-in');

            // Auto-retract USB-C fail-safe if user plugs in MagSafe
            if (isUsbcPlugged) {
                isUsbcPlugged = false;
                const usbc = document.getElementById('demo-usbc');
                const container = document.getElementById('interactive-demo');
                if (usbc && container) {
                    const currentTransform = usbc.style.transform;
                    usbc.style.transition = 'none';
                    usbc.style.transform = 'translateY(-50%) translateX(0px)';
                    const baseRight = usbc.getBoundingClientRect().right;
                    const standbyX = container.getBoundingClientRect().left - baseRight;
                    
                    usbc.style.transform = currentTransform;
                    usbc.getBoundingClientRect(); // force layout reflow
                    
                    usbc.style.transition = 'transform 0.3s ease-out';
                    usbc.style.transform = `translateY(-50%) translateX(${standbyX}px)`;
                }
            }
        } else {
            battery.classList.remove('plugged-in');
            magsafe.classList.remove('plugged-in');
        }
    }

    let batteryLevel = 100;
    let lastBatteryTime = performance.now();
    let isUsbcPlugged = false;

    function updateBattery(timestamp) {
        if (!lastBatteryTime) lastBatteryTime = timestamp;
        const delta = timestamp - lastBatteryTime;
        lastBatteryTime = timestamp;

        const battery = document.getElementById('demo-battery');
        const isLowPower = battery && battery.classList.contains('low-power');
        const isHighPower = battery && battery.classList.contains('high-power');

        if (isPluggedIn) {
            batteryLevel += (25 * delta) / 1000; // Charge at 25% per second
            if (batteryLevel > 100) batteryLevel = 100;
        } else if (!isUsbcPlugged) {
            let drainRate = 3;
            if (isLowPower) drainRate = 1.5;
            if (isHighPower) drainRate = 6;

            batteryLevel -= (drainRate * delta) / 1000;

            // Trigger USB-C fail-safe
            if (batteryLevel <= 1) {
                batteryLevel = 1;
                isUsbcPlugged = true;
                const battery = document.getElementById('demo-battery');
                if (battery) battery.classList.add('plugged-in');

                const usbc = document.getElementById('demo-usbc');
                const keyboard = document.getElementById('demo-keyboard');
                const container = document.getElementById('interactive-demo');
                if (usbc && keyboard && container) {
                    usbc.style.transition = 'none';
                    usbc.style.transform = 'translateY(-50%) translateX(0px)';
                    const baseRight = usbc.getBoundingClientRect().right;
                    const portX = keyboard.getBoundingClientRect().left;
                    const targetX = portX + 24 - baseRight;
                    const standbyX = container.getBoundingClientRect().left - baseRight;

                    usbc.style.transform = `translateY(-50%) translateX(${standbyX}px)`;
                    usbc.getBoundingClientRect(); // force reflow

                    usbc.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                    usbc.style.transform = `translateY(-50%) translateX(${targetX}px)`;
                }
            }
        }

        const batteryFill = document.querySelector('.battery-fill');
        const batteryText = document.querySelector('.battery-text');

        if (battery && batteryFill && batteryText) {
            const currentLevel = Math.floor(batteryLevel);
            batteryFill.style.width = `${batteryLevel}%`;
            batteryText.innerText = currentLevel;

            // Handle the narrower '1' glyph spacing
            if (String(currentLevel).endsWith('1')) {
                battery.classList.add('ends-in-one');
            } else {
                battery.classList.remove('ends-in-one');
            }

            if (batteryLevel <= 21) {
                battery.classList.add('low-battery');
            } else {
                battery.classList.remove('low-battery');
            }

            const magsafeContainer = document.getElementById('demo-magsafe');

            if (batteryLevel >= 100) {
                battery.classList.add('full');
                if (magsafeContainer) magsafeContainer.classList.add('full-charge');
            } else {
                battery.classList.remove('full');
                if (magsafeContainer) magsafeContainer.classList.remove('full-charge');
            }

            if (batteryLevel < 10) {
                battery.classList.add('single-digit');
            } else {
                battery.classList.remove('single-digit');
            }
        }

        window.requestAnimationFrame(updateBattery);
    }

    window.requestAnimationFrame(updateBattery);

    function updateClock() {
        const clockEl = document.getElementById('demo-clock');
        if (!clockEl) return;

        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        clockEl.textContent = `${dayName} ${monthName} ${date} ${hours}:${minutes}`;
    }

    updateClock();
    setInterval(updateClock, 1000);

    // Control Center Menu Toggle
    const ccIcon = document.getElementById('demo-control-center');
    const ccMenu = document.getElementById('demo-cc-menu');
    const ccLowPower = document.getElementById('cc-low-power');
    const ccHighPower = document.getElementById('cc-high-power');

    if (ccIcon && ccMenu && ccLowPower && ccHighPower) {
        ccIcon.addEventListener('click', () => {
            ccMenu.classList.toggle('visible');
        });

        ccLowPower.addEventListener('click', () => {
            const battery = document.getElementById('demo-battery');
            if (!battery) return;

            const willBeActive = !ccLowPower.classList.contains('active');

            if (willBeActive) {
                ccLowPower.classList.add('active');
                battery.classList.add('low-power');

                ccHighPower.classList.remove('active');
                battery.classList.remove('high-power');
            } else {
                ccLowPower.classList.remove('active');
                battery.classList.remove('low-power');
            }
        });

        ccHighPower.addEventListener('click', () => {
            const battery = document.getElementById('demo-battery');
            if (!battery) return;

            const willBeActive = !ccHighPower.classList.contains('active');

            if (willBeActive) {
                ccHighPower.classList.add('active');
                battery.classList.add('high-power');

                ccLowPower.classList.remove('active');
                battery.classList.remove('low-power');
            } else {
                ccHighPower.classList.remove('active');
                battery.classList.remove('high-power');
            }
        });

        // Hide menu if clicked outside
        document.addEventListener('click', (e) => {
            if (!ccIcon.contains(e.target) && !ccMenu.contains(e.target)) {
                ccMenu.classList.remove('visible');
            }
        });
    }

    // Dynamically update both cable positions to handle screen resizing/rotation
    const updateCablePositions = () => {
        const usbc = document.getElementById('demo-usbc');
        const magsafe = document.getElementById('demo-magsafe');
        const container = document.getElementById('interactive-demo');
        const keyboard = document.getElementById('demo-keyboard');
        
        if (usbc && magsafe && container && keyboard) {
            const currentUsbcTransition = usbc.style.transition;
            const currentMagsafeTransition = magsafe.style.transition;
            
            usbc.style.transition = 'none';
            magsafe.style.transition = 'none';
            
            // Re-calculate USB-C metrics
            usbc.style.transform = 'translateY(-50%) translateX(0px)';
            const usbcBaseRight = usbc.getBoundingClientRect().right;
            const standbyX = container.getBoundingClientRect().left - usbcBaseRight;
            
            const currentPortX = keyboard.getBoundingClientRect().left;
            const targetUsbcX = currentPortX + 24 - usbcBaseRight;
            
            if (isUsbcPlugged) {
                usbc.style.transform = `translateY(-50%) translateX(${targetUsbcX}px)`;
            } else {
                usbc.style.transform = `translateY(-50%) translateX(${standbyX}px)`;
            }
            
            // Re-calculate MagSafe metrics
            if (isPluggedIn) {
                magsafe.style.transform = 'translateY(-50%) translateX(0px)';
                const newInitialMagsafeTipX = magsafe.getBoundingClientRect().right;
                const newSnapTranslateX = currentPortX + 5 - newInitialMagsafeTipX;
                
                // Update persistent drag state variables
                baseTranslateX = newSnapTranslateX;
                initialMagsafeTipX = newInitialMagsafeTipX;
                portX = currentPortX;
                
                magsafe.style.transform = `translateY(-50%) translateX(${baseTranslateX}px)`;
            } else if (!isDragging) {
                baseTranslateX = 0;
                magsafe.style.transform = 'translateY(-50%) translateX(0px)';
            }
            
            usbc.getBoundingClientRect(); // force layout calculation
            magsafe.getBoundingClientRect();
            
            usbc.style.transition = currentUsbcTransition;
            magsafe.style.transition = currentMagsafeTransition;
        }
    };
    
    updateCablePositions();
    window.addEventListener('resize', updateCablePositions);
});
