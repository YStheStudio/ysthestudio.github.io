const card = document.getElementById('flip-card');

let isDragging = false;
let startX = 0;
let lastDeltaX = 0;
let currentRotationY = 0; // The actual accumulated rotation
let isFlipped = false;
let velocity = 0;
let lastTimestamp = 0;
let isAnimating = false; // Track CSS transition state

// Store the base transformation components for the floating effect
let currentTiltX = 0;

// Variables for smooth shine interpolation
let animRy = 0;
let animRx = 0;

card.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    lastDeltaX = 0;
    lastTimestamp = performance.now();
    velocity = 0;


    card.classList.remove('is-animating');
    card.classList.remove('is-resting-back');
    card.classList.add('is-dragging');
    card.setPointerCapture(e.pointerId);
});

card.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const now = performance.now();
    const dt = now - lastTimestamp;

    if (dt > 0) {
        velocity = (deltaX - lastDeltaX) / dt;
    }

    lastTimestamp = now;
    lastDeltaX = deltaX;

    // Use Math.tanh for fluid rubber-banding that asymptotically approaches 135 degrees
    const maxRotation = 135;
    const sensitivity = 0.004;
    const rotationOffset = maxRotation * Math.tanh(deltaX * sensitivity);
    const dragRotY = currentRotationY + rotationOffset;

    // Dynamic tilt based on mouse Y clamped to a max of 15 degrees
    const rect = card.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const rawTiltRatio = (e.clientY - centerY) / (rect.height / 2);
    currentTiltX = Math.max(-15, Math.min(15, rawTiltRatio * -15));

    card.style.transform = `rotateX(${currentTiltX}deg) rotateY(${dragRotY}deg)`;
    card.style.setProperty('--ry', dragRotY);
    card.style.setProperty('--rx', currentTiltX);

    animRy = dragRotY;
    animRx = currentTiltX;
});

const handlePointerEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    isAnimating = true;

    card.classList.remove('is-dragging');
    card.classList.add('is-animating');

    try {
        card.releasePointerCapture(e.pointerId);
    } catch (err) { }

    const projectedRotation = currentRotationY + (lastDeltaX * 0.5) + (velocity * 150);
    const rotationDiff = projectedRotation - currentRotationY;

    // Snap to at most ONE flip (180 degrees) from the starting rotation
    let snappedRotation = currentRotationY;
    if (rotationDiff > 90) {
        snappedRotation += 180;
    } else if (rotationDiff < -90) {
        snappedRotation -= 180;
    }

    currentRotationY = snappedRotation;
    isFlipped = (snappedRotation / 180) % 2 !== 0;
    currentTiltX = 0; // Reset tilt on release

    card.style.transform = `rotateX(0deg) rotateY(${currentRotationY}deg)`;
    card.style.setProperty('--ry', currentRotationY);
    card.style.setProperty('--rx', 0);
};

card.addEventListener('pointerup', handlePointerEnd);
card.addEventListener('pointercancel', handlePointerEnd);

card.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') {
        isAnimating = false;
        card.classList.remove('is-animating');

        // If flipped to the back and resting, show the copy UI
        if (isFlipped) {
            card.classList.add('is-resting-back');
        } else {
            card.classList.remove('is-resting-back');
        }
    }
});


