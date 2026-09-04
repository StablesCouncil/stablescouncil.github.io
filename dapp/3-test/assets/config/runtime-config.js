// Runtime configuration for UI behavior and local persistence.
window.STABLES_CONFIG = {
  /**
   * When true: keep full wallet currencies, settings, Winiwa mint, and exchange like the showcase, but use a separate
   * persisted wallet key and zeroed protocol simulator. No seeded demo activity or demo exchange rows: Activity and
   * Exchange show user actions only (native MINIMA sends from the node, in-app exchanges). Council/Treasury simulated
   * economics stay hidden; Charter headers remain.
   */
  DEMO_REAL_ONCHAIN_WALLET: true,
  /** localStorage JSON array for Activity when DEMO_REAL_ONCHAIN_WALLET (append via stablesAppendUserActivityRow). */
  // GENESIS-2 (2026-07-05): bumped v1 -> g2 so pre-reissue persisted rows (old Winiwa/USDw/xWiniwa
  // token ids, same display names) are abandoned. tx-mirror re-imports the current genesis-2 rows
  // from node history (last 48h; genesis-2 is newer than that), so the list shows only current tokens.
  // g2 -> g3 (2026-07-05): pre-chain-time rows carried import timestamps and (via the old 48h
  // adoption window) sometimes a WRONG txid/title; abandon them and re-import from node history
  // with real on-chain times.
  USER_ACTIVITY_STORAGE_KEY: 'stables_test_user_activity_v9a', // v9a (2026-07-24): V9 genesis reset — fresh token set; abandon all TV81 activity rows/caches; history re-imports from V9 node truth
  /** Wallet fingerprint for activity owner guard (test channel — separate from demo). */
  WALLET_OWNER_KEY: 'stables_test_wallet_owner_v9',
  /** Council channel for this package: drives top bar pill (Showcase / Demo / Test / Prod). */
  APP_STAGE: 'test',
  /**
   * First community-test product boundary (TV81-D23/D24/D25). Every defined product page remains
   * present and navigable in every build. The route list therefore describes the complete page map,
   * while enabledFeatures and releaseAssets separately fail closed around unfinished operations and
   * unavailable assets. Product pages remain visible through controls, data, and truthful state;
   * optional explanation belongs in the route-aware StablesAgent.
   */
  FIRST_TEST_RELEASE_PROFILE: Object.freeze({
    id: 'xwiniwa-core',
    allowedRoutes: Object.freeze([
      'wallet', 'invest', 'mint', 'exchange', 'trade', 'onoff-ramp', 'ambassador',
      'my-shop', 'spend', 'chat', 'council-comms', 'activity', 'contacts', 'feedback',
      'help-academy', 'help-links', 'council', 'treasury', 'faucet', 'settings-profile',
      'wallet-management', 'settings-updates', 'settings-security', 'settings-legal',
      'invoice', 'portfolio-simulator'
    ]),
    enabledFeatures: Object.freeze([
      'wallet', 'send', 'receive', 'faucet', 'xwiniwa-mint-burn', 'activity',
      'core-connection', 'support', 'preferences'
    ]),
    /**
     * XR1-03: the only assets the release surface may name, list, price, offer, or transact.
     * Every other currency in this source tree (USDw and the fiat stablecoin family) belongs to the
     * deferred stablecoin scope, so it must not appear as a wallet row, a display-currency choice, a
     * send/receive option, an activity filter, or a mint asset. `WINIMA` is the wallet's internal
     * row code for Winiwa; both spellings are listed so no lookup has to normalise first.
     */
    releaseAssets: Object.freeze(['WINIMA', 'Winiwa', 'xWiniwa'])
  }),
  /** Shipped build (keep in sync with dapp.conf "version" when you release). */
  APP_BUILD_VERSION: '0.0.11.0',
  /**
   * Dev build iteration for the current version line. Bump on EVERY change during testing so
   * each build is uniquely identifiable in the top-bar pill (e.g. v0.0.0.2.01, .02, …) and the
   * packaged zip name (Stables_v0.0.0.2.02.mds.zip). Reset to 1 when APP_BUILD_VERSION changes / published.
   * v0.0.6 line = the GENESIS-6 POOL GENERATION (V6_GENERATION_PLAN.md, live on TestV006 2026-07-12):
   * pool-priced (NO oracle, NO key), two-token opening (Winiwa + xWiniwa) + empty institutions
   * (vote-vault, per-launch auction); stablecoins born later via pledge→vote→auction→pool. App
   * rebuilt to genesis-6 per V6_APP_WIRING_PLAN.md (slice 1: config + pool reader).
   */
  APP_BUILD_ITERATION: 53,
  /** Date this build was published to GitHub (ISO YYYY-MM-DD). */
  APP_BUILD_DATE: '2026-09-04',
  /**
   * TX radar (dev instrument, test channel only): timestamps send FIRED, node event arrival,
   * and new relevant history rows to measure early incoming notification. true = on-screen
   * strip + console; 'console' = console/logcat lines only (no UI); false = off (publish).
   */
  TX_RADAR_ENABLED: false,
  /**
   * Automatic incoming-payment popup + announce toasts. false (user-oriented default): incoming
   * payments appear directly in the transaction list only; the progress modal opens solely from
   * the transaction-details "view progress" action.
   */
  INCOMING_POPUP_ENABLED: false,
  /** Top-bar channel menu labels (demo line superseded when test is active). */
  CHANNEL_MENU: {
    showcaseVersion: '0.0.0.0.3',
    demoVersion: '0.0.0.3.0',
    demoIteration: 52
  },
  /** TestV008 v0.0.8.1 is the exclusive active generation. Missing deployment identities remain empty and fail closed. */
  TEST_VERSION_0081: {
    registry_id: 'TV81-REGISTRY-001',
    abi_id: 'TV81-ABI-001',
    node_name: 'TestV008',
    protocol_version: 'v0.0.8.1',
    rpc_url: 'http://localhost:9105',
    // Same-mainnet participant used by the development browser and its maker/taker wallet.
    participant_rpc_url: 'http://localhost:9005',
    // Browser transport only: local CORS bridge to the Test12 participant RPC above.
    browser_rpc_url: 'http://localhost:9006',
    registry_url: 'assets/config/testv008-v0.0.8.1-app-registry.json',
    fallback_allowed: false,
    deployment_status: 'PHASE1_OBJECTS_DEPLOYED_UNVERIFIED'
  },
  TEST_PROTOCOL_GENERATION: 'tv81',
  /** Browser projection of the active registry. Values are populated only after controlled TestV008 deployment. */
  // V9 GENESIS RESET (2026-07-24): fresh token set + full-release faucet on Hot/Cold wallets.
  // On-chain identity is V9; the internal namespace strings (TestV008 / v0.0.8.1 / tv81 /
  // TV81-REGISTRY-001) are DELIBERATELY kept as the code's stable generation namespace to avoid a
  // high-risk global rename — they are not on-chain. The release VERSION is v0.0.9.0 (see APP_BUILD_*).
  TEST_TOKEN_REGISTRY: {
    generation: 'TestV008',
    generation_id: '0x5c868a0f08db73cef34907190d6db7ad7a55472834eb3aa1f8ae5db756fcaced',
    protocol_version: 'v0.0.8.1',
    winiwa_token_id: '0xd4f5dd3546f25d327cbf2b6867e193ce5db6491ac9c65bbdcecaca1a6688063f',
    xwiniwa_token_id: '0xefa53eff58616ddbdf0b6d6dbb4e18f041c4509fb3db3b7e5482b99abc72f127',
    usdw_token_id: '0x9174ad44c185ebe83e26d0c68086e197d45be0bd1ef15b6feda99ea1497a673a',
    faucet_claim_amount: 1000,
    faucet_limit_per_hour: 1,
    faucet_cooldown_blocks: 72,
    faucet_covenant_address: '0x5e08c5dcd965b9460c4734dc6113ae747c98dfec31b13feadf5805d464f49930',
    faucet_covenant_miniaddress: 'MxG082U132TPMB5N530ZHPKRHGH7BJKFWCDVR1HM4VUYNQZ0NA69T4P6175MZ83',
    faucet_pool_coin_id: '0x661921e443358e6fdbc15b99ebe6677073770b2f8200af103fbd0fac31f0fe1c',
    faucet_state_coin_id: '0xb769bc6a3a197418b4244ef2217ebea21acecf7b5cef71862f9fd457762f35d3',
    deployment_status: 'V9_ASSETS_AND_FAUCET_DEPLOYED_PROVEN'
  },

  /**
   * Which genesis the app transacts on. 'g2' = legacy instant direct-covenant mint/burn (above).
   * 'g3' = genesis-3: forward-pricing commit->clear, single keyless vault, multi-currency + CF + gate
   * fee. Kept 'g2' until each genesis-3 surface is built + emulator-verified (slice by slice), then
   * flipped. Full plan: task_test_channel/APP_GENESIS3_REWIRE_PLAN.md.
   */
  TEST_GENESIS: 'g2',
  /**
   * GENESIS-6 (2026-07-12, mainnet TestV006, LIVE): the POOL GENERATION. No oracle, no key, no
   * signed data. Two-token opening: Winiwa (collateral) + xWiniwa (equity) traded in an on-chain
   * bin pool at par; LPxw = the pool's position token. Empty institutions: an empty vote-vault and
   * a per-launch auction template. Stablecoins are born later via pledge -> vote -> auction -> pool.
   * The pool state coin carries the book (slot 1 totWiniwa, 2 totXwiniwa, 9 active bin); price is
   * linear: p = price_base + activeBin * price_step (active bin = par 1.0). Source of truth:
   * task_test_channel/genesis6-registry.json + V6_GENERATION_PLAN.md + V6_APP_WIRING_PLAN.md.
   * Connect the app to TestV006 via the CORS proxy (http://localhost:9006 -> RPC 9205).
   */
  TEST_GENESIS6: {
    rpc_url: 'http://localhost:9006',
    registry_url: 'assets/config/genesis6-registry.json',
    winiwa_token_id: '0xCCC07E6D963600407ADBB1FD2B11C8F4465065FBE328F6934F7B909D359B3892',
    xwiniwa_token_id: '0xE65F396B30B96F2F3E8C7C46A41FCF48BE8616116456AEDA27DBD8ED68A443D1',
    lpxw_token_id: '0x0989CF86047C41B75221483AD9B9166975F0AAF7EC8C8482BB66870A92A5B828',
    commit_address: '0x464A8C0517C435B21B69F83518D23DB4FA3384A29DE7CA19BD6580A7DFD888AC',
    pool_address: '0x24877368CC855E90F9C354617673E6C4414089BF0A4CA659A037AE46040F935C',
    reserve_winiwa_address: '0xC89B145A5B6F4996D5262B719AB3D30AD38E88860FF2436C59D54ECCD9E3149D',
    reserve_xwiniwa_address: '0x8EAD3CA862A57D8EA4366B1C0C6BBBBA323DBF7EEB88D40586A011F1D10567F6',
    reserve_lp_address: '0xBBB6A6A2C1D287CF968C9C178177C46C8BF181BD6BE78102B870F2E63E5C1EB7',
    treasury_address: '0x7B723E14E3E0B5A067B657F10132990128B2EBA6BEE879B1DB5E4DA217274A12',
    votevault_address: '0xC8E125D3B4AAC35300F7A29A05FEC012A4906CE00AB02AB76A51C851417E3E67',
    faucet_address: '0x6F2E8362CE26C169F322EC7A53CF3BFA9538212EDE2D1128F25CF2C5E1E983FF',
    faucet_claim: 1000,
    price_base: 0.9975,
    price_step: 0.000625,
    active_bin: 4,
    margin_num: 101,
    margin_den: 100,
  },
  /**
   * GENESIS-3 (2026-07-09, mainnet, LIVE): 38 tokens (10^12/8-dec/vanilla), 100% supply in keyless
   * vaults, issuer provably empty; oracle posting the 9 active currencies. Covenant addresses +
   * oracle key below; the full 18-currency + 18-cf token map is fetched from genesis3-registry.json
   * (copied into this folder). Source of truth: task_test_channel/genesis3-registry.json + GENESIS3_LIVE_STATE.md.
   */
  TEST_GENESIS3: {
    // GENESIS-3.1 USDw PILOT (founder decision 2026-07-10: one vertical slice proven deeply before
    // extension). Topology B: separate collateral pool + per-currency rate-port vaults; ONE commit
    // covenant serves every direction (mint/burn/swap/CF). Verifiability proof PASS 2026-07-10.
    vault_address: '0x25A0E2FEC25F59C778F13E8FA7EDB9B5A3C8085B360A18F09B8305999BDBCBC3',       // USDw per-currency vault (rate port 60)
    collateral_vault_address: '0x4E927F175F7359896C849153BB097E9E48AB7CC6A58537EC6450C23A93CBAE98', // Winiwa collateral pool (port 40 + sheet 50/51)
    cf_vault_address: '0xF62E39DDEB0AAE4AA713F7041075A474385A6BBF4E32968D490D453B2CD80AC9',    // Coverage Fund (share reserve + currency holdings; feeless)
    commit_address: '0xC2DDCE5F7FDE278F5E16E2B13D5C28FF3C30368AA9A329FC7BF52E82B0E3B8CC',     // forward-pricing escrow (address-free, dirs 0-4)
    cf_commit_address: '0xC2DDCE5F7FDE278F5E16E2B13D5C28FF3C30368AA9A329FC7BF52E82B0E3B8CC',  // same single commit
    swap_commit_address: '',                                                                    // swap OFF in the pilot (one currency)
    oracle_pubkey: '0x7C02CA718414C01B123787034EE4B966881DD42A31FC63170CADF5FE6369A21C',       // rate signer (band-limited; cannot move funds)
    winiwa_token_id: '0x1D9423E10001988B806F177F9B31F160C18C90FDFB1C5AABAC5627CDB736C163',      // collateral (g3.1 pilot generation)
    xwiniwa_token_id: '0xD4B075C5285684E9ABDC21ABEDD1ADA5AEDA0F732B30F89240D4C01F3FED80EF',     // equity (parked/dormant in the pilot)
    registry_url: 'assets/config/genesis3-registry.json',                                       // genesis31 block = pilot token map + active set
    // forward-pricing / covenant params (mirror the frozen covenant constants)
    matureage: 5, refundage: 120, maxusd: 500,
    dir: { mint: 0, burn: 1, swap: 2, cf_deposit: 3, cf_redeem: 4 },
    active: ['USDw'],                                                                            // PILOT: USDw only; extension per founder sign-off
    // LAB profile (Test12) — build + prove the commit→clear UX here first (loose LABW collateral + the
    // proven keeper). Swap these for the production addresses at the genesis-3.1 faucet carve-out.
    lab: {
      commit_address: '0xA370629B5F1F0CBCE18DDB1C07E2F0EBBCFACF35A5A2464671FAAA8DD3D99351',  // relaxed commit (matureage 2)
      vault_address: '0xDFC54E089B883A7324760D2025B66E24067DD782B6ADF119B01D6C4478CD671A',
      wintok: '0x254D248F004F0DF63D52AAE7B162C39ED076A279F39AD22E917779C630047F44',           // LABW collateral (stands in for Winiwa)
      covtok: '0xE8445A8B89ABA5140A81D7C8D9709D347DEE69C98A39A45B276D9620E5E7ADDC',           // LABU currency (stands in for USDw)
      faucet_address: '0x6F2E8362CE26C169F322EC7A53CF3BFA9538212EDE2D1128F25CF2C5E1E983FF',    // LABW faucet (pours <= cap/claim, change back to self) — proven claim txpow 0xCC151CD6
      faucet_claim: 1000,
      matureage: 2,
      // Coverage Fund lab deployment (dir-3 deposit / dir-4 withdraw PROVEN on-chain: 0x85D01180 / 0x05D740B7)
      cf_commit_address: '0x067598DA31576546A5016B300073EBFC0666533AF78A4F74D5B3CECC639C2E42',
      cf_vault_address: '0xB06F6A04A7F02889CCE9FD41598A775876DE335EEEC8284413264E4202815FAB',
      cf_share_token: '0x44D67300B841587CA2580AFABEE96B3537896087E3D0172CC3B5A3FB1EC04224',     // LABCF cf-share (shown as USDwcf)
      // FX swap lab deployment (dir-2 PROVEN on-chain at unequal rates: 0x63CF3439 / 0xE77651C6).
      // Per-currency-rate-port design: canonical commit + vaultA LABU@port60 (pF 1) + vaultB LABCF@port61 (pF 2).
      // In the lab, LABCF stands in as the SECOND currency of the pair (displayed EURw), same as the covenant proof.
      swap_commit_address: '0x8BED44CEE27BE7B211C640D84BAE74D625340F27F2B2E26E1D71331083444EFA',
      swap_pair_to_ccy: 'EURw',
      swap_pair_to_token: '0x44D67300B841587CA2580AFABEE96B3537896087E3D0172CC3B5A3FB1EC04224'
    }
  },
  /**
   * FORWARD-PRICING (commit→clear) MODE. When true, mint becomes "place order → executes at the next
   * published price → filled" against the genesis-3 commit covenant (lab profile while proving). When
   * false (default), the app keeps the unbroken genesis-2 instant mint. Flip per surface once verified.
   */
  TEST_FORWARD_PRICING: true,
  /**
   * Which forward-pricing profile the app transacts on:
   *   'lab'  = Test12 lab covenants (single-currency LABU/LABW, 0-dec) — proven; the default for testing.
   *   'prod' = production genesis-3 (9 currencies, Winiwa collateral, 8-dec, fee leg). Switch to 'prod'
   *            after the genesis-3.1 faucet carve-out ceremony + filling in the prod faucet below.
   * The order executor + faucet resolve everything through `g3prof` from this flag, so flipping it is the
   * whole app-side of go-live. Production currency token ids load from genesis3-registry.json.
   */
  TEST_FORWARD_PRICING_PROFILE: 'prod',
  /** Production Winiwa faucet — genesis-3.1 pilot (10M carve-out, covenant claimmax 1000). */
  TEST_GENESIS3_PROD_FAUCET_ADDRESS: '0x6F2E8362CE26C169F322EC7A53CF3BFA9538212EDE2D1128F25CF2C5E1E983FF',
  TEST_GENESIS3_PROD_FAUCET_CLAIM: 1000,
  /** xWiniwa EQUITY price-band covenant (genesis-2, mainnet 2026-07-04): xWiniwa released for Winiwa collateral at the operator-signed NAV rate (Winiwa per xWiniwa) held in state ports 40/41. Not 1:1. */
  TEST_XWINIWA_MINT_BURN_MODE: 'covenant',
  /**
   * xWiniwa valuation price fallback: 1 xWiniwa = this many Winiwa (NAV). GENESIS-2 launches at PAR (1).
   * The live rate is read on-chain from the covenant state coin (port 40 ratemint / 41 rateburn); this is
   * only the display/exchange fallback until the state-coin rate is read. Oracle sets NAV = E/X off-chain.
   */
  TEST_XWINIWA_PRICE_WINIWA: 1,
  /** Price-band covenant: the app builds mint/burn with STATE ports 30/20/21/23/24 + 40/41 (rates read from the state coin) + 99 (tag). Band enforced on-chain. */
  TEST_XWINIWA_PRICE_BAND: true,
  TEST_XWINIWA_COVENANT_ADDRESS: '0x96B6B0872D07B736CDB9662004AF101A91A2DCC8DF66764E7C412F37867AB670',
  TEST_XWINIWA_COVENANT_MINIADDRESS: 'MxG084MMQZ8EB87MSRCREB6402AU40QW6HDPW6VCPR4SV215SRZCUYME18VV6VD',
  TEST_XWINIWA_STATE_TAG: '7',
  TEST_XWINIWA_COVENANT_SCRIPT:
    'LET op = STATE(30) LET amt = STATE(20) LET coll = STATE(23) LET recipient = STATE(21) LET covleft = STATE(24) LET ratemint = STATE(40) LET rateburn = STATE(41) LET oper = 0x707B0FA189C85B7E3A49B65D8D6B0EA3CB29283347AF4A3FBA4BB4DCD9FBB7FE LET wintok = 0x9A6BB87435126E3972E7EB706500FDF7258D407CD254776A9C5A26EE7FB0AA25 LET covtok = 0xB7417EFCF19F52DF5E92DCC9B1BAD6EF3DCFE66DE51E449688ABC89520807DE0 IF @TOKENID EQ 0x00 THEN ASSERT SAMESTATE(99 99) ASSERT GETOUTKEEPSTATE(@TOTOUT - 1) EQ TRUE ASSERT ( SAMESTATE(40 40) AND SAMESTATE(41 41) ) OR SIGNEDBY(oper) ELSE ASSERT amt GT 0 ASSERT coll GT 0 ASSERT covleft EQ ( @AMOUNT - amt ) IF op EQ 0 THEN ASSERT @TOKENID EQ covtok ASSERT VERIFYOUT(0 recipient amt covtok FALSE) ASSERT VERIFYOUT(1 @ADDRESS covleft covtok FALSE) ASSERT VERIFYOUT(2 @ADDRESS coll wintok FALSE) ASSERT coll GTE ( amt * ratemint ) ENDIF IF op EQ 1 THEN ASSERT @TOKENID EQ wintok ASSERT VERIFYOUT(0 recipient amt wintok FALSE) ASSERT VERIFYOUT(1 @ADDRESS covleft wintok FALSE) ASSERT VERIFYOUT(2 @ADDRESS coll covtok FALSE) ASSERT amt LTE ( coll * rateburn ) ENDIF ENDIF RETURN ( @INPUT EQ 0 ) OR ( @INPUT EQ 1 )',
  /**
   * Protocol balance-sheet accounting (mirrors registry `current.balance_sheet`, decided 2026-07-05).
   * T (assets) = Winiwa at the two covenant pools. S/X (external floats) = reserve_seed − tokens at
   * covenant + gifted. E_eff = (T − S/winiwaUsd) + EQUITY_OFFSET_WINIWA (offset makes NAV = par at the
   * accounting snapshot; recorded in the registry with the snapshot). NAV = E_eff / X. Computed live
   * on the user's own node by `__STABLES_TEST_READ_BALANCE_SHEET__`; shown on the Treasury page.
   */
  TEST_BALANCE_SHEET: {
    usdw_reserve_seed: 100000,
    xwiniwa_reserve_seed: 900000000,
    gifted_usdw: 5,
    gifted_xwiniwa: 5,
    equity_offset_winiwa: -19111.27747394,
    snapshot_at: '2026-07-05T11:09:51.804Z',
    nav_floor_winiwa: 0.01
  },
  /** Wallet display: on the issuer node (which holds the full minted supply), hide test-token coins larger than this so only tester-sized activity shows. */
  TEST_WALLET_COIN_CEILING: 100000,
  /** Recovery hosts. FAST recovery (default) uses a MegaMMR node: restores money only, no history.
   *  FULL-HISTORY recovery uses an ARCHIVE node (Council VPS runs -archive -mysqlalltxpow), which
   *  re-downloads the full chain so past transactions reappear — slower/heavier. */
  TEST_MEGAMMR_HOST: 'megammr.minima.global:9001',
  TEST_ARCHIVE_HOST: '70.34.244.170:9001',
  /** `api` = issuer HTTP faucet (interim). `covenant` = on-chain pool claim (any synced wallet). */
  TEST_FAUCET_MODE: 'covenant',
  /** MINIMA reserved in faucet claim txn for balance (change = input − reserve). Not a network fee. */
  TEST_FAUCET_MINIMA_FLOAT_RESERVE: 0.0001,
  /** Hardened faucet covenant on mainnet (genesis-2; fresh Winiwa id, per-claim cap LTE 1000). scripts/faucet_covenant_g2.kiss */
  TEST_FAUCET_COVENANT_ADDRESS: '0xB4B10DA2E88228087C495D5EF567B35A3246B4E2629540C66663A8806952D202',
  TEST_FAUCET_COVENANT_MINIADDRESS: 'MxG085KM46Q5Q425047ZWATBRQMFCQQ693B9ZJ2WY0CCPJ3Y206WKMW08TTH56U',
  /** Minified scripts/faucet_covenant_g2.kiss — newscript on claim => 0xB4B10DA2…. */
  TEST_FAUCET_COVENANT_SCRIPT:
    'LET amt = STATE(20) LET recipient = STATE(21) LET poolleft = STATE(25) LET wintok = 0x9A6BB87435126E3972E7EB706500FDF7258D407CD254776A9C5A26EE7FB0AA25 IF @INPUT EQ 0 THEN ASSERT amt GT 0 ASSERT amt LTE 1000 ASSERT poolleft EQ ( @AMOUNT - amt ) ASSERT VERIFYOUT(0 recipient amt wintok FALSE) ASSERT VERIFYOUT(1 @ADDRESS poolleft wintok FALSE) ENDIF IF @INPUT EQ 1 THEN ASSERT SAMESTATE(99 99) ASSERT GETOUTKEEPSTATE(@TOTOUT - 1) EQ TRUE ENDIF RETURN TRUE',
  /** Issuer faucet/mint/burn API (interim 4B). Not used when TEST_FAUCET_MODE / TEST_MINT_BURN_MODE is covenant. */
  TEST_FAUCET_API_URL: 'http://127.0.0.1:8789',
  TEST_ISSUER_RPC_URL: 'http://127.0.0.1:9005',
  /**
   * Trustless USDw mint/burn via collateral_covenant_v3 (hardened reserve-release). 'covenant' = on-chain atomic,
   * any synced wallet, issuer signs nothing. Hardcoded tokenids + @TOKENID check + covleft remainder enforcement.
   * Winiwa is test stand-in for Minima. For prod: only change mint collateral token + USDs naming.
   * After edits: run deploy to get v3 address, update this field + registry, re-seed at new address.
   */
  TEST_MINT_BURN_MODE: 'covenant',
  /** Mainnet PRICE-BAND covenant (genesis-2; priceband_covenant_usdw.kiss => 0x99F107D4…). Rate (Winiwa per USDw) is operator-signed in state ports 40/41; the chain enforces coll>=amt*ratemint / amt<=coll*rateburn (fixes the ratio-blind drain). The app reads the rate from the state coin and sets ports 40/41. */
  TEST_MINT_BURN_COVENANT_ADDRESS: '0x99F107D4F9B1FB9692C64D93C3A6C8D936501FC587EBF3478A71C58A8300423B',
  /** Constant covenant state-coin tag (STATE 99). */
  TEST_MINT_BURN_STATE_TAG: '7',
  /** Price-band covenant: mint/burn build sets ports 30/20/21/23/24 + 40/41 (rates read from the state coin) + 99 (tag). */
  TEST_MINT_BURN_PRICE_BAND: true,
  /** Minified scripts/priceband_covenant_usdw.kiss. newscript => 0x99F107D4…. */
  TEST_MINT_BURN_COVENANT_SCRIPT:
    'LET op = STATE(30) LET amt = STATE(20) LET coll = STATE(23) LET recipient = STATE(21) LET covleft = STATE(24) LET ratemint = STATE(40) LET rateburn = STATE(41) LET oper = 0x707B0FA189C85B7E3A49B65D8D6B0EA3CB29283347AF4A3FBA4BB4DCD9FBB7FE LET wintok = 0x9A6BB87435126E3972E7EB706500FDF7258D407CD254776A9C5A26EE7FB0AA25 LET covtok = 0x012A638C4098BCB9ED1E4203D95230B927B4CB5B9654CF1FE503EA05D3E893DF IF @TOKENID EQ 0x00 THEN ASSERT SAMESTATE(99 99) ASSERT GETOUTKEEPSTATE(@TOTOUT - 1) EQ TRUE ASSERT ( SAMESTATE(40 40) AND SAMESTATE(41 41) ) OR SIGNEDBY(oper) ELSE ASSERT amt GT 0 ASSERT coll GT 0 ASSERT covleft EQ ( @AMOUNT - amt ) IF op EQ 0 THEN ASSERT @TOKENID EQ covtok ASSERT VERIFYOUT(0 recipient amt covtok FALSE) ASSERT VERIFYOUT(1 @ADDRESS covleft covtok FALSE) ASSERT VERIFYOUT(2 @ADDRESS coll wintok FALSE) ASSERT coll GTE ( amt * ratemint ) ENDIF IF op EQ 1 THEN ASSERT @TOKENID EQ wintok ASSERT VERIFYOUT(0 recipient amt wintok FALSE) ASSERT VERIFYOUT(1 @ADDRESS covleft wintok FALSE) ASSERT VERIFYOUT(2 @ADDRESS coll covtok FALSE) ASSERT amt LTE ( coll * rateburn ) ENDIF ENDIF RETURN ( @INPUT EQ 0 ) OR ( @INPUT EQ 1 )',
  /**
   * Council-side view of the newest MiniDapp. If latestPublishedVersion sorts above APP_BUILD_VERSION,
   * the Council communications page shows criticality + what changed + zip link.
   * To preview the update banner locally, temporarily set APP_BUILD_VERSION lower than latestPublishedVersion.
   * Use the same segment count as APP_BUILD_VERSION so semver-like compare is meaningful.
   */
  APP_UPDATE_POLICY: {
    latestPublishedVersion: '0.0.11.53',
    whenUpdateNeeded: {
      criticality: 'low',
      whatChanged:
        'The coordinated test build includes the current website and app experience plus verified standalone Android updates.',
      details:
        'Install only the release matching the published SHA-256 and Stables signing identity.'
    }
  },
  /**
   * Standalone Android APK updates (GitHub Releases). Bump with every signed APK publish.
   * downloadUrl must be the direct GitHub asset link for Stables_v<version>.apk.
   */
  ANDROID_APK_UPDATE: {
    /** SHA-256 and signer fingerprint are filled from the exact signed artifact before publication. */
    latestVersion: '0.0.11.53',
    versionCode: 11053,
    expectedPackageName: 'org.stablescouncil.stables',
    downloadUrl:
      'https://github.com/StablesCouncil/stables-app/releases/download/app-v0.0.11.53/Stables_v0.0.11.53.apk',
    sha256: '19f4497f233608815d1b181df865b1ec1f089a9beee79c0e6107c264fa7cf592',
    signerSha256: 'dabb1b2a79b134b6008e6401735d649c140b51f2c4a83eb001b2ffdad5ce5dd4',
    releasesPageUrl: 'https://github.com/StablesCouncil/stables-app/releases',
    /** Dedicated immutable-shape metadata used by hardened standalone builds. */
    remoteManifestUrl: 'https://stablescouncil.org/releases/android-update.json',
    /** Live config the app fetches to detect newer APKs (standalone Android only). */
    remoteConfigUrl:
      'https://stablescouncil.org/dapp/3-test/assets/config/runtime-config.js'
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
  RESET_VAULT_KEY_CONFIRMATION_ON_EACH_LOAD: false,
  /** After confirming, user chose whether to allow occasional soft reminders: 'yes' | 'no'. */
  VAULT_PERIODIC_REMINDER_PREF_KEY: 'stables_vault_periodic_reminder_pref_v1',
  /** Last time we showed a soft Vault reminder (when pref is yes). */
  VAULT_SOFT_REMINDER_LAST_KEY: 'stables_vault_soft_reminder_last_ts_v1',
  /** Days between soft reminders when user opted in. */
  VAULT_SOFT_REMINDER_INTERVAL_DAYS: 60,
  /**
   * Winiwa faucet (Get 1,000 in test / 10,000 in demo): minimum milliseconds between successful claims. Default 1 hour.
   * Storage key for last claim time: FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY.
   */
  FAUCET_WINIWA_COOLDOWN_MS: 3600000,
  // GENESIS-2 (2026-07-05): bumped v1 -> g2 to clear any stale pre-reissue cooldown timestamp that
  // was showing a phantom "next claim in…" with no recent claim.
  FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY: 'stables_test_faucet_winiwa_last_claim_tv81',
  /** Public test MiniDapp package download (target URL; not published until Council approves the test zip). */
  MDS_ZIP_URL: 'https://stablescouncil.org/dapp/3-test/build/Stables_v0.0.10.83.mds.zip',
  /**
   * Feedback page → Demo roadmap block (More → Feedback). Bump on every publish so reviewers
   * see the current build label, review focus, and next modules. Keep aligned with CHANGELOG.
   */
  DEMO_FEEDBACK_ROADMAP: {
    summary:
      'This is the 0.0.1 test channel: on-chain Winiwa faucet, market-rated USDw mint/burn, on-chain Winiwa/USDw send/receive, and a demo-hardened wallet/activity UI. Winiwa stands in for Minima; USDw is a valueless test stable. Demo features (payment protection tiers, themes, biometric unlock, settings auto-save) are present but operate on test tokens only.',
    nowReview:
      'Trustless Winiwa faucet, USDw mint/burn covenant, xWiniwa mint/burn covenant, Winiwa/USDw/xWiniwa on-chain transfers, wallet balance reconciliation, activity/transaction rows, three-platform parity, test-channel copy and onboarding',
    comingSoon:
      'Public test .mds.zip and APK publish, structured bug reports, faucet pool monitoring',
    nextModules:
      'DEX orderbook and Coverage Fund remain deferred out of test v1 per Council policy',
    footnote:
      'Use the form below for concept, financial, and technical comments. Report bugs and test-channel regressions here.'
  },
  /**
   * Stables Charter on GitHub (Markdown). Governing text for how the Council and community run the protocol.
   * Leave empty until the charter is actually published — an empty value shows the "coming soon" modal.
   * Point this at the published file in your org repo when it is live.
   */
  STABLES_CHARTER_URL: '',
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
   * If true and `window.MDS` exists: StablesAgent FAB / menu / explain buttons use `window.open` to the agent URL.
   * Default false: use the in-app side drawer only (avoids an extra browser tab on top of the drawer).
   * Set true only if the agent iframe is blocked on your Minima / WebView host.
   */
  STABLES_AGENT_OPEN_EXTERNAL_WHEN_MDS: false,
  /**
   * Public StablesAgent chat. `XR4-04`: this was pointed at `http://127.0.0.1:8080/chat`, a local
   * development override, which is unreachable on any device that is not the developer's laptop.
   * The release build must name the real public host. For local chat work, override this value in a
   * scratch copy rather than committing the loopback address to the channel again.
   */
  AGENT_URL: 'https://agent.stablescouncil.org/chat',
  /**
   * When true: on origins that need Connect node, open the connection screen after load.
   * The active app keeps this false because the persistent app-wide status banner is the clearer entry point.
   */
  AUTO_OPEN_CONNECT_NODE_ON_LAUNCH: false,
  /** Milliseconds after window `load` before attempting auto-open when welcome is not open. */
  AUTO_OPEN_CONNECT_NODE_DELAY_MS: 1200,
  /** Milliseconds after welcome closes before attempting auto-open (staggered from Vault backup scheduling). */
  AUTO_OPEN_CONNECT_NODE_AFTER_WELCOME_MS: 1800,
  /**
   * MEXC ticker for MINIMA/USDT — presentation / treasury display feed (CoinGecko banned).
   * Settlement (mint, burn, CLOB fill, covenants) must NOT use this for amounts — presentation only.
   * With MDS, `MDS.net.GET` hits this URL; in a normal browser the app prefers the same-origin
   * presentation proxy (see PRESENTATION_MEXC_PROXY_PATH) then falls back to a direct fetch.
   */
  MEXC_TICKER_URL: 'https://api.mexc.com/api/v3/ticker/24hr?symbol=MINIMAUSDT',
  /**
   * Presentation-only rates for wallet totals and row ≈ lines. Settlement paths ignore these.
   * When true, the wallet sums the multi-currency portfolio into the primary using MEXC Winiwa
   * USD (live or last-good cache) plus the seeded fiat FX table.
   *
   * XR1-04, set false 2026-08-01. This applied the live MEXC **Minima** spot to **Winiwa**, so the
   * Mint page read "Winiwa price $0.00424" for a token that has no value and no market. A dollar
   * figure on the release's primary money screen is a claim, and that claim is not true. The fiat
   * display currencies it also priced were removed under XR1-03, so the only thing left for it to
   * do was mis-price the two test assets. Winiwa and xWiniwa still convert to each other at the
   * protocol par of 1, which is covenant truth rather than a market rate, so wallet totals still
   * work. Turn back on only when a real, honest price exists for the asset being shown.
   */
  PRESENTATION_RATES_ENABLED: false,
  /**
   * Same-origin path served by the local preview server (serve-local.mjs) so the browser can
   * load MEXC without CORS. Empty string disables the proxy attempt.
   */
  PRESENTATION_MEXC_PROXY_PATH: '/__stables/presentation/mexc-minima',
  /**
   * Minima explorer base URL for transaction links.
   * Expected format: `${base}${txId}` (example: https://explorer.minima.global/search?q=).
   */
  MINIMA_EXPLORER_TX_BASE_URL: 'https://explorer.minima.global/search?q=',
  /**
   * Minima explorer base URL for address (wallet) pages.
   * Expected format: `${base}${address}` (example: https://explorer.minima.global/address/).
   */
  MINIMA_EXPLORER_ADDRESS_BASE_URL: 'https://explorer.minima.global/address/',
  /** Public Council treasury Minima address (test channel: no live treasury yet). */
  COUNCIL_TREASURY_MINIMA_ADDRESS: '',
  /** How often to refresh spot price for Treasury stress slider (ms). */
  WINIWA_PRICE_POLL_MS: 120000,
  /**
   * When true (default), Mint/Burn vault actions skip Council Executive role  -  for browser/local demo.
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
        title: 'Test channel v0.0.1.206 in development',
        date: '2026-06-23',
        body:
          'Test channel is the active development line. Trustless Winiwa faucet, market-rated USDw mint/burn, on-chain xWiniwa mint/burn, and Winiwa/USDw/xWiniwa transfers are live on mainnet Test11. Demo will be marked superseded once the test zip/APK parity gate passes.'
      },
      {
        title: 'Demo channel frozen',
        date: '2026-06-23',
        body:
          'Demo v0.0.0.3.52 is the last demo line build and is now frozen. New work happens on the test channel only; production mapping (Winiwa → Minima, real token minting) is a future phase.'
      },
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
    'Soft-hidden transactions and hidden merchants (local test)',
    'Activity search state and test-only metadata',
    'stables_test_wallet_v1 (browser test wallet balances)',
    'stables_test_exchange_hist_v1 (browser test exchange history)',
    'stables_faucet_winiwa_last_claim_ts_v1 (Winiwa faucet cooldown)'
  ]
};
