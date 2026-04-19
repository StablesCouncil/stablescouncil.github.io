// MODALS.JS - Send/Receive modal functionality

(function () {
    // Modal state
    let currentQR = null;
    let selectedCurrency = localStorage.getItem('defaultCurrency') || 'm';

    // Helper: $ shorthand
    const $ = (id) => document.getElementById(id);

    // Update selected currency (called from wallet.js)
    window.setModalCurrency = (currency) => {
        selectedCurrency = currency;
    };

    // ========== RECEIVE MODAL ==========

    window.openReceiveModal = () => {
        const backdrop = $('recvBackdrop');
        if (!backdrop) return;

        backdrop.style.display = 'flex';

        // Set selected currency
        $('recvCurrency').value = selectedCurrency;

        updateReceiveAddress();

        // Listen for currency/amount changes
        $('recvCurrency').onchange = updateReceiveAddress;
        $('recvAmount').oninput = updateReceiveAddress;
    };

    window.closeReceiveModal = () => {
        const backdrop = $('recvBackdrop');
        if (backdrop) backdrop.style.display = 'none';

        // Clear QR
        if (currentQR) {
            $('qrCodeContainer').innerHTML = '';
            currentQR = null;
        }
    };

    function updateReceiveAddress() {
        // Get mock address (in real app, get from Minima)
        const currency = $('recvCurrency').value;
        const amount = $('recvAmount').value;

        // Mock address (replace with real Minima address)
        const address = 'Mx' + Math.random().toString(36).substring(2, 15).toUpperCase();

        // Build payment string
        let paymentString = address;
        if (amount && amount > 0) {
            paymentString += `?amount=${amount}&currency=${currency}`;
        }

        // Display address
        $('recvAddr').textContent = address;

        // Generate QR code
        generateQR(paymentString);
    }

    function generateQR(text) {
        const container = $('qrCodeContainer');
        container.innerHTML = ''; // Clear previous

        if (typeof QRCode === 'undefined') {
            container.innerHTML = '<div style="color: var(--muted);">QR library not loaded</div>';
            return;
        }

        try {
            currentQR = new QRCode(container, {
                text: text,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            console.error('QR generation failed:', e);
            container.innerHTML = '<div style="color: var(--warn);">QR generation failed</div>';
        }
    }

    window.copyReceiveAddress = () => {
        const addr = $('recvAddr').textContent;
        if (!addr || addr === 'Loading...') return;

        navigator.clipboard.writeText(addr).then(() => {
            const btn = $('copyReceive');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓ Copied!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('Failed to copy address');
        });
    };

    window.shareReceiveAddress = () => {
        const addr = $('recvAddr').textContent;
        const currency = $('recvCurrency').value;
        const amount = $('recvAmount').value;

        if (!addr || addr === 'Loading...') return;

        let shareText = `Send me ${currency} to: ${addr}`;
        if (amount && parseFloat(amount) > 0) {
            shareText = `Send me ${amount} ${currency} to: ${addr}`;
        }

        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Receive Payment',
                text: shareText
            }).then(() => {
                console.log('Shared successfully');
            }).catch(err => {
                console.log('Share cancelled or failed:', err);
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                const btn = $('shareReceive');
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓ Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            }).catch(err => {
                alert('Share not supported. Address copied to clipboard instead.');
            });
        }
    };

    // ========== SEND MODAL ==========

    window.openSendModal = () => {
        const backdrop = $('sendBackdrop');
        if (!backdrop) return;

        backdrop.style.display = 'flex';

        // Set selected currency
        $('sendAsset').value = selectedCurrency;

        // Initial Balance Update
        updateSendBalance();

        // Listen for changes
        $('sendAsset').onchange = updateSendBalance;
    };

    function updateSendBalance() {
        const asset = $('sendAsset').value;
        const balanceSpan = $('sendBalance');

        if (window.StablesApp && window.StablesApp.state && window.StablesApp.state.balances) {
            const bal = window.StablesApp.state.balances[asset] || 0;
            // Get label from select option
            const sel = $('sendAsset');
            const label = sel.options[sel.selectedIndex].text;

            balanceSpan.textContent = `Balance: ${window.StablesApp.fmt(bal)} ${label}`;
        }
    }

    // Max Button Logic for Send Modal
    window.fillSendMax = () => {
        const asset = $('sendAsset').value;
        if (window.StablesApp && window.StablesApp.state && window.StablesApp.state.balances) {
            const bal = window.StablesApp.state.balances[asset] || 0;
            $('sendAmt').value = bal; // No formatting for input value usually, or standard format
        }
    };

    window.closeSendModal = () => {
        const backdrop = $('sendBackdrop');
        if (backdrop) backdrop.style.display = 'none';

        // Clean up listeners if needed, or rely on overwriting them on open
    };

    window.confirmSend = () => {
        const asset = $('sendAsset').value;
        const toAddr = $('sendTo').value;
        const amountStr = $('sendAmt').value;
        const amount = parseFloat(amountStr.replace(/,/g, ''));

        if (!toAddr || !toAddr.trim()) {
            alert('Please enter a recipient address');
            return;
        }

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        // Mock send (in real app, call Minima API)
        console.log('SEND:', { asset, toAddr, amount });
        alert(`Mock send: ${amount} ${asset} to ${toAddr.substring(0, 10)}...`);

        // Close modal
        closeSendModal();

        // Clear form
        $('sendTo').value = '';
        $('sendAmt').value = '';
    };

    // Address book / contacts
    window.openContacts = () => {
        alert('Address book coming soon! (Navigate to Contacts page)');
        // In real app: open contacts selector or navigate to #/contacts
    };

    // ========== INITIALIZE ==========

    // Format number with commas (Regex Implementation)
    function formatNumber(value) {
        if (!value) return '';

        // 1. Clean input: numbers and dots only
        let cleaned = value.replace(/[^0-9.]/g, '');

        // 2. Split integer and decimal
        // Handle multiple dots by taking everything after first dot as decimal part, then sanitizing
        let parts = cleaned.split('.');
        let integer = parts[0];
        let decimal = '';

        if (parts.length > 1) {
            decimal = '.' + parts.slice(1).join('');
        }

        // 3. Strip leading zeros
        if (integer.length > 1 && integer.startsWith('0')) {
            integer = integer.replace(/^0+/, '');
            if (integer === '') integer = '0';
        }

        // 4. Add commas to integer part
        if (integer) {
            integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return integer + decimal;
    }

    // Get numeric value without formatting
    function getNumericValue(value) {
        return value.replace(/,/g, '');
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Wire up close buttons
        const closeRecv = $('closeRecv');
        if (closeRecv) closeRecv.onclick = closeReceiveModal;

        const closeSend = $('closeSend');
        if (closeSend) closeSend.onclick = closeSendModal;

        // Wire up action buttons
        const copyBtn = $('copyReceive');
        if (copyBtn) copyBtn.onclick = copyReceiveAddress;

        const shareBtn = $('shareReceive');
        if (shareBtn) shareBtn.onclick = shareReceiveAddress;

        const confirmBtn = $('confirmSend');
        if (confirmBtn) confirmBtn.onclick = confirmSend;

        const maxBtn = $('btnSendMax');
        if (maxBtn) maxBtn.onclick = fillSendMax;

        // Wire up backdrop clicks (close on backdrop)
        // Must check if targets match exactly to avoid closing when clicking inside modal
        const recvBackdrop = $('recvBackdrop');
        if (recvBackdrop) {
            recvBackdrop.onclick = (e) => {
                if (e.target === recvBackdrop) closeReceiveModal();
            };
        }

        const sendBackdrop = $('sendBackdrop');
        if (sendBackdrop) {
            sendBackdrop.onclick = (e) => {
                if (e.target === sendBackdrop) closeSendModal();
            };
        }
    });

    // Helper: Handle inputs (Event Delegation for robustness)
    document.body.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.getAttribute('inputmode') === 'decimal') {
            const input = e.target;
            const cursorPos = input.selectionStart;

            // Check if value changed to avoid loops
            const original = input.value;
            const formatted = formatNumber(original);

            if (original !== formatted) {
                input.value = formatted;

                // Restore cursor (simple approximation)
                // If we added commas, the length grew.
                // We try to keep the cursor relative to the digits.
                // But for now, standard behavior:
                const lengthDiff = formatted.length - original.length;
                const newPos = cursorPos + lengthDiff;
                if (newPos > 0) {
                    input.setSelectionRange(newPos, newPos);
                }
            }
        }
    });

    // Keydown listener for Numpad Comma -> Dot conversion
    document.body.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.getAttribute('inputmode') === 'decimal') {
            if (e.key === ',') {
                e.preventDefault();
                const input = e.target;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                input.setRangeText('.', start, end, 'end');
                // Trigger input event manually to format
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

    // Initial setup not needed with delegation, but consistent placeholders help
    console.log('Modals JS Loaded & delegation active');

})();




