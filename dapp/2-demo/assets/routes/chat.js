'use strict';

// ------------------------------
// Chat Page
// ------------------------------

// Load contacts with chat enabled
function loadChatContacts() {
  try {
    const stored = localStorage.getItem('Stables_contacts');
    const allContacts = stored ? JSON.parse(stored) : [];
    return allContacts.filter(c => c.showInChat);
  } catch (error) {
    console.error('Failed to load chat contacts:', error);
    return [];
  }
}

// Placeholder: Load messages from Winiwa transactions
// In production, this would call MDS.cmd("coins") or MDS.cmd("history") 
// and parse state variables for message data
function loadMessagesFromTransactions() {
  // TODO: Implement with MDS
  // For now, return sample data
  return [
    {
      address: 'MxG0123...ABC',
      timestamp: Date.now() - 3600000,
      message: 'Thank you for your purchase! Use code SAVE10 for 10% off your next order.',
      amount: 15.50,
      txid: '0x123...'
    },
    {
      address: 'MxG0456...DEF',
      timestamp: Date.now() - 7200000,
      message: 'Your booking is confirmed. See you on 15th Jan!',
      amount: 250.00,
      txid: '0x456...'
    }
  ];
}

// Get contact by address
function getContactByAddress(address) {
  const contacts = loadChatContacts();
  return contacts.find(c => c.address === address);
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 hour - show minutes
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }

  // Less than 24 hours - show hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString();
}

// Render message thread
function renderMessages(messages, selectedContact = null) {
  // Filter by selected contact if any
  const filtered = selectedContact ?
    messages.filter(m => m.address === selectedContact) :
    messages;

  if (filtered.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
        <h3>No messages yet</h3>
        <div class="muted">Messages from transactions will appear here</div>
      </div>
   `;
  }

  return filtered.map(msg => {
    const contact = getContactByAddress(msg.address);
    const displayName = contact ? contact.displayName : 'Unknown Sender';
    const avatar = contact ? contact.avatar : '👤';

    return `
      <div class="card">
        <div style="display: flex; gap: 12px; align-items: start;">
          <div style="font-size: 32px; line-height: 1;">${avatar}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <strong>${displayName}</strong>
              <span class="muted" style="font-size: 11px;">${formatTimestamp(msg.timestamp)}</span>
            </div>
            <div class="muted" style="font-size: 11px; word-break: break-all; margin-bottom: 8px;">${msg.address}</div>
            <div style="margin: 12px 0; padding: 12px; background: rgba(103,232,249,.06); border-left: 3px solid var(--accent); border-radius: 8px;">
              ${msg.message}
            </div>
            <div style="display: flex; gap: 12px; font-size: 12px; color: var(--muted);">
              <span>💰 ${msg.amount.toFixed(2)} MINIMA</span>
              <span title="${msg.txid}">📝 TX: ${msg.txid.substring(0, 10)}...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Main render function
function renderChat(ctx) {
  const chatContacts = loadChatContacts();
  const messages = loadMessagesFromTransactions();

  const { $, app } = ctx;
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';

  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      ${chatContacts.length === 0 ? `
        <div class="hint">
          <strong>No chat contacts</strong>
          <div style="margin-top: 6px; color: var(--muted);">
            Go to <a href="#/contacts" style="color: var(--accent); text-decoration: underline;">Contacts</a> 
            and enable "Show in Chat" for contacts you want to see messages from.
          </div>
        </div>
      ` : ''}

      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <select id="chatFilter" onchange="filterChatMessages()" style="max-width: 300px;">
          <option value="">All Contacts</option>
          ${chatContacts.map(contact => `
            <option value="${contact.address}">${contact.avatar} ${contact.displayName}</option>
          `).join('')}
        </select>
        
        <button class="ghost" onclick="refreshMessages()">🔄 Refresh</button>
      </div>

      <div id="messagesList">
        ${renderMessages(messages)}
      </div>
    </div>
  `;
}

// Filter messages by contact
window.filterChatMessages = function () {
  const selectedAddress = document.getElementById('chatFilter').value;
  const messages = loadMessagesFromTransactions();
  document.getElementById('messagesList').innerHTML = renderMessages(messages, selectedAddress || null);
};

// Refresh messages (will call MDS in production)
window.refreshMessages = function () {
  const messages = loadMessagesFromTransactions();
  const selectedAddress = document.getElementById('chatFilter')?.value || null;
  document.getElementById('messagesList').innerHTML = renderMessages(messages, selectedAddress);

  // TODO: Replace with actual MDS call
  // MDS.cmd("coins", function(response) {
  //   // Parse transaction state for messages
  // });
};

// Export to StablesRoutes namespace
window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderChat = renderChat;