// Smooth Parallax Animation Loop
// Interpolates the SVG shine and CSS gradients so they smoothly glide back
// to their resting positions when the card is released.
function animationLoop() {
    if (!isDragging && isAnimating) {
        // Lerp towards the snapped resting position (currentRotationY and 0 tilt)
        // The factor 0.08 loosely approximates the cubic bezier speed curve
        animRy += (currentRotationY - animRy) * 0.08;
        animRx += (0 - animRx) * 0.08;
    }

    // Apply visual updates to gradients
    const dx = animRy / 100;
    const dy = animRx / 100;
    const siliconHolo = document.getElementById('siliconHolo');
    const goldDieHolo = document.getElementById('goldDieHolo');
    const purpleDieHolo = document.getElementById('purpleDieHolo');

    if (siliconHolo) siliconHolo.setAttribute('gradientTransform', `translate(${dx}, ${dy})`);
    if (goldDieHolo) goldDieHolo.setAttribute('gradientTransform', `translate(${dx}, ${dy})`);
    if (purpleDieHolo) purpleDieHolo.setAttribute('gradientTransform', `translate(${dx}, ${dy})`);

    const rawOffset = (animRy * -0.2) + (animRx * -0.4);
    card.style.setProperty('--shine-offset', `${rawOffset % 100}%`);
    card.style.setProperty('--anim-ry', animRy);
    card.style.setProperty('--anim-rx', animRx);

    requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

// Parse URL parameters for custom text inside the stripe
const urlParams = new URLSearchParams(window.location.search);
const customText = urlParams.get('v');
const stripeText = document.getElementById('stripe-text');
if (stripeText && customText) {
    stripeText.textContent = customText;
}

// Early Supporter Variant
const isEarlySupporter = urlParams.get('e') === 'true';
const customName = urlParams.get('n');
const cardholder = document.querySelector('.cardholder');
const signatureName = document.getElementById('signature-name');
const sealIcon = document.getElementById('card-seal-icon');
const backHoloIcon = document.getElementById('back-holo-sticker');

let licenseType = 'STANDARD LICENSE';

if (isEarlySupporter) {
    card.classList.add('early-supporter-active');
    licenseType = 'EARLY SUPPORTER LICENSE';
    if (sealIcon) sealIcon.src = '../../Resources/custom.crown.seal.fill.png';
    if (backHoloIcon) {
        backHoloIcon.style.webkitMaskImage = "url('../../Resources/custom.crown.seal.fill.png')";
        backHoloIcon.style.maskImage = "url('../../Resources/custom.crown.seal.fill.png')";
    }
}

// Development Team Variant
if (customName && customName.toLowerCase() === 'yusuke_saeki') {
    card.classList.add('dev-team-active');
    licenseType = 'DEVELOPMENT TEAM LICENSE';
    if (sealIcon) sealIcon.src = '../../Resources/custom.hammer.seal.fill.png';
    if (backHoloIcon) {
        backHoloIcon.style.webkitMaskImage = "url('../../Resources/custom.hammer.seal.fill.png')";
        backHoloIcon.style.maskImage = "url('../../Resources/custom.hammer.seal.fill.png')";
    }
}

// Set License Type Text
if (cardholder) {
    cardholder.textContent = licenseType;
}

// Apply custom name to the signature panel on the back if provided
if (signatureName && customName) {
    const formattedName = customName.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    signatureName.textContent = formattedName;
}

// Custom Date Format logic
const customDate = urlParams.get('d');
const validDateEl = document.querySelector('.valid-date');
const memberSinceDateEl = document.getElementById('member-since-date');

if (customDate) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Parse new format: MMDDHHMMSSYYYY or MDDHHMMSSYYYY (e.g. 4101230592026 -> APR 10 12:30:59 PDT 2026)
    if (customDate.length === 13 || customDate.length === 14) {
        const year = parseInt(customDate.slice(-4), 10);
        const seconds = parseInt(customDate.slice(-6, -4), 10);
        const minutes = parseInt(customDate.slice(-8, -6), 10);
        const hours = parseInt(customDate.slice(-10, -8), 10);
        const day = parseInt(customDate.slice(-12, -10), 10);
        const monthNum = parseInt(customDate.slice(0, -12), 10);

        if (monthNum >= 1 && monthNum <= 12) {
            const memberSinceStr = `${months[monthNum - 1]} ${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} PDT ${year}`;

            if (memberSinceDateEl) {
                memberSinceDateEl.style.fontSize = '1rem';
                memberSinceDateEl.style.letterSpacing = '0.5px';
                memberSinceDateEl.textContent = memberSinceStr;
            }

            if (validDateEl) {
                // Calculate Valid Thru as exactly 28 days after Member Since
                const dateObj = new Date(year, monthNum - 1, day, hours, minutes, seconds);
                dateObj.setDate(dateObj.getDate() + 28);

                const vYear = dateObj.getFullYear();
                const vMonth = months[dateObj.getMonth()];
                const vDay = dateObj.getDate().toString().padStart(2, '0');
                const vHours = dateObj.getHours().toString().padStart(2, '0');
                const vMinutes = dateObj.getMinutes().toString().padStart(2, '0');
                const vSeconds = dateObj.getSeconds().toString().padStart(2, '0');

                validDateEl.style.fontSize = '0.65rem';
                validDateEl.style.letterSpacing = '0.3px';
                validDateEl.textContent = `${vMonth} ${vDay} ${vHours}:${vMinutes}:${vSeconds} PDT ${vYear}`;
            }
        }
    }
    // Fallback to legacy format: MMYY or MYY
    else if (customDate.length >= 3 && validDateEl) {
        const monthNum = parseInt(customDate.slice(0, -2), 10);
        const yearStr = customDate.slice(-2);

        if (monthNum >= 1 && monthNum <= 12) {
            validDateEl.textContent = `${months[monthNum - 1]} ${yearStr}`;
        }
    }
}

