// CONSTANTS.JS - Single source of truth for all fixed values
// NEVER change these values - they guarantee visual consistency

const LAYOUT = {
    // Main container
    GAP: '14px',                    // Space between elements

    // Column widths (table-style pages)
    COL1_WIDTH: '240px',           // First column (labels, names)
    COL2_WIDTH: '110px',           // Second column (quantities)
    COL3_WIDTH: '110px',           // Third column (values)

    // Padding & spacing
    ROW_PADDING: '12px',           // Padding inside rows
    BUTTON_PADDING: '16px',        // Button padding
    TOTAL_PADDING: '14px 10px',    // Total section padding
};

const COLORS = {
    // Row backgrounds
    SELECTED_BG: 'rgba(103,232,249,.08)',
    SELECTED_BORDER: 'rgba(103,232,249,.25)',
    DEFAULT_BG: 'rgba(103,232,249,.03)',
    DEFAULT_BORDER: 'rgba(103,232,249,.10)',

    // Total section
    TOTAL_BG: 'rgba(11,15,20,.25)',

    // Badge colors
    DEFAULT_BADGE_BG: 'rgba(34, 197, 94, 0.15)',
    DEFAULT_BADGE_COLOR: '#22c55e',

    // Button colors (defined in CSS, reference only)
    BUTTON_MUTED: 'rgba(159, 176, 192, 0.3)',
};

const TYPOGRAPHY = {
    // Headers
    HEADER_SIZE: '11px',
    HEADER_WEIGHT: '600',
    HEADER_SPACING: '0.5px',

    // Content
    CONTENT_SIZE: '14px',
    CONTENT_WEIGHT: '900',

    // Total
    TOTAL_LABEL_SIZE: '14px',
    TOTAL_VALUE_SIZE: '18px',
    TOTAL_LABEL_WEIGHT: '800',
    TOTAL_VALUE_WEIGHT: '900',

    // Badge
    BADGE_SIZE: '9px',
    BADGE_WEIGHT: '700',

    // Buttons
    BUTTON_SIZE: '16px',
    BUTTON_WEIGHT: '900',
};

// Export for use in other modules
window.LAYOUT = LAYOUT;
window.COLORS = COLORS;
window.TYPOGRAPHY = TYPOGRAPHY;



