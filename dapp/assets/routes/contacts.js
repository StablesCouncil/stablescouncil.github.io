'use strict';

// ------------------------------
// Contacts Page
// ------------------------------

// Avatar options
const AVATAR_OPTIONS = [
  '👤', '👨‍💼', '👩‍💼', '🏢', '🏪', '🍔', '✈️', '🏥',
  '🎓', '💼', '🎮', '🏠', '💰', '📦', '⭐'
];

// Contact categories
const CONTACT_CATEGORIES = [
  'Retail & Shopping',
  'Food & Restaurants',
  'Travel & Transport',
  'Health & Medical',
  'Education',
  'Professional Services',
  'Home & Utilities',
  'Entertainment',
  'Financial Services',
  'E-commerce',
  'Custom' // Allows user to enter custom category
];

// View state
let contactsViewMode = 'list'; // 'list' or 'card'
let contactsSortBy = 'name'; // 'name', 'address', 'category', 'chat'
let contactsSortDir = 'asc'; // 'asc' or 'desc'

// Load contacts from localStorage
function loadContacts() {
  try {
    const stored = localStorage.getItem('Stables_contacts');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load contacts:', error);
    return [];
  }
}

// Save contacts to localStorage
function saveContacts(contacts) {
  try {
    localStorage.setItem('Stables_contacts', JSON.stringify(contacts));
  } catch (error) {
    console.error('Failed to save contacts:', error);
  }
}