// Custom CVV logic
const customCvv = urlParams.get('c');
const cvvEl = document.querySelector('.cvv');
if (cvvEl && customCvv) {
    cvvEl.textContent = customCvv;
}

// Peel-off Seal logic
const sealContainer = document.getElementById('seal-container');
if (sealContainer) {
    let isPeeling = false;
    let peelStartX = 0;
    let peelStartY = 0;
    let peelDirection = null;
    let currentPeelAmount = 0;
    const PEEL_THRESHOLD = 0.65; // 65% to fully peel

    sealContainer.addEventListener('pointerdown', (e) => {
        if (sealContainer.classList.contains('is-peeled')) return;

        // Prevent card from rotating when peeling
        e.stopPropagation();

        isPeeling = true;
        peelStartX = e.clientX;
        peelStartY = e.clientY;
        peelDirection = null;
        sealContainer.classList.add('is-dragging');
        sealContainer.setPointerCapture(e.pointerId);
    });

    sealContainer.addEventListener('pointermove', (e) => {
        if (!isPeeling) return;
        e.stopPropagation();

        const deltaX = e.clientX - peelStartX;
        const deltaY = e.clientY - peelStartY;

        // Determine direction on first significant movement
        if (!peelDirection && Math.abs(deltaX) > 2) {
            peelDirection = deltaX > 0 ? 'right' : 'left';
            if (peelDirection === 'right') {
                sealContainer.classList.add('peel-from-left');
                sealContainer.classList.remove('peel-from-right');
            } else {
                sealContainer.classList.add('peel-from-right');
                sealContainer.classList.remove('peel-from-left');
            }
        }

        if (peelDirection) {
            // Prevent peeling in the opposite direction of the initial drag
            if (peelDirection === 'right' && deltaX < 0) return;
            if (peelDirection === 'left' && deltaX > 0) return;

            // Calculate absolute peel amount
            currentPeelAmount = Math.max(0, Math.abs(deltaX));

            // Limit to container width
            const maxWidth = sealContainer.offsetWidth;
            currentPeelAmount = Math.min(currentPeelAmount, maxWidth);

            // Calculate dynamic rotation limit (0 to 30 deg) over the first 20% of peeling
            const peelRatio = currentPeelAmount / maxWidth;
            const dynamicAngleLimit = Math.min(30, (peelRatio / 0.2) * 30);

            // Calculate peel angle based on vertical drag
            let angle = Math.atan2(deltaY, Math.max(10, Math.abs(deltaX))) * (180 / Math.PI);
            // Clamp the angle dynamically to build physical resistance initially
            angle = Math.max(-dynamicAngleLimit, Math.min(dynamicAngleLimit, angle));

            // Calculate horizontal skew offset for the clip-path cut line
            const containerHalfHeight = sealContainer.offsetHeight / 2;
            const skewOffset = containerHalfHeight * Math.tan(angle * Math.PI / 180);

            sealContainer.style.setProperty('--peel-amount', `${currentPeelAmount}px`);
            sealContainer.style.setProperty('--peel-angle', `${angle}deg`);
            sealContainer.style.setProperty('--peel-skew', `${skewOffset}px`);
        }
    });

    const endPeel = (e) => {
        if (!isPeeling) return;
        e.stopPropagation();
        isPeeling = false;
        sealContainer.releasePointerCapture(e.pointerId);
        sealContainer.classList.remove('is-dragging');

        const maxWidth = sealContainer.offsetWidth;

        if (currentPeelAmount > maxWidth * PEEL_THRESHOLD) {
            // Success! Peel fully off - fly straight to the edge of screen along its current angle
            sealContainer.classList.add('is-flying-off');
            sealContainer.style.setProperty('--locked-peel', `${currentPeelAmount}px`);
            sealContainer.style.setProperty('--peel-amount', '50vw'); // This makes seal-front vanish
            // Do not zero out peel-angle or skew!

            setTimeout(() => {
                sealContainer.classList.add('is-peeled');
                sealContainer.classList.remove('is-flying-off');
            }, 300);
        } else {
            // Snap back
            currentPeelAmount = 0;
            sealContainer.style.setProperty('--peel-amount', '0px');
            sealContainer.style.setProperty('--peel-angle', '0deg');
            sealContainer.style.setProperty('--peel-skew', '0px');
            setTimeout(() => {
                if (!isPeeling) {
                    sealContainer.classList.remove('peel-from-left', 'peel-from-right');
                }
            }, 300);
        }
    };

    sealContainer.addEventListener('pointerup', endPeel);
    sealContainer.addEventListener('pointercancel', endPeel);
}

