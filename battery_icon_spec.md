# Lithiometry Battery Icon Specification

Based on the native rendering logic in `BatteryIconRenderer.swift`, here is the exact translation of the drawing math into scalable CSS instructions for the web demo.

## 1. Dimensional Math (Grid Size: 27 x 22)
The native icon is drawn on a 27x22 canvas. The battery body is exactly 13pt high and vertically centered.
By using a CSS variable for the body height (`--h`), everything scales flawlessly.

*   **Body Rectangle:**
    *   Width: `23.5` (Scale: `calc(var(--h) * 23.5 / 13)`)
    *   Height: `13` (Scale: `var(--h)`)
    *   Corner Radius: `4.5` (Scale: `calc(var(--h) * 4.5 / 13)`)
*   **Fill Rectangle:**
    *   Width: Dynamic percentage of body width.
    *   *Constraint:* The swift code enforces a minimum 5% visual fill width if the percentage is > 0 but < 5%, ensuring a sliver is always visible.
*   **Gap & Tip (Positive Terminal):**
    *   The gap between the body and the tip is exactly `1` point.
    *   Tip Width: `1.5` (Scale: `calc(var(--h) * 1.5 / 13)`)
    *   Tip Height: `4` (Scale: `calc(var(--h) * 4 / 13)`)
    *   Tip Corner Radius: Fully rounded on the right (`0 2px 2px 0`).

## 2. Color Profiles & Opacity
The native app blends colors based on the current state and appearance. Assuming a dark mode or transparent menubar context:

*   **Normal (Unplugged):**
    *   Background: `rgba(255, 255, 255, 0.5)` (labelColor at 50% opacity).
    *   Fill: `white`.
    *   Text: Knockout (in CSS, easiest achieved by setting text color to match the menubar background).
*   **Plugged In / Charging:**
    *   Background: `rgba(255, 255, 255, 0.5)` blended 25% with black → roughly `rgba(191, 191, 191, 0.5)`.
    *   Fill: `#34C759` (macOS System Green).
    *   Text: `white`.
    *   Tip Color: Matches fill *only* if at 100% (otherwise it matches the body background).
*   **Low Power Mode:**
    *   Background: `rgba(255, 255, 255, 0.5)` blended 25% with white → roughly `rgba(255, 255, 255, 0.62)`.
    *   Fill: `#FFCC00` (macOS System Yellow).
    *   Text: `black`.
*   **Low Battery (<= 20%):**
    *   Background: Same as Plugged In (blended with black).
    *   Fill: `#FF3B30` (macOS System Red).
    *   Text: `white`.

## 3. Text & Icon Layout
*   **Font:** System font (`Inter` or `-apple-system`), Size: `11pt` (Scale: `calc(var(--h) * 11 / 13)`), Weight: `600` (SemiBold).
*   **Text Offset:**
    *   By default, text is horizontally centered inside the `23.5pt` body.
    *   If unplugged: Offset `X` by `-0.25pt`.
    *   If plugged in (and < 100%): Offset `X` by `+1.5pt` to make room for the bolt.
*   **Bolt Icon:**
    *   Width: `9pt`, Height: `10.5pt`.
    *   Drop Animation: When the bolt disappears in the native app, it drops downwards by `2pt` while fading out.

## 4. Animation Timing
The Swift renderer uses a specific mathematical curve: `y = 1.0 - (1.0 - t)^3`.
*   **CSS Easing Equivalent:** `cubic-bezier(0.33, 1, 0.68, 1)` (Perfect mathematical match for cubic ease-out).
*   **Durations:**
    *   Bolt appearance / drop (opacity & transform): `0.45s`
    *   Width, fill color, text translation: `0.3s`

---

## 5. Precise CSS Implementation
You can drop this directly into your `styles.css` to perfectly emulate the native app's renderer behavior.

```css
/* Base wrapper */
#demo-battery {
    --h: 50cqh; /* The base grid height from your container */
    --body-w: calc(var(--h) * 23.5 / 13);
    
    position: relative;
    width: calc(var(--h) * 27 / 13);
    height: calc(var(--h) * 22 / 13);
    display: flex;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* The 23.5x13 Body */
.battery-body {
    position: absolute;
    left: 0;
    width: var(--body-w);
    height: var(--h);
    border-radius: calc(var(--h) * 4.5 / 13);
    background: rgba(255, 255, 255, 0.5); /* Base Knockout background */
    overflow: hidden;
    transition: background-color 0.3s cubic-bezier(0.33, 1, 0.68, 1);
}

/* The Fill */
.battery-fill {
    height: 100%;
    background: white;
    width: 42%; /* Controlled via JS */
    min-width: 5%; /* Prevent total disappearance > 0 */
    transition: width 0.3s cubic-bezier(0.33, 1, 0.68, 1),
                background-color 0.3s cubic-bezier(0.33, 1, 0.68, 1);
}

/* The Tip (1pt gap, 1.5x4 tip) */
.battery-tip {
    position: absolute;
    left: calc(var(--body-w) + calc(var(--h) * 1 / 13));
    width: calc(var(--h) * 1.5 / 13);
    height: calc(var(--h) * 4 / 13);
    background: rgba(255, 255, 255, 0.5); /* Matches body background */
    border-radius: 0 calc(var(--h) * 2 / 13) calc(var(--h) * 2 / 13) 0;
    transition: background-color 0.3s cubic-bezier(0.33, 1, 0.68, 1);
}

/* Text Layer */
.battery-text {
    position: absolute;
    left: 0;
    width: var(--body-w);
    text-align: center;
    font-size: calc(var(--h) * 11 / 13);
    font-weight: 600;
    line-height: var(--h);
    
    /* Native Knockout Approximation (Set to your menubar bg color) */
    color: transparent; 
    /* Use text-shadow to fake the color if needed, or set exact hex */
    
    transform: translateX(calc(var(--h) * -0.25 / 13)); /* Unplugged offset */
    transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1),
                color 0.3s cubic-bezier(0.33, 1, 0.68, 1);
    z-index: 2;
}

/* Bolt Icon */
.battery-bolt {
    position: absolute;
    /* Aligned right of text center, accounting for swift boltX offset */
    left: calc(50% + calc(var(--h) * 2.5 / 13)); 
    width: calc(var(--h) * 9 / 13);
    height: calc(var(--h) * 10.5 / 13);
    color: white;
    opacity: 0;
    /* Native 2pt drop animation when disappearing */
    transform: translateY(calc(var(--h) * 2 / 13));
    transition: opacity 0.45s cubic-bezier(0.33, 1, 0.68, 1), 
                transform 0.45s cubic-bezier(0.33, 1, 0.68, 1);
    z-index: 3;
}

/* --- STATE: Plugged In --- */
#demo-battery.plugged-in .battery-body {
    /* Blended 25% with black */
    background: rgba(191, 191, 191, 0.5); 
}

#demo-battery.plugged-in .battery-fill {
    width: 100%; 
    background: #34c759; /* System Green */
}

#demo-battery.plugged-in .battery-text {
    color: white;
    transform: translateX(calc(var(--h) * 1.5 / 13)); /* Plugged in offset */
}

#demo-battery.plugged-in .battery-bolt {
    opacity: 1;
    transform: translateY(0); /* Rises up to center */
}
```
