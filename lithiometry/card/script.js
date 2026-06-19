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
    
    card.style.transform = `rotateY(${dragRotY}deg) rotateX(${currentTiltX}deg)`;
    card.style.setProperty('--ry', dragRotY);
    card.style.setProperty('--rx', currentTiltX);
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
    
    card.style.transform = `rotateY(${currentRotationY}deg) rotateX(0deg)`;
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



// Parse URL parameters for custom text inside the stripe
const urlParams = new URLSearchParams(window.location.search);
const customText = urlParams.get('v');
const stripeText = document.getElementById('stripe-text');
if (stripeText && customText) {
    stripeText.textContent = customText;
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
