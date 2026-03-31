// Runtime configuration for UI behavior and local persistence.
window.STABLES_CONFIG = {
  /** Shipped build (keep in sync with dapp.conf "version" when you release). */
  APP_BUILD_VERSION: '0.01.01',
  /**
   * Council-side view of the newest MiniDapp. If latestPublishedVersion sorts above APP_BUILD_VERSION,
   * the Council communications page shows criticality + what changed + zip link.
   * To preview the update banner locally, temporarily set APP_BUILD_VERSION lower than latestPublishedVersion.
   */
  APP_UPDATE_POLICY: {
    latestPublishedVersion: '0.01.01',
    whenUpdateNeeded: {
      criticality: 'high',
      whatChanged:
        'Example when an update ships: security fixes, mandatory protocol UI changes, or critical Minima MDS fixes.',
      details:
        'Install the new Stables_v0.01.01.mds.zip on my node from the link below, or use Settings and updates.'
    }
  },
  ACTIVITY_PAGE_SIZE: 25,
  BACKUP_REMINDER_HOURS: 48,
  BACKUP_STORAGE_KEY: 'stables_last_config_backup_ts',
  BACKUP_FIRST_SEEN_KEY: 'stables_backup_first_seen_ts',
  /** User confirmed Vault key is safely stored. Stops the first-run Vault key prompt. */
  SEED_PHRASE_SAVED_CONFIRMED_KEY: 'stables_seedphrase_saved_confirmed_v1',
  /** After the welcome flow closes, wait this long (ms) before the Vault backup modal (no on-screen timer). */
  VAULT_SECURITY_MODAL_DELAY_MS: 60000,
  /**
   * When true, clears the Vault-key “I have stored it safely” flag on every full page load so the
   * amber security modal can appear again after each refresh (showcase / web demo).
   * Set to false for a production MiniDapp build so users are not re-prompted every visit.
   */
  RESET_VAULT_KEY_CONFIRMATION_ON_EACH_LOAD: true,
  /** After confirming, user chose whether to allow occasional soft reminders: 'yes' | 'no'. */
  VAULT_PERIODIC_REMINDER_PREF_KEY: 'stables_vault_periodic_reminder_pref_v1',
  /** Last time we showed a soft Vault reminder (when pref is yes). */
  VAULT_SOFT_REMINDER_LAST_KEY: 'stables_vault_soft_reminder_last_ts_v1',
  /** Days between soft reminders when user opted in. */
  VAULT_SOFT_REMINDER_INTERVAL_DAYS: 60,
  /** Public demo: placeholder location for latest MiniDapp package (opens GitHub for now). */
  MDS_ZIP_URL: 'https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/latest-version',
  /**
   * Stables Charter on GitHub (Markdown). Governing text for how the Council and community run the protocol.
   * Point this at the published file in your org repo when it is live (path below is a placeholder you can change).
   */
  STABLES_CHARTER_URL:
    'https://github.com/StablesCouncil/StablesCouncil.github.io/blob/main/governance/stables_charter.md',
  /**
   * Public feedback ledger on GitHub (folder of JSON files or README explaining the workflow).
   * Shown on Feedback page as "See what others sent". Point at your org repo when the folder exists.
   */
  FEEDBACK_PUBLIC_DB_URL:
    'https://github.com/StablesCouncil/StablesCouncil.github.io/tree/main/feedback',
  /**
   * POST target for structured feedback JSON (same shape as `feedback_submission.v1.schema.json`).
   * Production: Stables web agent serves `POST /api/feedback` on agent.stablescouncil.org.
   * Local dev on localhost/127.0.0.1: `feedback.js` uses `http://127.0.0.1:8788/api/feedback` unless you set
   * FEEDBACK_SKIP_LOCAL_SUBMIT: true to hit this URL from a local static server instead.
   */
  FEEDBACK_SUBMIT_URL: 'https://agent.stablescouncil.org/api/feedback',
  /**
   * If `window.MDS` exists: feedback uses `MDS.net.POST` (no CORS); StablesAgent can open in the system browser
   * (see STABLES_AGENT_OPEN_EXTERNAL_WHEN_MDS) instead of a blocked iframe.
   */
  STABLES_AGENT_OPEN_EXTERNAL_WHEN_MDS: true,
  /**
   * MEXC ticker for MINIMA/USDT. Prefer the 24h endpoint: same last price as spot plus quote volume (USDT)
   * for Treasury liquidity readouts. In MiniDapp, `MDS.net.GET` is used (no CORS issue).
   */
  MEXC_TICKER_URL: 'https://api.mexc.com/api/v3/ticker/24hr?symbol=MINIMAUSDT',
  /**
   * Optional override for CoinGecko simple price (Minima id). Default is built into `index.html`;
   * set here if you need a different endpoint or query.
   */
  COINGECKO_MINIMA_URL: '',
  /**
   * Minima explorer base URL for transaction links.
   * Expected format: `${base}${txId}` (example: https://explorer.minima.global/transaction/).
   */
  MINIMA_EXPLORER_TX_BASE_URL: 'https://explorer.minima.global/transaction/',
  /**
   * Minima explorer base URL for address (wallet) pages.
   * Expected format: `${base}${address}` (example: https://explorer.minima.global/address/).
   */
  MINIMA_EXPLORER_ADDRESS_BASE_URL: 'https://explorer.minima.global/address/',
  /** Public Council treasury Minima address (replace with live value when known). */
  COUNCIL_TREASURY_MINIMA_ADDRESS: 'MxCOUNCIL_TREASURY_DEMO',
  /** How often to refresh spot price for Treasury stress slider (ms). */
  WINIWA_PRICE_POLL_MS: 120000,
  /**
   * When true (default), Mint/Burn vault actions skip Council Executive role — for browser/local demo.
   * Set false in builds where multisig gating should apply.
   */
  DEMO_VAULT_UNLOCK: true,
  /**
   * Telegram: dedicated security / Vault key support (supergroup or channel invite).
   * Publish the real invite here when the channel is live; used from Vault modal “I need help”.
   */
  SECURITY_SUPPORT_TELEGRAM_URL: 'https://t.me/StablesSecuritySupport',
  /**
   * Telegram: Ambassador program specification discussion (community topic thread).
   * @see https://stablescouncil.org/ambassadorsprogramdesc.html
   */
  AMBASSADOR_TOPICS_TELEGRAM_URL: 'https://t.me/stablescommunity/358',
  /**
   * Official council notices on the Council communications page (security, mandatory updates, critical comms).
   * Replace `items` on each release; keep copy factual and short.
   */
  COUNCIL_COMMUNICATIONS: {
    intro:
      'This channel is for Stables Council only: security incidents, required updates, and other critical communication. It is not for casual chat.',
    items: [
      {
        title: 'Prototype build',
        date: '2026-03-19',
        body:
          'No live signed council feed is wired in this prototype. In production, verified council messages will appear on the Council communications page (More, Community).'
      }
    ]
  },
  CONTACT_NOTES_KEY: 'stables_contact_notes_v1',
  SUSPICIOUS_TX_KEY: 'stables_suspicious_tx_ids_v1',
  HIDDEN_TX_KEY: 'stables_hidden_tx_ids_v1',
  /** Wallet / activity “soft hide” (recoverable; shown when Hidden filter is on) */
  SOFT_HIDDEN_TX_KEY: 'stables_soft_hidden_tx_ids_v1',
  HIDDEN_SHOPS_KEY: 'stables_hidden_shop_names_v1',
  TX_NOTES_KEY: 'stables_tx_notes_v1',
  /** Phase 1 trust/retro scaffold keys (merchant validation + eligibility snapshots). */
  TRUST_VALIDATIONS_KEY: 'stables_trust_validations_v1',
  TRUST_PROFILES_KEY: 'stables_trust_profiles_v1',
  RETRO_EXPENSES_KEY: 'stables_retro_expenses_v1',
  RETRO_WINDOWS_KEY: 'stables_retro_windows_v1',
  RETRO_SNAPSHOTS_KEY: 'stables_retro_snapshots_v1',
  ABUSE_SIGNALS_KEY: 'stables_abuse_signals_v1',
  TRUST_MAX_VALIDATIONS_PER_MERCHANT_PER_DAY: 100,
  RETRO_MIN_RECEIPT_AMOUNT: 0.01,
  RETRO_MAX_IN_SCOPE_PER_WINDOW: 1000,
  COUNCIL_MEMBER_PROFILE_KEY: 'stables_council_member_profile_v1',
  ONCHAIN_RECOVERED: [
    'Wallet addresses and UTXO state tied to the seed phrase',
    'On-chain transaction history and confirmations',
    'Token balances and protocol positions'
  ],
  LOCAL_CONFIG_ONLY: [
    'UI preferences and display filters',
    'Contact notes and local contact tags',
    'Suspicious transaction flags',
    'Transaction notes',
    'Hidden/deleted transaction visibility flags',
    'Soft-hidden transactions and hidden merchants (local demo)',
    'Activity search state and demo-only metadata',
    'stables_demo_wallet_v1 (browser demo vault balances)',
    'stables_demo_exchange_hist_v1 (browser demo exchange history)'
  ]
};