// Sort contacts
function sortContacts(contacts) {
  const sorted = [...contacts];
  sorted.sort((a, b) => {
    let valA, valB;

    switch (contactsSortBy) {
      case 'name':
        valA = a.displayName.toLowerCase();
        valB = b.displayName.toLowerCase();
        break;
      case 'address':
        valA = a.address.toLowerCase();
        valB = b.address.toLowerCase();
        break;
      case 'category':
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
        break;
      case 'chat':
        valA = a.showInChat ? 1 : 0;
        valB = b.showInChat ? 1 : 0;
        break;
      default:
        valA = a.displayName.toLowerCase();
        valB = b.displayName.toLowerCase();
    }

    if (valA < valB) return contacts sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return contactsSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Render list view
function renderContactsListView(contacts) {
  if (contacts.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: var(--muted);">
        <div style="font-size: 48px; margin-bottom: 12px;">👥</div>
        <div style="font-size: 16px; font-weight: 700;">No contacts yet</div>
        <div style="margin-top: 8px;">Add my first contact to get started</div>
      </div>
    `;
  }

  const sorted = sortContacts(contacts);

  return `
    <div style="display:grid; gap:14px;">
      <!-- Column Headers -->
      <div style="display:flex; justify-content:space-between; color:var(--muted); font-size:11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 0;">
        <div style="width:50px;"></div>
        <div style="width:180px; cursor: pointer;" onclick="sortContactsBy('name')">
          Name ${contactsSortBy === 'name' ? (contactsSortDir === 'asc' ? '▲' : '▼') : ''}
        </div>
        <div style="width:180px; cursor: pointer;" onclick="sortContactsBy('address')">
          Address ${contactsSortBy === 'address' ? (contactsSortDir === 'asc' ? '▲' : '▼') : ''}
        </div>
        <div style="width:140px; cursor: pointer;" onclick="sortContactsBy('category')">
          Category ${contactsSortBy === 'category' ? (contactsSortDir === 'asc' ? '▲' : '▼') : ''}
        </div>
        <div style="width:100px; cursor: pointer;" onclick="sortContactsBy('chat')">
          Chat ${contactsSortBy === 'chat' ? (contactsSortDir === 'asc' ? '▲' : '▼') : ''}
        </div>
        <div style="width:80px; text-align:right">Actions</div>
      </div>

      <!-- Contact Rows -->
      ${sorted.map((contact, index) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 12px; background: rgba(103,232,249,.03); border-radius: 12px; border: 1px solid rgba(103,232,249,.10);">
          <div style="width:50px; font-size: 28px;">${contact.avatar || '👤'}</div>
          <div style="width:180px; font-weight:900; font-size: 14px;">${contact.displayName}</div>
          <div style="width:180px; font-size: 11px; color: var(--muted); word-break: break-all;">${contact.address}</div>
          <div style="width:140px; font-size: 12px;">${contact.category}</div>
          <div style="width:100px;">
            ${contact.showInChat ? '<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">YES</span>' : '<span style="background: rgba(159, 176, 192, 0.15); color: var(--muted); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">NO</span>'}
          </div>
          <div style="width:80px; display: flex; gap: 6px; justify-content: flex-end;">
            <button onclick="editContact(${index})" style="font-size: 14px; padding: 6px 10px; background: transparent; border: 1px solid rgba(103,232,249,.3); border-radius: 8px; cursor: pointer; color: var(--text);" title="Edit">✏️</button>
            <button onclick="deleteContact(${index})" style="font-size: 14px; padding: 6px 10px; background: transparent; border: 1px solid rgba(239,68,68,.3); border-radius: 8px; cursor: pointer; color: #ef4444;" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Render card view (original)
function renderContactsCardView(contacts) {
  if (contacts.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: var(--muted);">
        <div style="font-size: 48px; margin-bottom: 12px;">👥</div>
        <div style="font-size: 16px; font-weight: 700;">No contacts yet</div>
        <div style="margin-top: 8px;">Add my first contact to get started</div>
      </div>
    `;
  }

  return `<div style="display:grid; gap:14px;">${contacts.map((contact, index) => `
    <div style="display: flex; align-items: start; gap: 12px; padding: 14px; background: rgba(103,232,249,.03); border-radius: 12px; border: 1px solid rgba(103,232,249,.10);">
      <div style="font-size: 36px; line-height: 1;">${contact.avatar || '👤'}</div>
      <div style="flex: 1;">
        <div style="font-size: 16px; font-weight: 900; margin-bottom: 4px;">${contact.displayName}</div>
        <div style="font-size: 11px; color: var(--muted); word-break: break-all; margin-bottom: 8px;">${contact.address}</div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span style="background: rgba(103,232,249,.15); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">${contact.category}</span>
          ${contact.showInChat ? '<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">Chat Enabled</span>' : '<span style="background: rgba(159, 176, 192, 0.15); color: var(--muted); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">Chat Disabled</span>'}
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button onclick="editContact(${index})" style="font-size: 14px; padding: 8px 12px; background: transparent; border: 1px solid rgba(103,232,249,.3); border-radius: 8px; cursor: pointer; color: var(--text);" title="Edit">✏️</button>
        <button onclick="deleteContact(${index})" style="font-size: 14px; padding: 8px 12px; background: transparent; border: 1px solid rgba(239,68,68,.3); border-radius: 8px; cursor: pointer; color: #ef4444;" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('')}</div>`;
}

// Render avatar picker
function renderAvatarPicker(selectedAvatar = '👤') {
  return `
    <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; padding: 12px; border: 1px solid rgba(34,48,68,.85); border-radius: 14px; background: rgba(11,15,20,.35);">
      ${AVATAR_OPTIONS.map(avatar => `
        <button type="button" class="avatar-option ${avatar === selectedAvatar ? 'selected' : ''}" 
                onclick="selectAvatar('${avatar}')"
                style="font-size: 24px; padding: 8px; border: 2px solid ${avatar === selectedAvatar ? 'var(--accent)' : 'transparent'}; background: ${avatar === selectedAvatar ? 'rgba(103,232,249,.12)' : 'transparent'}; border-radius: 8px; cursor: pointer;">
          ${avatar}
        </button>
      `).join('')}
    </div>
  `;
}

// Render contact form
function renderContactForm(contact = null) {
  const isEdit = contact !== null;
  const formData = contact || {
    avatar: '👤',
    displayName: '',
    address: '',
    category: CONTACT_CATEGORIES[0],
    showInChat: true
  };

  return `
    <form id="contactForm" onsubmit="saveContact(event, ${isEdit ? contact.index : 'null'})">
      <div style="display: grid; gap: 14px;">
        
        <div>
          <label>Avatar</label>
          ${renderAvatarPicker(formData.avatar)}
          <input type="hidden" id="contactAvatar" value="${formData.avatar}" />
        </div>

        <div>
          <label for="contactName">Display Name *</label>
          <input type="text" id="contactName" placeholder="e.g. Coffee Shop Downtown" value="${formData.displayName}" required />
        </div>

        <div>
          <label for="contactAddress">Winiwa Address *</label>
          <input type="text" id="contactAddress" placeholder="Mx..." value="${formData.address}" required />
        </div>

        <div>
          <label for="contactCategory">Category</label>
          <select id="contactCategory">
            ${CONTACT_CATEGORIES.map(cat =>
    `<option value="${cat}" ${cat === formData.category ? 'selected' : ''}>${cat}</option>`
  ).join('')}
          </select>
        </div>

        <div id="customCategoryField" style="display: none;">
          <label for="customCategory">Custom Category</label>
          <input type="text" id="customCategory" placeholder="Enter custom category" />
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" id="contactShowInChat" ${formData.showInChat ? 'checked' : ''} />
          <label for="contactShowInChat" style="margin: 0; cursor: pointer;">Enable for Chat</label>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <button type="submit" class="primary" style="padding: 16px; font-size: 16px; font-weight: 900;">
            ${isEdit ? 'Update Contact' : 'Add Contact'}
          </button>
          <button type="button" class="ghost" onclick="closeContactModal()" style="padding: 16px; font-size: 16px; font-weight: 900;">Cancel</button>
        </div>
      </div>
    </form>
  `;
}

// Main render function
function renderContacts(ctx) {
  const contacts = loadContacts();
  const { $, app } = ctx;

  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';

  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- Top Bar: Search + Toggle + Add Button -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="flex: 1;">
          <input type="text" id="contactSearch" placeholder="🔍 Search contacts..." 
                 onkeyup="filterContacts()" style="max-width: 400px;" />
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <!-- View Toggle -->
          <div style="display: flex; gap: 4px; background: rgba(11,15,20,.35); border-radius: 8px; padding: 4px;">
            <button id="viewListBtn" onclick="switchContactsView('list')" 
                    style="padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; background: ${contactsViewMode === 'list' ? 'var(--accent)' : 'transparent'}; color: ${contactsViewMode === 'list' ? '#0b0f14' : 'var(--muted)'}; border: none;">
              ☰ List
            </button>
            <button id="viewCardBtn" onclick="switchContactsView('card')"
                    style="padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; background: ${contactsViewMode === 'card' ? 'var(--accent)' : 'transparent'}; color: ${contactsViewMode === 'card' ? '#0b0f14' : 'var(--muted)'}; border: none;">
              ⊞ Cards
            </button>
          </div>
          <button class="primary" onclick="openAddContactModal()" style="padding: 12px 18px; font-size: 14px; font-weight: 900;">+ Add Contact</button>
        </div>
      </div>

      <!-- Contacts Display -->
      <div id="contactsList">
        ${contactsViewMode === 'list' ? renderContactsListView(contacts) : renderContactsCardView(contacts)}
      </div>
    </div>

    <!-- Add/Edit Contact Modal -->
    <div class="backdrop" id="contactModal" style="display: none;">
      <div class="modal" style="width: min(600px, 100%);">
        <div class="modal-head">
          <strong id="contactModalTitle">Add Contact</strong>
        </div>
        <div class="modal-body" id="contactModalBody">
          ${renderContactForm()}
        </div>
      </div>
    </div>
  `;

  // Setup category dropdown handler
  setupCategoryDropdown();
}

// Setup category dropdown (Custom category field)
function setupCategoryDropdown() {
  const categorySelect = document.getElementById('contactCategory');
  const customField = document.getElementById('customCategoryField');

  if (categorySelect && customField) {
    categorySelect.addEventListener('change', (e) => {
      customField.style.display = e.target.value === 'Custom' ? 'block' : 'none';
    });
  }
}

// Switch view mode
window.switchContactsView = function (mode) {
  contactsViewMode = mode;
  const contacts = loadContacts();
  const listEl = document.getElementById('contactsList');
  if (listEl) {
    listEl.innerHTML = mode === 'list' ? renderContactsListView(contacts) : renderContactsCardView(contacts);
  }
  // Update button styles
  document.getElementById('viewListBtn').style.background = mode === 'list' ? 'var(--accent)' : 'transparent';
  document.getElementById('viewListBtn').style.color = mode === 'list' ? '#0b0f14' : 'var(--muted)';
  document.getElementById('viewCardBtn').style.background = mode === 'card' ? 'var(--accent)' : 'transparent';
  document.getElementById('viewCardBtn').style.color = mode === 'card' ? '#0b0f14' : 'var(--muted)';
};

// Sort contacts by column
window.sortContactsBy = function (column) {
  if (contactsSortBy === column) {
    contactsSortDir = contactsSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    contactsSortBy = column;
    contactsSortDir = 'asc';
  }

  const contacts = loadContacts();
  const listEl = document.getElementById('contactsList');
  if (listEl && contactsViewMode === 'list') {
    listEl.innerHTML = renderContactsListView(contacts);
  }
};

// Filter contacts
window.filterContacts = function () {
  const query = document.getElementById('contactSearch').value.toLowerCase();
  const contacts = loadContacts();
  const filtered = contacts.filter(c =>
    c.displayName.toLowerCase().includes(query) ||
    c.address.toLowerCase().includes(query) ||
    c.category.toLowerCase().includes(query)
  );

  const listEl = document.getElementById('contactsList');
  if (listEl) {
    listEl.innerHTML = contactsViewMode === 'list' ? renderContactsListView(filtered) : renderContactsCardView(filtered);
  }
};

// Select avatar
window.selectAvatar = function (avatar) {
  document.getElementById('contactAvatar').value = avatar;
  // Update visual selection
  document.querySelectorAll('.avatar-option').forEach(btn => {
    const isSelected = btn.textContent.trim() === avatar;
    btn.style.border = `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`;
    btn.style.background = isSelected ? 'rgba(103,232,249,.12)' : 'transparent';
  });
};

// Open add contact modal
window.openAddContactModal = function () {
  const modal = document.getElementById('contactModal');
  const modalTitle = document.getElementById('contactModalTitle');
  const modalBody = document.getElementById('contactModalBody');

  modalTitle.textContent = 'Add Contact';
  modalBody.innerHTML = renderContactForm();
  modal.style.display = 'flex';

  setupCategoryDropdown();
};

// Edit contact
window.editContact = function (index) {
  const contacts = loadContacts();
  const contact = { ...contacts[index], index };

  const modal = document.getElementById('contactModal');
  const modalTitle = document.getElementById('contactModalTitle');
  const modalBody = document.getElementById('contactModalBody');

  modalTitle.textContent = 'Edit Contact';
  modalBody.innerHTML = renderContactForm(contact);
  modal.style.display = 'flex';

  setupCategoryDropdown();
};

// Delete contact
window.deleteContact = function (index) {
  if (!confirm('Delete this contact?')) return;

  const contacts = loadContacts();
  contacts.splice(index, 1);
  saveContacts(contacts);

  const listEl = document.getElementById('contactsList');
  if (listEl) {
    listEl.innerHTML = contactsViewMode === 'list' ? renderContactsListView(contacts) : renderContactsCardView(contacts);
  }
};

// Save contact
window.saveContact = function (event, editIndex) {
  event.preventDefault();

  const contacts = loadContacts();

  const category = document.getElementById('contactCategory').value;
  const finalCategory = category === 'Custom'
    ? document.getElementById('customCategory').value || 'Uncategorized'
    : category;

  const contact = {
    avatar: document.getElementById('contactAvatar').value,
    displayName: document.getElementById('contactName').value,
    address: document.getElementById('contactAddress').value,
    category: finalCategory,
    showInChat: document.getElementById('contactShowInChat').checked
  };

  if (editIndex !== null && editIndex >= 0) {
    contacts[editIndex] = contact;
  } else {
    contacts.push(contact);
  }

  saveContacts(contacts);
  closeContactModal();

  const listEl = document.getElementById('contactsList');
  if (listEl) {
    listEl.innerHTML = contactsViewMode === 'list' ? renderContactsListView(contacts) : renderContactsCardView(contacts);
  }
};

// Close contact modal
window.closeContactModal = function () {
  const modal = document.getElementById('contactModal');
  modal.style.display = 'none';
};

// Export render function
window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderContacts = renderContacts;




