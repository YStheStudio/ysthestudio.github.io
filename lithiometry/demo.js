document.addEventListener('DOMContentLoaded', () => {
    const keyboard = document.getElementById('demo-keyboard');
    const magsafe = document.getElementById('demo-magsafe');

    if (!keyboard || !magsafe) return;

    // Extend the cable infinitely to the left
    const magsafeBaseImg = magsafe.querySelector('.magsafe-base');
    const magsafeChargingImg = magsafe.querySelector('.magsafe-charging');

    function createCablePattern(img, className) {
        if (!img) return;
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
            extDiv.className = `magsafe-cable-ext ${className}`;
            extDiv.style.backgroundImage = `url(${canvas.toDataURL()})`;
            
            magsafe.prepend(extDiv);
        };
        
        if (img.complete && img.naturalWidth > 0) {
            generate();
        } else {
            img.addEventListener('load', generate);
        }
    }

    createCablePattern(magsafeBaseImg, 'base-ext');
    createCablePattern(magsafeChargingImg, 'charging-ext');

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
        const snapThreshold = 10; // Magnetic pull distance

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

    magsafe.addEventListener('pointerup', (e) => {
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
        const snapThreshold = 10;

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

        magsafe.releasePointerCapture(e.pointerId);
    });

    function setPluggedIn(plugged) {
        if (isPluggedIn === plugged) return;
        isPluggedIn = plugged;
        const battery = document.getElementById('demo-battery');
        const batteryText = battery.querySelector('.battery-text');

        if (plugged) {
            battery.classList.add('plugged-in');
            magsafe.classList.add('plugged-in');
            // Animate text from 42 to 100 quickly
            animateValue(batteryText, 42, 100, 400);
        } else {
            battery.classList.remove('plugged-in');
            magsafe.classList.remove('plugged-in');
            // Reset text immediately
            batteryText.innerText = '42';
        }
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerText = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerText = end;
            }
        };
        window.requestAnimationFrame(step);
    }
});
