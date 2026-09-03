// SNIPPETS.JS - Reusable HTML patterns matching master template exactly

const SNIPPETS = {
  container: (content) => `<div style="display:grid; gap:14px;">${content}</div>`,

  // Shared Grid Template for perfect alignment
  // Columns: Asset (Grow) | Qty (Fixed) | Value (Fixed) | Action (Fixed)
  gridTemplate: 'minmax(200px, 1.5fr) 120px 120px 50px',

  tableHeader: (col1, col2, col3, col4) => `
    <div style="display:grid; grid-template-columns: minmax(200px, 1.5fr) 120px 120px 50px; gap:12px; align-items: center; color:var(--muted); font-size:11px; font-weight: 600; letter-spacing: 0.5px; padding: 0 12px;">
      <div style="text-transform: uppercase;">${col1}</div>
      <div style="text-align:right; text-transform: uppercase;">${col2}</div>
      <div style="text-align:right; text-transform: uppercase;">${col3}</div>
      <div style="text-align:center; text-transform: uppercase;">${col4 || ''}</div>
    </div>
  `,

  // Wallet Row (3 columns + badge + optional optional Add)
  row: (label, quantity, value, isDefault, onSetDefault, onAdd) => {
    const badgeOrButton = isDefault
      ? '<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">DEFAULT</span>'
      : `<button onclick="${onSetDefault}" style="font-size: 9px; padding: 3px 8px; border-radius: 4px; background: transparent; color: var(--muted); border: 1px solid rgba(159, 176, 192, 0.3); cursor: pointer; font-weight: 600;">Set Default</button>`;

    const bgColor = isDefault ? 'rgba(103,232,249,.08)' : 'rgba(103,232,249,.03)';
    const borderColor = isDefault ? 'rgba(103,232,249,.25)' : 'rgba(103,232,249,.10)';

    const actionColumn = onAdd ? `
        <div style="display: flex; justify-content: center;">
             <button class="mini-pill" style="justify-content: center; width: 32px; height: 32px; padding: 0; cursor: pointer; border-color: var(--accent); background: rgba(103, 232, 249, 0.1);" 
                onclick="${onAdd}" title="Add ${label}">
                <span style="font-size: 16px; font-weight: 700; color: var(--accent);">+</span>
            </button>
        </div>` : `<div><!-- Spacer --></div>`;

    return `
      <div style="display:grid; grid-template-columns: minmax(200px, 1.5fr) 120px 120px 50px; gap:12px; align-items: center; padding: 12px; background: ${bgColor}; border-radius: 12px; border: 1px solid ${borderColor}; cursor: pointer;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight:900; color:var(--text); font-size: 14px;">${label}</span>
            ${badgeOrButton}
          </div>
        </div>
        <div style="text-align:right; font-weight:900; font-size: 14px;">${quantity}</div>
        <div style="text-align:right; font-weight:900; font-size: 14px;">${value}</div>
        ${actionColumn}
      </div>
    `;
  },

  // Investment Row (3 columns + Add Button) - Matches Wallet Row Style Exactly
  investmentRow: (label, quantity, value, onAdd) => {
    // Reuse standardized card styles
    const bgColor = 'rgba(103,232,249,.03)';
    const borderColor = 'rgba(103,232,249,.10)';

    return `
      <div style="display:grid; grid-template-columns: minmax(200px, 1.5fr) 120px 120px 50px; gap:12px; align-items: center; padding: 12px; background: ${bgColor}; border-radius: 12px; border: 1px solid ${borderColor};">
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-weight:900; color:var(--text); font-size: 14px;">${label}</span>
        </div>
        <div style="text-align:right; font-weight:900; font-size: 14px;">${quantity}</div>
        <div style="text-align:right; font-weight:900; font-size: 14px;">${value}</div>
        <div style="display: flex; justify-content: center;">
             <button class="mini-pill" style="justify-content: center; width: 32px; height: 32px; padding: 0; cursor: pointer; border-color: var(--accent); background: rgba(103, 232, 249, 0.1);" 
                onclick="${onAdd}" title="Mint/Add ${label}">
                <span style="font-size: 16px; font-weight: 700; color: var(--accent);">+</span>
            </button>
        </div>
      </div>
    `;
  },

  // Standard Form Field with Label (Matches Master Template)
  formField: (label, inputId, placeholder, type = 'text', readOnly = false) => {
    const bg = readOnly ? 'transparent' : 'var(--input-bg)';
    const color = readOnly ? 'var(--muted)' : 'var(--text)';
    const border = '1px solid var(--input-border)';

    return `
        <div style="margin-bottom: 16px;">
            <label style="display: block; color: var(--muted); font-size: 12px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</label>
            <input type="${type}" id="${inputId}" placeholder="${placeholder}" ${readOnly ? 'readonly' : ''}
                style="width: 100%; font-size: 16px; font-weight: 600; padding: 12px; border-radius: 8px; border: ${border}; background: ${bg}; color: ${color}; outline: none;">
        </div>
      `;
  },

  totalSection: (label, value, currency) => `
    <div style="margin-top: 10px; padding: 14px 10px; border-radius: 12px; background: rgba(11,15,20,.25);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: var(--muted); font-size: 14px; font-weight: 800;">${label}</span>
        <span style="color: var(--text); font-size: 18px; font-weight: 900;">${value} ${currency}</span>
      </div>
    </div>
  `,

  hr: () => `<div style="height: 1px; background: rgba(34,48,68,.4); margin: 16px 0;"></div>`,

  buttonGroup: (buttons) => {
    return `
      <div style="display: grid; grid-template-columns: repeat(${buttons.length}, 1fr); gap: 12px; margin-top: 24px;">
        ${buttons.map(btn => `
          <button id="${btn.id}" class="${btn.style}" style="${btn.buttonStyle || ''}">${btn.label}</button>
        `).join('')}
      </div>
    `;
  }
};