// Copy button logic
const copyBtn = document.getElementById('copy-btn');
if (copyBtn && stripeText) {
    // Prevent pointerdown from bubbling up and starting a card drag
    copyBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(stripeText.textContent).then(() => {
            // Visual feedback - show checkmark
            const img = copyBtn.querySelector('img');
            const originalSrc = img.getAttribute('src');

            img.src = '../../Resources/checkmark.png';

            // Revert back after 1.5 seconds
            setTimeout(() => {
                if (img.getAttribute('src').includes('checkmark')) {
                    img.src = originalSrc;
                }
            }, 1500);
        });
    });
}

// Prevent link clicks from dragging the card
const redeemLink = document.getElementById('redeem-link');
if (redeemLink) {
    redeemLink.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });
}

// Procedural Dense Copper Trace Generator for PCBs
function generateDetailedTraces() {
    const svgs = document.querySelectorAll('.cpu-chip-svg');
    svgs.forEach((svg) => {
        // Find the rects that use the old trace patterns
        const traceRects = svg.querySelectorAll('rect[fill^="url(#traces"]');
        if (traceRects.length === 0) return;

        const traceRect = traceRects[0];
        // Hide the original simple repeated pattern
        traceRect.style.display = 'none';

        // Get the dimensions from the SVG viewBox
        const viewBox = svg.getAttribute('viewBox').split(' ');
        const width = parseFloat(viewBox[2]);
        const height = parseFloat(viewBox[3]);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('stroke', 'rgba(212,175,55,0.25)'); // Metallic copper/gold
        g.setAttribute('fill', 'none');

        // Main traces path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-width', '0.25');

        // Vias path (using round linecaps for zero-length lines to draw perfect circles)
        const vias = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        vias.setAttribute('stroke-width', '0.8');
        vias.setAttribute('stroke-linecap', 'round');

        let pathD = "";
        let viasD = "";

        // Generate traces dynamically. Density scales with chip area.
        const numTraces = Math.floor((width * height) / 30);

        for (let i = 0; i < numTraces; i++) {
            let x = Math.random() * width;
            let y = Math.random() * height;

            // Constrain start to padding
            x = Math.max(8, Math.min(width - 8, x));
            y = Math.max(8, Math.min(height - 8, y));

            pathD += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
            let currentX = x;
            let currentY = y;

            const segments = Math.floor(Math.random() * 4) + 2;
            for (let j = 0; j < segments; j++) {
                const dir = Math.floor(Math.random() * 8);
                const len = Math.random() * 12 + 3;

                let nx = currentX, ny = currentY;
                // Manhattan Routing (N, NE, E, SE, S, SW, W, NW)
                if (dir === 0) ny -= len;
                else if (dir === 1) { nx += len; ny -= len; }
                else if (dir === 2) nx += len;
                else if (dir === 3) { nx += len; ny += len; }
                else if (dir === 4) ny += len;
                else if (dir === 5) { nx -= len; ny += len; }
                else if (dir === 6) nx -= len;
                else if (dir === 7) { nx -= len; ny -= len; }

                // Keep inside padded bounds
                nx = Math.max(6, Math.min(width - 6, nx));
                ny = Math.max(6, Math.min(height - 6, ny));

                pathD += ` L ${nx.toFixed(1)} ${ny.toFixed(1)}`;
                currentX = nx;
                currentY = ny;
            }

            // Add a via at the end of the trace randomly
            if (Math.random() > 0.4) {
                viasD += `M ${currentX.toFixed(1)} ${currentY.toFixed(1)} h 0.01 `;
            }
        }

        path.setAttribute('d', pathD);
        if (viasD) {
            vias.setAttribute('d', viasD);
        }

        g.appendChild(path);
        g.appendChild(vias);

        // Insert right after the traceRect so it sits perfectly on the substrate, 
        // under the main die and components (painter's algorithm handles layering).
        traceRect.parentNode.insertBefore(g, traceRect.nextSibling);
    });
}

