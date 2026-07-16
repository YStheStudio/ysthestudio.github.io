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
    } catch (err) {}
    
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

if (validDateEl && customDate && customDate.length >= 3) {
    const monthNum = parseInt(customDate.slice(0, -2), 10);
    const yearStr = customDate.slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    if (monthNum >= 1 && monthNum <= 12) {
        validDateEl.textContent = `${months[monthNum - 1]} ${yearStr}`;
    }
}

// Custom CVV logic
const customCvv = urlParams.get('c');
const cvvEl = document.querySelector('.cvv');
if (cvvEl && customCvv) {
    cvvEl.textContent = customCvv;
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