// Run the procedural generation
generateDetailedTraces();

function generateMagneticStripe() {
    const stripe = document.querySelector('.magnetic-stripe');
    if (!stripe) return;

    // PRNG algorithms
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
    }

    function mulberry32(a) {
        return function () {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    // Use ?v= text as seed, fallback to default if missing
    const seedString = customText || "LITHIOMETRY_DEFAULT";
    const seed = cyrb128(seedString);
    const seededRandom = mulberry32(seed);

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 48;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.opacity = '0.15';

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';

    // 3 magnetic tracks
    for (let row = 0; row < 3; row++) {
        let x = 0;
        const rowHeight = 10;
        const yOffset = row * 16 + 3;

        while (x < 1000) {
            const width = seededRandom() * 3 + 1;
            const gap = seededRandom() * 4 + 1;

            // Randomly draw bars to simulate encoded binary data density
            if (seededRandom() > 0.25) {
                ctx.globalAlpha = seededRandom() * 0.6 + 0.4;
                ctx.fillRect(x, yOffset, width, rowHeight);
            }

            x += width + gap;
        }
    }
    // Extract drawn data as a PNG mask
    const dataURL = canvas.toDataURL();

    const linesDiv = document.createElement('div');
    linesDiv.style.position = 'absolute';
    linesDiv.style.inset = '0';
    linesDiv.style.width = '100%';
    linesDiv.style.height = '100%';

    // Combine base faint white with a bright reflective glare sweep
    linesDiv.style.background = `
        linear-gradient(105deg, 
            transparent 20%, 
            rgba(255, 255, 255, 0.3) 25%, 
            rgba(255, 255, 255, 0.4) 30%, 
            transparent 50%
        ),
        rgba(255, 255, 255, 0.0)
    `;
    linesDiv.style.backgroundSize = '250% 250%, 100% 100%';
    // Sync the glare position exactly with the card's smooth animated tilt engine
    linesDiv.style.backgroundPosition = 'calc(50% + var(--anim-ry, 0) * -0.6%) calc(50% + var(--anim-rx, 0) * -2%), center';

    // Apply the generated procedural magnetic track as an alpha mask
    linesDiv.style.WebkitMaskImage = `url(${dataURL})`;
    linesDiv.style.WebkitMaskSize = '100% 100%';
    linesDiv.style.maskImage = `url(${dataURL})`;
    linesDiv.style.maskSize = '100% 100%';

    stripe.appendChild(linesDiv);
}

generateMagneticStripe();
