import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const naviPath = path.join(root, "navi_items.json");
const current = JSON.parse(fs.readFileSync(naviPath, "utf8"));
const previous = new Map((current.items || []).map((item) => [item.id, item]));
const today = "2026-05-04";

const dashboardSuccessMetrics = new Set([
  "x_followers",
  "x_engagement_actions",
  "instagram_followers",
  "instagram_engagement_actions",
  "telegram_community_members",
  "telegram_community_messages",
  "telegram_council_members",
  "telegram_council_post_views",
  "telegram_council_reactions",
  "telegram_council_comments_or_replies",
  "facebook_page_followers",
  "facebook_group_members",
  "youtube_subscribers",
  "youtube_recent_views",
  "tiktok_followers",
  "twitch_followers",
  "moltbook_followers",
  "discord_members",
  "discord_council_thread_participants",
  "discord_council_messages",
  "council_questions_submitted",
  "council_role_interest_signals",
  "interested_ambassadors",
  "ambassador_topic_activity",
  "ambassador_questions_collected",
  "showcase_feedback_total",
  "showcase_feedback_new",
  "github_feedback_total",
  "github_feedback_open",
  "feedback_items_routed_to_tracker",
  "agent_telegram_questions",
  "agent_web_questions",
  "agent_total_questions",
  "agent_answer_gaps",
  "agent_feedback_items",
  "merchant_directory_listings",
  "merchant_payment_requests_created",
  "merchant_validations_issued",
  "merchant_reviews_submitted",
]);

const categories = [
  "Community Communication And Feedback",
  "Dapp Channels And Development Infrastructure",
  "Wallet And User Banking",
  "Mint, Burn And Token Scope",
  "Invest And Coverage Fund",
  "Merchant Banking Tools",
  "Community, Communications And Support Surfaces",
  "Protocol Mechanics And Solvency",
  "Merchant Network Economics",
  "Ambassadors And Cluster Growth",
  "Council Formation And Handover",
  "Destinations"
];

const categoryDescriptions = {
  "Dapp Channels And Development Infrastructure": "Dapp stage structure, repository/folder organization, development tools, secured environment, deployment verification, node connection model, and release packaging.",
  "Wallet And User Banking": "User wallet flows, balances, send/receive, activity, contacts, settings, and daily banking UX.",
  "Mint, Burn And Token Scope": "Demo-only assets, test tokens, production stablecoins, xMinima, and mint/burn discipline as the first peg-maintenance control after wallet visibility.",
  "Merchant Banking Tools": "Merchant-facing app functionality: shops, invoices, QR/payment requests, profiles, ramp UX, and point-of-sale path.",
  "Invest And Coverage Fund": "Invest UI, Coverage Fund, cf tokens, liquidity fund language, yield/risk display, and illustrative values.",
  "Community, Communications And Support Surfaces": "In-app communications, feedback, help, academy, links, legal, profile, settings, and security surfaces that support users and Council coordination.",
  "Protocol Mechanics And Solvency": "Peg maintenance controls: locked mechanics, Minima L1 settlement truth and prototype instant-payment evaluation, balance sheet, fee economics signed-state rules, xMinima, solvency, oracles, and truth maintenance.",
  "Merchant Network Economics": "Merchant network soundness, local liquidity, entry logic, circulation, settlement, treasury interactions, and money velocity.",
  "Ambassadors And Cluster Growth": "Ambassador and merchant cell growth, cluster spark, Cluster Challenge, and local accepting networks.",
  "Community Communication And Feedback": "Public surfaces, content runway, feedback, releases, review quests, StablesAgent learning, and tester participation.",
  "Council Formation And Handover": "Charter, Council as community achievement, seat/voting design, parameter governance, handover, and custody.",
  "Destinations": "Long-term technical, financial, and community destinations."
};

const progressReviewScale = {
  "Technical Stream": 0.346,
  "Financial Stream": 0.315,
  "Community Stream": 0.369
};

const link = {
  demoPlan: { label: "Community demo plan", path: "1_development/stream_1_app/website/dapp/COMMUNITY_DEMO_DEVELOPMENT_PLAN.md" },
  demoTracker: { label: "Community demo tracker", path: "1_development/stream_1_app/website/dapp/COMMUNITY_DEMO_TASK_TRACKER.md" },
  versioning: { label: "MiniDapp versioning", path: "1_development/stream_1_app/website/dapp/MINIDAPP_VERSIONING.md" },
  porting: { label: "Channel porting ledger", path: "1_development/stream_1_app/website/dapp/PORTING_GAP.md" },
  uiInventory: { label: "App UI inventory", path: "1_development/stream_1_app/work/docs/ui_inventory/app_ui_inventory.md" },
  mechanics: { label: "Protocol mechanics spec", path: "0_handshake/protocol_mechanics_spec.md" },
  masterRef: { label: "Master reference", path: "0_handshake/stables_master_reference.md" },
  charter: { label: "Charter", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md" },
  charterCompanion: { label: "Charter companion", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter_companion.md" },
  currentPath: { label: "Current state and path", path: "2_current/stream_3_governance/prod_protocol_specs/current_state_and_path.md" },
  linksDoc: { label: "Official links", path: "0_handshake/links.md" },
  contentStrategy: { label: "Content strategy", path: "2_current/stream_3_governance/task_dev_utils/plan/multi_platform_content_strategy.md" },
  toneGuide: { label: "Tone guide", path: "2_current/stream_3_governance/task_dev_utils/plan/platform_tone_guide.md" },
  ambassador: { label: "Ambassador proposition", path: "1_development/stream_2_community/task_ambassador_proposition/ambassador_framework_proposition.md" },
  showcaseDapp: { label: "Showcase Dapp", url: "dapp/1-showcase/" },
  showcaseWallet: { label: "Showcase Dapp wallet screen", url: "dapp/1-showcase/#wallet" },
  demoDapp: { label: "Demo Dapp", url: "dapp/2-demo/" },
  demoWallet: { label: "Demo Dapp wallet screen", url: "dapp/2-demo/#wallet" },
  demoActivity: { label: "Demo Dapp activity screen", url: "dapp/2-demo/#activity" },
  demoContacts: { label: "Demo Dapp contacts screen", url: "dapp/2-demo/#contacts" },
  demoInvest: { label: "Demo Dapp invest screen", url: "dapp/2-demo/#invest" },
  demoMint: { label: "Demo Dapp mint screen", url: "dapp/2-demo/#mint" },
  demoExchange: { label: "Demo Dapp exchange screen", url: "dapp/2-demo/#exchange" },
  demoRamp: { label: "Demo Dapp on/off ramp screen", url: "dapp/2-demo/#onoff-ramp" },
  demoMerchants: { label: "Demo Dapp merchant directory", url: "dapp/2-demo/#spend" },
  demoAmbassador: { label: "Demo Dapp ambassador screen", url: "dapp/2-demo/#ambassador" },
  demoMyShop: { label: "Demo Dapp My shop screen", url: "dapp/2-demo/#my-shop" },
  demoInvoice: { label: "Demo Dapp invoice screen", url: "dapp/2-demo/#invoice" },
  demoChat: { label: "Demo Dapp chat screen", url: "dapp/2-demo/#chat" },
  demoCouncilComms: { label: "Demo Dapp Council communications screen", url: "dapp/2-demo/#council-comms" },
  demoCouncil: { label: "Demo Dapp Council screen", url: "dapp/2-demo/#council" },
  demoTreasury: { label: "Demo Dapp treasury screen", url: "dapp/2-demo/#treasury" },
  demoFaucet: { label: "Demo Dapp faucet screen", url: "dapp/2-demo/#faucet" },
  demoProfile: { label: "Demo Dapp profile screen", url: "dapp/2-demo/#settings-profile" },
  demoSettingsUpdates: { label: "Demo Dapp settings and updates screen", url: "dapp/2-demo/#settings-updates" },
  demoSecurity: { label: "Demo Dapp security screen", url: "dapp/2-demo/#settings-security" },
  demoLegal: { label: "Demo Dapp legal screen", url: "dapp/2-demo/#settings-legal" },
  demoFeedback: { label: "Demo Dapp feedback screen", url: "dapp/2-demo/#feedback" },
  demoAcademy: { label: "Demo Dapp Academy screen", url: "dapp/2-demo/#help-academy" },
  demoOfficialLinks: { label: "Demo Dapp official links screen", url: "dapp/2-demo/#help-links" },
  testDapp: { label: "Test Dapp channel status", url: "dapp/3-test/" },
  prodDapp: { label: "Prod Dapp channel status", url: "dapp/4-prod/" },
  ambassadorProgram: { label: "Ambassador Program", url: "ambassadorsprogramdesc.html" },
  ambassadorProgramPurpose: { label: "Ambassador Program purpose", url: "ambassadorsprogramdesc.html#section-1" },
  ambassadorProgramRoles: { label: "Ambassador and merchant roles", url: "ambassadorsprogramdesc.html#section-2" },
  ambassadorProgramEconomics: { label: "Ambassador Program economics", url: "ambassadorsprogramdesc.html#section-4" },
  ambassadorProgramMerchantChoice: { label: "Merchant choice and listing", url: "ambassadorsprogramdesc.html#section-5" },
  ambassadorProgramPaths: { label: "Ambassador onboarding paths", url: "ambassadorsprogramdesc.html#section-6" },
  ambassadorProgramService: { label: "Ambassador service lifecycle", url: "ambassadorsprogramdesc.html#section-7" },
  ambassadorProgramPlatform: { label: "Ambassador platform tools", url: "ambassadorsprogramdesc.html#section-9" },
  ambassadorProgramTreasury: { label: "Ambassador treasury flow", url: "ambassadorsprogramdesc.html#section-11" },
  telegramCommunity: { label: "Telegram Community", url: "https://t.me/stablescommunity" },
  telegramCouncil: { label: "Telegram Council Official", url: "https://t.me/StablesCouncilOfficial" },
  discord: { label: "Discord working groups", url: "https://discord.gg/rTdqwRGPXR" },
  xProfile: { label: "X / StablesCouncil", url: "https://x.com/StablesCouncil" },
  instagramProfile: { label: "Instagram / stablescouncil", url: "https://www.instagram.com/stablescouncil" },
  facebookPage: { label: "Facebook page", url: "https://www.facebook.com/share/16nCLsLHkg/" },
  facebookGroup: { label: "Facebook community group", url: "https://www.facebook.com/groups/stablescommunity" },
  youtubeProfile: { label: "YouTube / StablesCouncil", url: "https://www.youtube.com/@StablesCouncil" },
  tiktokProfile: { label: "TikTok / stablescouncil", url: "https://www.tiktok.com/@stablescouncil" },
  twitchProfile: { label: "Twitch / stablescouncil", url: "https://www.twitch.tv/stablescouncil" },
  githubOrg: { label: "StablesCouncil GitHub", url: "https://github.com/StablesCouncil" },
  securityTelegram: { label: "Telegram Security Support", url: "https://t.me/StablesSecuritySupport" },
  websiteHome: { label: "Stables website", url: "index.html" },
  websiteMerchants: { label: "Website merchant section", url: "index.html#merchants" },
  websiteWallet: { label: "Website wallet section", url: "index.html#wallet" },
  websiteGrowth: { label: "Website growth section", url: "index.html#growth" },
  websiteNextStep: { label: "Website next step section", url: "index.html#deck-next" },
  websiteLinks: { label: "Public links page", url: "links.html" },
  websiteDappLinks: { label: "Public Dapp release path", url: "links.html#sec-dapp" },
  websiteCommunityLinks: { label: "Public community links", url: "links.html#sec-community" },
  websiteCouncilLinks: { label: "Public Council links", url: "links.html#sec-council" },
  communicationPlanPage: { label: "Public communication plan", url: "communication_plan.html" },
  bankingSystem: { label: "Website banking system explainer", url: "bankingsystem.html" },
  circularEconomy: { label: "Website circular economy map", url: "circulareconomy.html" },
  playingField: { label: "Website structural playing field", url: "playing_field.html" },
  onchainWatch: { label: "Website Minima on-chain watch", url: "onchain-watch.html" },
  charterCore: { label: "Charter draft (internal - public shortly): Article II monetary core invariants", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-ii--monetary-core-invariant-foundation" },
  charterLayers: { label: "Charter draft (internal - public shortly): Article III layer boundaries", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-iii--structural-layers-and-modularity" },
  charterMerchant: { label: "Charter draft (internal - public shortly): Article IV merchant activation", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-iv--merchant-activation-doctrine-growth-architecture" },
  charterOracle: { label: "Charter draft (internal - public shortly): Article V oracle framework", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-v--oracle-framework" },
  charterTransparency: { label: "Charter draft (internal - public shortly): Article VI transparency", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-vi--transparency-doctrine" },
  charterGovernance: { label: "Charter draft (internal - public shortly): Article VII Council role and limits", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-vii--governance-evolution-code-first-structural-limitation" },
  charterAnchoring: { label: "Charter draft (internal - public shortly): Article VIII on-chain anchoring", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-viii--on-chain-anchoring" },
  charterDestinations: { label: "Charter draft (internal - public shortly): Article I three destinations", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#article-i--mission-and-three-destinations" },
  charterMathAnnex: { label: "Charter draft (internal - public shortly): Annex A mathematical definitions", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#annex-a--mathematical-annex" },
  charterRiskAnnex: { label: "Charter draft (internal - public shortly): Annex B risk review", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#annex-b--risk-review-and-mitigation-framework" },
  charterGovernanceAnnex: { label: "Charter draft (internal - public shortly): Annex C governance transition", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#annex-c--governance-transition-roadmap" },
  charterAnchoringAnnex: { label: "Charter draft (internal - public shortly): Annex D anchoring protocol", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter.md#annex-d--anchoring-protocol-specification" },
  charterCompanionFounding: { label: "Charter companion (internal): founding decisions and Council limits", path: "2_current/stream_3_governance/prod_stables_charter/stables_charter_companion.md#3-foundational-decisions-taken" },
  /** Extended charter draft (internal governance papers) — L1 truth, Instant Balance, Omnia evaluation, fee integrity */
  charterFeeIntegrity210: { label: "Charter draft (extended internal): Article II.10 no trusted balances and fee integrity", path: "1_development/stream_3_governance/prod_governance_papers/stables_charter.md#ii10-no-trusted-balances-and-fee-integrity" },
  charterOmniaEval335: { label: "Charter draft (extended internal): Article III.3.5 Omnia and Instant Balance evaluation", path: "1_development/stream_3_governance/prod_governance_papers/stables_charter.md#iii35-payment-capacity-instant-balance-and-omnia-evaluation" },
  charterAnnexEOmnia: { label: "Charter draft (extended internal): Annex E payment capacity and Omnia handover", path: "1_development/stream_3_governance/prod_governance_papers/stables_charter.md#annex-e--payment-capacity-instant-balance-and-omnia-handover" },
  paymentCapacityOmniaHandover: { label: "Payment capacity, Omnia, Instant Balance handover", path: "1_development/stream_3_governance/prod_governance_papers/stables_payment_capacity_omnia_instant_balance_handover.md" },
  review: { label: "Navi card inventory review", path: "1_development/stream_1_app/website/navi_card_inventory_review.md" }
};

function mergeLinks(...groups) {
  const seen = new Set();
  return groups.flat().filter(Boolean).filter((item) => {
    const key = item.url || item.path || item.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function publicLinksOnly(items) {
  return items.filter((item) => item.url);
}

function socialProfileLinks() {
  return [
    link.telegramCommunity,
    link.telegramCouncil,
    link.discord,
    link.githubOrg,
    link.xProfile,
    link.instagramProfile,
    link.facebookPage,
    link.facebookGroup,
    link.youtubeProfile,
    link.tiktokProfile,
    link.twitchProfile
  ];
}

function isSocialLink(item) {
  return !!item?.url && socialProfileLinks().some((social) => social.url === item.url);
}

function isLocalUrl(item) {
  return !!item?.url && !/^https?:\/\//i.test(item.url);
}

function charterLinksFor(input) {
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  const id = input.id || "";
  const paymentCharterLinks = [link.charterFeeIntegrity210, link.charterOmniaEval335, link.charterAnnexEOmnia, link.paymentCapacityOmniaHandover];
  if (id === "financial-minima-l1-settlement-and-omnia-prototype-eval") {
    return mergeLinks(paymentCharterLinks, [link.charterCore, link.charterLayers, link.charterOracle, link.charterRiskAnnex, link.mechanics, link.currentPath]);
  }
  if (id === "technical-main-instant-balance-surfaces") {
    return mergeLinks(paymentCharterLinks, [link.charterLayers, link.charterTransparency, link.uiInventory]);
  }
  if (id === "financial-protocol-truth-guard") {
    return mergeLinks(paymentCharterLinks, [link.charterCore, link.charterOracle, link.charterGovernance, link.mechanics]);
  }
  if (id === "financial-fee-economics") {
    return mergeLinks(paymentCharterLinks, [link.charterCore, link.charterTransparency, link.charterGovernance, link.mechanics]);
  }
  if (id === "technical-demo-minima-wallet-baseline") {
    return mergeLinks(paymentCharterLinks, [link.charterLayers, link.charterTransparency, link.charterRiskAnnex]);
  }
  if (id === "technical-merchant-pos-path") {
    return mergeLinks(paymentCharterLinks, [link.charterMerchant, link.charterLayers, link.charterRiskAnnex, link.charter]);
  }
  if (id === "technical-smart-contract-specification-package") {
    return mergeLinks(paymentCharterLinks, [link.charterCore, link.charterOracle, link.charterRiskAnnex, link.currentPath]);
  }
  if (/oracle|price feed|integrity gate/i.test(title)) return [link.charterOracle, link.charterCore, link.charterMathAnnex, link.charterRiskAnnex];
  if (/mathematical|stress model|stress scenario|formula|backing ratio|redemption formula/i.test(title)) return [link.charterMathAnnex, link.charterCore, link.charterTransparency, link.charterRiskAnnex];
  if (/risk matrix|response boundar|mitigation|monitoring metrics/i.test(title)) return [link.charterRiskAnnex, link.charterTransparency, link.charterGovernance];
  if (/governance transition|timelock|approval threshold|seat composition|time-weighted/i.test(title)) return [link.charterGovernance, link.charterGovernanceAnnex, link.charterCompanionFounding, link.charterRiskAnnex];
  if (/anchoring|Integritas|hash|verification|canonical document/i.test(title)) return [link.charterAnchoring, link.charterAnchoringAnnex, link.charterGovernance, link.charterRiskAnnex];
  if (/smart contract|contract specification|audit boundary/i.test(title)) return [link.charterCore, link.charterLayers, link.charterOracle, link.charterRiskAnnex];
  if (input.category === "Destinations") return [link.charterDestinations, link.charterGovernance, link.charterRiskAnnex];
  if (input.category === "Protocol Mechanics And Solvency") return [link.charterCore, link.charterCompanionFounding, link.charterRiskAnnex];
  if (input.category === "Mint, Burn And Token Scope") return [link.charterCore, link.charterTransparency, link.charterRiskAnnex];
  if (input.category === "Merchant Banking Tools" || input.category === "Merchant Network Economics") return [link.charterMerchant, link.charterLayers, link.charterRiskAnnex];
  if (input.category === "Ambassadors And Cluster Growth") return [link.charterMerchant, link.charterGovernance, link.charterRiskAnnex];
  if (input.category === "Council Formation And Handover") return [link.charterGovernance, link.charterCompanionFounding, link.charterRiskAnnex];
  if (input.category === "Community Communication And Feedback") return [link.charterTransparency, link.charterGovernance, link.charterRiskAnnex];
  if (input.category === "Community, Communications And Support Surfaces") return [link.charterTransparency, link.charterGovernance, link.charterRiskAnnex];
  if (input.category === "Dapp Channels And Development Infrastructure" || input.category === "Wallet And User Banking") return [link.charterLayers, link.charterTransparency, link.charterRiskAnnex];
  if (input.category === "Invest And Coverage Fund") return [link.charterCore, link.charterLayers, link.charterRiskAnnex];
  return [link.charterLayers, link.charterRiskAnnex];
}

function charterRefsFor(input) {
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  const id = input.id || "";
  const REF_II10 = "Article II.10 - No Trusted Balances And Fee Integrity";
  const REF_III35 = "Article III III.3.5 - Instant Balance And Omnia Evaluation";
  const REF_ANNEX_E = "Annex E - Payment Capacity And Omnia Handover";
  const PAYMENT_LENS_BASE = [REF_II10, REF_III35, REF_ANNEX_E];
  if (id === "financial-minima-l1-settlement-and-omnia-prototype-eval") {
    return [...PAYMENT_LENS_BASE, "Article II - Monetary Core", "Article III - Structural Layers", "Article V - Oracle Framework"];
  }
  if (id === "technical-main-instant-balance-surfaces") {
    return [...PAYMENT_LENS_BASE, "Article III - Structural Layers", "Article VI - Transparency Doctrine"];
  }
  if (id === "financial-protocol-truth-guard") {
    return [...PAYMENT_LENS_BASE, "Article II - Monetary Core", "Article V - Oracle Framework", "Article VII - Governance Boundaries"];
  }
  if (id === "financial-fee-economics") {
    return [...PAYMENT_LENS_BASE, "Article II - Monetary Core", "Article VI - Transparency Doctrine", "Article VII - Governance Boundaries"];
  }
  if (id === "technical-demo-minima-wallet-baseline") {
    return [...PAYMENT_LENS_BASE, "Article III - Structural Layers", "Article VI - Transparency Doctrine"];
  }
  if (id === "technical-merchant-pos-path") {
    return [...PAYMENT_LENS_BASE, "Article IV - Merchant Activation", "Article III - Structural Layers"];
  }
  if (id === "technical-smart-contract-specification-package") {
    return [...PAYMENT_LENS_BASE, "Article II - Monetary Core", "Article III - Structural Layers", "Article V - Oracle Framework", "Annex B - Risk Review"];
  }
  if (/oracle|price feed|integrity gate/i.test(title)) return ["Article V - Oracle Framework", "Annex A - Mathematical Definitions", "Annex B - Risk Review"];
  if (/mathematical|stress model|stress scenario|formula|backing ratio|redemption formula/i.test(title)) return ["Annex A - Mathematical Definitions", "Article II - Monetary Core", "Article VI - Transparency Doctrine"];
  if (/risk matrix|response boundar|mitigation|monitoring metrics/i.test(title)) return ["Annex B - Risk Review", "Article VI - Transparency Doctrine", "Article VII - Governance Boundaries"];
  if (/governance transition|timelock|approval threshold|seat composition|time-weighted/i.test(title)) return ["Annex C - Governance Transition", "Article VII - Governance Boundaries", "Article VIII - On-Chain Anchoring"];
  if (/anchoring|Integritas|hash|verification|canonical document/i.test(title)) return ["Article VIII - On-Chain Anchoring", "Annex D - Anchoring Protocol", "Article VII - Governance Boundaries"];
  if (/smart contract|contract specification|audit boundary/i.test(title)) return ["Article II - Monetary Core", "Article III - Structural Layers", "Article V - Oracle Framework", "Annex B - Risk Review"];
  if (input.category === "Destinations") return ["Article I - Mission And Three Destinations", "Article VII - Governance Boundaries"];
  if (input.category === "Protocol Mechanics And Solvency") return ["Article II - Monetary Core", "Article V - Oracle Framework", "Article VII - Governance Boundaries"];
  if (input.category === "Mint, Burn And Token Scope") return ["Article II - Monetary Core", "Article VI - Transparency Doctrine"];
  if (input.category === "Merchant Banking Tools" || input.category === "Merchant Network Economics") return ["Article IV - Merchant Activation", "Article III - Structural Layers"];
  if (input.category === "Ambassadors And Cluster Growth") return ["Article IV - Merchant Activation", "Article VII - Governance Boundaries"];
  if (input.category === "Council Formation And Handover") return ["Article VII - Governance Boundaries", "Article VIII - On-Chain Anchoring"];
  if (input.category === "Community Communication And Feedback") return ["Article VI - Transparency Doctrine", "Article VII - Governance Boundaries"];
  if (input.category === "Community, Communications And Support Surfaces") return ["Article VI - Transparency Doctrine", "Article VII - Governance Boundaries"];
  if (input.category === "Dapp Channels And Development Infrastructure" || input.category === "Wallet And User Banking") return ["Article III - Structural Layers", "Article VI - Transparency Doctrine"];
  if (input.category === "Invest And Coverage Fund") return ["Article II - Monetary Core", "Article III - Structural Layers"];
  return ["Article III - Structural Layers"];
}

const dappPageRef = {
  wallet: "Wallet - balance/actions, currencies, recent activity",
  chat: "Chat - conversation, send private message",
  shops: "Shops - merchant rows, list shop, ambassador CTA",
  mint: "Mint - xWiniwa, Wables, mint/burn panels",
  invest: "Invest - holdings, Coverage Fund, liquidity funds",
  activity: "Activity - filters, history, transaction details",
  contacts: "Contacts - contact list, notes, contact detail",
  exchange: "Exchange - conversion, recent exchanges, liquidity CTA",
  ramp: "On/Off Ramp - where MINIMA trades, on-ramp, off-ramp",
  faucet: "Get Winiwa - claim Winiwa, reset balances",
  feedback: "Feedback - structured public feedback, GitHub, Telegram",
  council: "Council - Charter, budget, voting power, resolutions",
  councilComms: "Council communications - updates, security, critical notices",
  treasury: "Treasury - liabilities, concentration, trading depth, stress test",
  myShop: "My shop - listing, invoice, QR, API kit, sticker",
  invoice: "Create Invoice - payment request, merchant QR",
  ambassador: "Ambassadors - listing model, retrocession, join discussion",
  settingsUpdates: "Settings and updates - app updates, appearance, display, addresses, sync",
  profile: "My profile - Council identity, avatar, NFT fields",
  security: "Security - vault key, seed, Security app CTA",
  legal: "Legal and notices - terms, oracle notices, privacy, data, security",
  helpLinks: "All links - official domains, GitHub, emails, socials",
  welcome: "Welcome and channel selector - showcase notice, version, sync",
  academy: "Help and Academy - tours, education, guided explanations"
};

function dappRefsFor(input) {
  const refs = new Set();
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  const id = input.id || "";

  if (id === "financial-minima-l1-settlement-and-omnia-prototype-eval") {
    refs.add(dappPageRef.treasury);
    refs.add(dappPageRef.wallet);
    refs.add(dappPageRef.activity);
  }
  if (id === "technical-main-instant-balance-surfaces") {
    refs.add(dappPageRef.wallet);
    refs.add(dappPageRef.activity);
    refs.add(dappPageRef.legal);
  }

  if (input.category === "Wallet And User Banking") refs.add(dappPageRef.wallet);
  if (input.category === "Mint, Burn And Token Scope") refs.add(dappPageRef.mint);
  if (input.category === "Invest And Coverage Fund") refs.add(dappPageRef.invest);
  if (input.category === "Merchant Banking Tools") refs.add(dappPageRef.shops);
  if (input.category === "Merchant Banking Tools") refs.add(dappPageRef.myShop);
  if (input.category === "Merchant Network Economics") refs.add(dappPageRef.shops);
  if (input.category === "Merchant Network Economics") refs.add(dappPageRef.exchange);
  if (input.category === "Community Communication And Feedback") refs.add(dappPageRef.feedback);
  if (input.category === "Community, Communications And Support Surfaces") refs.add(dappPageRef.councilComms);
  if (input.category === "Community, Communications And Support Surfaces") refs.add(dappPageRef.feedback);
  if (input.category === "Ambassadors And Cluster Growth") refs.add(dappPageRef.ambassador);
  if (input.category === "Ambassadors And Cluster Growth") refs.add(dappPageRef.shops);
  if (input.category === "Council Formation And Handover") refs.add(dappPageRef.council);
  if (input.category === "Council Formation And Handover") refs.add(dappPageRef.councilComms);
  if (input.category === "Dapp Channels And Development Infrastructure") refs.add(dappPageRef.welcome);
  if (input.category === "Dapp Channels And Development Infrastructure") refs.add(dappPageRef.helpLinks);
  if (input.category === "Protocol Mechanics And Solvency") refs.add(dappPageRef.treasury);
  if (input.category === "Destinations") refs.add(dappPageRef.council);

  if (/wallet|banking|balance|send|receive/i.test(title)) refs.add(dappPageRef.wallet);
  if (/activity|transaction/i.test(title)) refs.add(dappPageRef.activity);
  if (/contact/i.test(title)) refs.add(dappPageRef.contacts);
  if (/chat|message/i.test(title)) refs.add(dappPageRef.chat);
  if (/mint|burn|token|easter|test channel/i.test(title)) refs.add(dappPageRef.mint);
  if (/faucet|winiwa/i.test(title)) refs.add(dappPageRef.faucet);
  if (/invest|coverage|fund|xMinima|liquidity|cf tokens/i.test(title)) refs.add(dappPageRef.invest);
  if (/exchange|settlement|local liquidity|secondary market|DEX/i.test(title)) refs.add(dappPageRef.exchange);
  if (/ramp|paper money|bridge|USDT/i.test(title)) refs.add(dappPageRef.ramp);
  if (/merchant|shop|point-of-sale|pos/i.test(title)) refs.add(dappPageRef.shops);
  if (/my shop|merchant wallet|merchant profile|API kit|webhook/i.test(title)) refs.add(dappPageRef.myShop);
  if (/invoice|payment request|QR/i.test(title)) refs.add(dappPageRef.invoice);
  if (/ambassador|cluster|growth|cell/i.test(title)) refs.add(dappPageRef.ambassador);
  if (/feedback|review|quest|farming/i.test(title)) refs.add(dappPageRef.feedback);
  if (/communication|content|presence|agent|knowledge|launch explanation/i.test(title)) refs.add(dappPageRef.councilComms);
  if (/council|governance|charter|handover|seat|voting|risk matrix|transition mechanics/i.test(title)) refs.add(dappPageRef.council);
  if (/treasury|peg|solvency|protocol|fee|balance sheet|oracle|price feed|mathematical|stress model|claim/i.test(title)) refs.add(dappPageRef.treasury);
  if (/settings|preferences|appearance|display|addresses|sync/i.test(title)) refs.add(dappPageRef.settingsUpdates);
  if (/profile|identity|NFT/i.test(title)) refs.add(dappPageRef.profile);
  if (/security|secur|vault|key/i.test(title)) refs.add(dappPageRef.security);
  if (/legal|notices|privacy|data|oracle notices/i.test(title)) refs.add(dappPageRef.legal);
  if (/public|official-links|all links|domain|github|social links|links registry/i.test(title)) refs.add(dappPageRef.helpLinks);
  if (/release|node|MDS|channel|package|dev structure|repository|folder|development infra|tooling|deployment|welcome|version/i.test(title)) refs.add(dappPageRef.welcome);
  if (/anchoring|Integritas|hash|verification|canonical document/i.test(title)) refs.add(dappPageRef.legal);
  if (/academy|help|tour|education/i.test(title)) refs.add(dappPageRef.academy);

  return [...refs];
}

const riskRef = {
  oracle: "Oracle Risk - single-source failure, manipulation, latency",
  liquidity: "Liquidity Risk - shallow secondary markets, xMinima exit constraints",
  marketDepth: "Market Depth Risk - insufficient Minima liquidity for large redemptions",
  earlyVolatility: "Early-Stage Volatility - low collateral base amplifying backing ratio swings",
  governance: "Governance Risk - Council capture, founder dominance, voter apathy",
  smartContract: "Smart Contract Risk - code vulnerabilities, upgrade failures",
  economicAttack: "Economic Attack Vectors - oracle manipulation for profit, deliberate price depression, competitive disruption",
  operational: "Operational Risk - key management, infrastructure failure",
  concentration: "Concentration Risk - large Minima holders exercising disproportionate influence",
  transition: "Transition Risk - dependencies on external systems during the bridge period",
  competitiveAttack: "Competitive Attack - regulatory pressure, merchant disruption, MINIMA price manipulation, FUD campaigns",
  confidence: "Confidence Risk - prolonged loss of merchant and participant confidence"
};

function riskRefsFor(input) {
  const refs = new Set();
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  const add = (...keys) => keys.forEach((key) => refs.add(riskRef[key]));

  if (/financial-minima-l1-settlement-and-omnia-prototype-eval/i.test(title)) add("smartContract", "operational", "liquidity", "transition", "earlyVolatility", "confidence");
  if (/technical-main-instant-balance-surfaces/i.test(title)) add("operational", "smartContract", "confidence");

  if (input.category === "Dapp Channels And Development Infrastructure") add("smartContract", "operational", "transition");
  if (input.category === "Wallet And User Banking") add("operational", "confidence");
  if (input.category === "Mint, Burn And Token Scope") add("oracle", "economicAttack", "earlyVolatility");
  if (input.category === "Invest And Coverage Fund") add("liquidity", "marketDepth", "earlyVolatility");
  if (input.category === "Protocol Mechanics And Solvency") add("oracle", "liquidity", "marketDepth", "earlyVolatility", "economicAttack");
  if (input.category === "Merchant Banking Tools") add("confidence", "competitiveAttack", "operational");
  if (input.category === "Merchant Network Economics") add("liquidity", "marketDepth", "competitiveAttack", "confidence");
  if (input.category === "Ambassadors And Cluster Growth") add("confidence", "competitiveAttack", "concentration");
  if (input.category === "Community Communication And Feedback") add("confidence", "competitiveAttack", "governance");
  if (input.category === "Council Formation And Handover") add("governance", "concentration", "operational");
  if (input.category === "Destinations") add("transition", "governance", "operational", "confidence");

  if (/oracle|price|claim|peg|solvency|mechanics|balance sheet/i.test(title)) add("oracle", "economicAttack");
  if (/mathematical|stress model|backing ratio|redemption formula/i.test(title)) add("earlyVolatility", "marketDepth", "liquidity");
  if (/risk matrix|response boundar|mitigation|monitoring metrics/i.test(title)) add("governance", "operational", "confidence");
  if (/liquidity|settlement|redemption|ramp|exchange|merchant network/i.test(title)) add("liquidity", "marketDepth");
  if (/coverage|fund|xMinima|cf tokens|fee economics/i.test(title)) add("liquidity", "earlyVolatility");
  if (/council|governance|handover|seat|voting|charter/i.test(title)) add("governance", "concentration");
  if (/security|deployment|repository|tooling|node|release|Dapp channel|smart contract/i.test(title)) add("smartContract", "operational", "transition");
  if (/anchoring|Integritas|hash|verification|canonical document/i.test(title)) add("operational", "governance", "smartContract");
  if (/merchant|cluster|ambassador|public|feedback|communication|presence|social/i.test(title)) add("competitiveAttack", "confidence");

  return [...refs].filter(Boolean);
}

function dappLinksFor(input) {
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  if (/feedback|review|quest|farming/i.test(title)) return [link.demoFeedback];
  if (/chat|private message/i.test(title)) return [link.demoChat];
  if (/contact/i.test(title)) return [link.demoContacts];
  if (/activity|transaction history/i.test(title)) return [link.demoActivity];
  if (/settings|profile|preferences|appearance|display|addresses|sync/i.test(title)) return [link.demoSettingsUpdates, link.demoProfile, link.demoSecurity];
  if (/help|academy|guided tour|education/i.test(title)) return [link.demoAcademy, link.demoOfficialLinks];
  if (/omnia prototype|minima l1 settlement|instant payment evaluation/i.test(title)) return [link.demoTreasury, link.demoWallet];
  if (/main instant balance|prepare money|ready to pay|return money/i.test(title)) return [link.demoWallet, link.demoActivity];
  if (/dev structure|repository|folder|development infra|tooling|deployment/i.test(title)) return [link.demoOfficialLinks, link.demoSecurity, link.demoCouncilComms];
  if (/domain|github|social links|links registry|official-links|trust|legal|security/i.test(title)) return [link.demoOfficialLinks, link.demoSecurity];
  if (/protocol|truth|mechanics|fee|solvency|drift/i.test(title)) return [link.demoTreasury, link.demoInvest];
  if (/oracle|mathematical|stress model|smart contract|risk matrix/i.test(title)) return [link.demoTreasury, link.demoInvest, link.demoMint];
  if (/anchoring|Integritas|governance transition|timelock|approval threshold/i.test(title)) return [link.demoCouncil, link.demoLegal, link.demoOfficialLinks];
  if (/channel|runtime|version|release|cycle|MDS|node|porting/i.test(title)) return [(input.appPhases || []).includes("Showcase") ? link.showcaseWallet : link.demoWallet, link.demoOfficialLinks];
  if (/wallet|activity|balance|send|receive/i.test(title)) return [link.demoWallet, link.demoActivity];
  if (/invest|coverage|cf tokens|xMinima|equity|liquidity|fund/i.test(title)) return [link.demoInvest, link.demoTreasury];
  if (/mint|burn|token|faucet|easter|test channel/i.test(title)) return [(input.appPhases || []).includes("Test") ? link.testDapp : link.demoMint, link.demoFaucet];
  if (/ramp|exchange|settlement|local liquidity|soundness/i.test(title)) return [link.demoRamp, link.demoExchange, link.demoMerchants];
  if (/merchant|shop|invoice|point-of-sale|pos/i.test(title)) return [link.demoMyShop, link.demoInvoice, link.demoMerchants];
  if (/ambassador|cluster|growth|cell/i.test(title)) return [link.demoAmbassador, link.demoMerchants];
  if (/communication|content|presence|public|agent|knowledge/i.test(title)) return [link.demoCouncilComms, link.demoOfficialLinks];
  if (/council|charter|handover|seat|voting|governance/i.test(title)) return [link.demoCouncil, link.demoTreasury];
  if (input.id === "technical-sovereign-banking-device") return [link.prodDapp, link.demoWallet];
  if (input.id === "financial-destination") return [link.prodDapp, link.demoTreasury, link.demoInvest];
  if (input.id === "community-destination") return [link.prodDapp, link.demoCouncil, link.demoAmbassador];
  if (input.category === "Community Communication And Feedback") return [link.demoFeedback, link.demoCouncilComms];
  if (input.category === "Community, Communications And Support Surfaces") return [link.demoCouncilComms, link.demoFeedback, link.demoAcademy, link.demoOfficialLinks];
  if ((input.appPhases || []).includes("Demo")) return [link.demoDapp];
  if ((input.appPhases || []).includes("Showcase")) return [link.showcaseDapp];
  return [link.demoDapp];
}

function websiteLinksFor(input) {
  const title = `${input.id || ""} ${input.title || ""} ${input.category || ""}`;
  if (/feedback|communication|content|presence|agent|knowledge|review|quest|farming/i.test(title)) return [link.websiteCommunityLinks, link.websiteCouncilLinks];
  if (/dev structure|repository|folder|development infra|tooling|deployment/i.test(title)) return [link.websiteDappLinks, link.websiteCouncilLinks];
  if (/domain|github|social links|links registry|official-links|trust|legal|security/i.test(title)) return [link.websiteLinks, link.websiteCommunityLinks, link.websiteCouncilLinks];
  if (/protocol|truth|mechanics|fee|solvency|drift/i.test(title)) return [link.circularEconomy, link.playingField];
  if (/oracle|mathematical|stress model|smart contract|risk matrix/i.test(title)) return [link.circularEconomy, link.playingField, link.onchainWatch];
  if (/omnia prototype|minima l1 settlement|instant payment evaluation/i.test(title)) return [link.circularEconomy, link.bankingSystem, link.onchainWatch];
  if (/anchoring|Integritas|governance transition|timelock|approval threshold/i.test(title)) return [link.websiteCouncilLinks, link.playingField, link.onchainWatch];
  if (/channel|runtime|version|release|cycle|MDS|node|porting|test channel/i.test(title)) return [link.websiteDappLinks, link.onchainWatch];
  if (/wallet|activity|balance|send|receive|sovereign banking device/i.test(title)) return [link.websiteWallet, link.bankingSystem];
  if (/invest|coverage|cf tokens|xMinima|equity|liquidity|fund|balance sheet|fee economics|financial system/i.test(title)) return [link.circularEconomy, link.bankingSystem];
  if (/mint|burn|token|faucet|easter/i.test(title)) return [link.circularEconomy, link.websiteDappLinks];
  if (/ramp|exchange|settlement|local liquidity|soundness|merchant network/i.test(title)) return [link.websiteMerchants, link.circularEconomy];
  if (/merchant|shop|invoice|point-of-sale|pos/i.test(title)) return [link.websiteMerchants, link.ambassadorProgramMerchantChoice];
  if (/ambassador network/i.test(title)) return [link.ambassadorProgramPurpose, link.websiteGrowth];
  if (/ambassador and merchant cell|cell model/i.test(title)) return [link.ambassadorProgramRoles, link.ambassadorProgramPaths];
  if (/merchant preparation/i.test(title)) return [link.ambassadorProgramMerchantChoice, link.ambassadorProgramService];
  if (/cluster spark|cluster challenge|unified clusters|global growth/i.test(title)) return [link.ambassadorProgramPlatform, link.websiteGrowth];
  if (/ambassador|cluster|growth|cell/i.test(title)) return [link.ambassadorProgram, link.websiteGrowth];
  if (/council|charter|handover|seat|voting|governance/i.test(title)) return [link.websiteCouncilLinks, link.playingField];
  if (input.category === "Ambassadors And Cluster Growth") return [link.ambassadorProgram, link.websiteGrowth];
  if (input.category === "Community Communication And Feedback") return [link.websiteCommunityLinks, link.websiteCouncilLinks];
  return [link.websiteHome, link.websiteLinks];
}

function socialLinksFor(input) {
  if (input.category === "Council Formation And Handover") return [link.telegramCouncil, link.discord];
  if (input.id === "community-social-profiles-live-registry") return [link.xProfile, link.instagramProfile, link.facebookPage, link.facebookGroup, link.youtubeProfile, link.tiktokProfile, link.twitchProfile, link.telegramCommunity, link.telegramCouncil, link.discord, link.githubOrg];
  if (input.category === "Community Communication And Feedback") return socialProfileLinks();
  return [link.telegramCommunity, link.discord];
}

function assetLinksFor(input) {
  const assets = [];
  if (input.category === "Community Communication And Feedback") {
    assets.push(link.demoFeedback, link.telegramCommunity, link.telegramCouncil, link.discord, link.contentStrategy, link.toneGuide, link.websiteLinks, link.githubOrg);
  }
  if (input.category === "Ambassadors And Cluster Growth") {
    assets.push(link.ambassadorProgram, link.ambassador, link.telegramCommunity, link.discord);
  }
  if (input.category === "Council Formation And Handover") {
    assets.push(link.telegramCouncil, link.discord, link.charter, link.charterCompanion);
  }
  if (input.category === "Merchant Banking Tools" || input.category === "Merchant Network Economics") {
    assets.push(link.ambassadorProgram, link.ambassador, link.telegramCommunity);
  }
  if (input.id === "community-public-presence-reach" || input.id === "community-communication-plan" || input.id === "community-content-phase-runway") {
    assets.push(link.linksDoc, link.xProfile, link.instagramProfile, link.facebookPage, link.facebookGroup, link.youtubeProfile, link.tiktokProfile, link.twitchProfile, link.websiteLinks, link.githubOrg);
  }
  if (input.id === "community-communication-platform-strategy") {
    assets.push(link.communicationPlanPage, link.contentStrategy, link.toneGuide, link.xProfile, link.instagramProfile, link.facebookPage, link.facebookGroup, link.youtubeProfile, link.tiktokProfile, link.twitchProfile);
  }
  if (input.stream === "Technical Stream") {
    assets.push(link.uiInventory, link.versioning, link.githubOrg);
  }
  if (/security|secur|dev environment/i.test(`${input.id || ""} ${input.title || ""}`)) {
    assets.push(link.securityTelegram);
  }
  return assets;
}

function navigationRole(workState) {
  if (workState === "destination") return "destination";
  return workState === "active" ? "active-work" : "later-work";
}

function card(input) {
  const prior = previous.get(input.id) || {};
  const appPhases = input.appPhases || ["Demo"];
  const workState = input.workState || "later";
  const futureOnly = appPhases.every((phase) => phase === "Test" || phase === "Prod");
  const rawProgress = futureOnly || workState === "destination"
    ? 0
    : Number.isFinite(input.progress) ? input.progress : (workState === "active" ? 20 : 0);
  const progress = Number.isFinite(input.reviewedProgress)
    ? input.reviewedProgress
    : Math.round(rawProgress * (progressReviewScale[input.stream] || 1));
  const links = publicLinksOnly(mergeLinks(
    dappLinksFor(input),
    websiteLinksFor(input),
    socialLinksFor(input),
    assetLinksFor(input),
    input.links || prior.links || []
  ));
  const linkGroups = {
    dapp: publicLinksOnly(mergeLinks(dappLinksFor(input))),
    charter: charterLinksFor(input),
    website: publicLinksOnly(mergeLinks(websiteLinksFor(input), assetLinksFor(input).filter((item) => item.url && isLocalUrl(item) && !isSocialLink(item)))),
    socials: publicLinksOnly(mergeLinks(socialLinksFor(input)))
  };
  return {
    id: input.id,
    title: input.title,
    stream: input.stream,
    phase: input.phase || input.title,
    type: input.type || (workState === "destination" ? "destination" : "work-item"),
    status: input.status || (workState === "active" ? "In progress" : workState === "destination" ? "Not started" : "Drafting"),
    progress,
    category: input.category,
    objective: input.objective,
    summary: input.summary || input.objective,
    compactSignal: input.compactSignal || input.category,
    kpis: input.kpis || [],
    dependencies: input.dependencies || [],
    links,
    linkGroups,
    charterRefs: input.charterRefs || charterRefsFor(input),
    dappRefs: input.dappRefs || dappRefsFor(input),
    riskRefs: input.riskRefs || riskRefsFor(input),
    metrics: (input.metrics || prior.metrics || []).filter((metricId) => dashboardSuccessMetrics.has(metricId)),
    lastUpdated: today,
    appPhases,
    streams: input.streams || [input.stream],
    workState,
    navigationRole: input.navigationRole || navigationRole(workState),
    nextStep: input.nextStep || "Define the first pass/fail checkpoint for this card and attach the evidence source that will prove it is done.",
    proof: input.proof || "This card is complete only when its checkpoint has an inspectable output, owner/source, and done/open status.",
    phaseSummary: appPhases.join(" + ")
  };
}

const items = [
  card({ id: "technical-demo-minima-wallet-baseline", title: "Wallet And Activity Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo"], workState: "active", status: "In progress", progress: 45, objective: "Make the Demo wallet and activity pages a reviewable node-connected banking surface.", summary: "Protect the native MINIMA send/receive baseline and connect it to visible balances, recent activity, filters, amount selection, and Demo-only token scope.", compactSignal: "Wallet page baseline", kpis: ["Native MINIMA send / receive baseline protected", "Node-connected state remains visible", "Recent activity and FX entries reviewable", "Activity filters by date / period / timeframe reviewable", "Mint / burn token UI testing is clearly scoped as demo-only"], links: [link.demoTracker, link.versioning], metrics: ["demo_minima_wallet_baseline_verified", "demo_onboarding_message_ready", "send_cleanup_review_state", "fx_activity_visibility_review_state", "activity_filters_review_state", "amount_selector_review_state", "demo_status"], nextStep: "Review the wallet and activity pages together as one Demo banking surface.", proof: "This card is complete only when wallet send/receive, balances, activity entries, filters, and amount-selection behavior can be reviewed together in the Demo." }),
  card({ id: "technical-demo-activity-history-surface", title: "Activity And Transaction History Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo"], workState: "active", status: "Drafting", progress: 20, objective: "Make the Activity page a reviewable transaction-history surface with filters, search, history rows, pagination, and transaction details.", summary: "Give the Dapp Lens Activity page a concrete owner instead of hiding it inside the wallet card.", compactSignal: "Activity page owner", kpis: ["Activity filters reviewable", "Search and history rows reviewable", "Pagination behavior checked", "Transaction detail pattern checked"], dependencies: ["technical-demo-minima-wallet-baseline"], links: [link.demoActivity, link.uiInventory], metrics: ["activity_filters_review_state", "fx_activity_visibility_review_state"], nextStep: "Create the Activity page checklist from filters through transaction detail review.", proof: "This card is complete only when the Activity page can be reviewed independently from the wallet home card." }),
  card({ id: "technical-demo-contacts-surface", title: "Contacts And Notes Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo"], workState: "later", status: "Drafting", progress: 12, objective: "Make the Contacts page reviewable: contact search, contact list, notes, contact detail, and wallet-flow entry points.", summary: "Give contacts and notes their own Dapp page owner so wallet-adjacent identity and recipient management do not disappear inside general wallet work.", compactSignal: "Contacts page owner", kpis: ["Contact search visible", "Contact list visible", "Contact detail state reviewable", "Notes behavior scoped", "Wallet-flow entry path checked"], dependencies: ["technical-demo-minima-wallet-baseline"], links: [link.demoContacts, link.demoActivity, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Contacts page checklist for search, list, detail, notes, and wallet entry points.", proof: "This card is complete only when the Contacts page has a pass/fix/open checklist tied to the Demo Dapp route." }),
  card({ id: "technical-demo-chat-surface", title: "Chat And Private Messages Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo"], workState: "later", status: "Drafting", progress: 10, objective: "Make the Chat page reviewable as a private-message Dapp surface with conversation display, contact context, message input, and send behavior.", summary: "Track the encrypted-message UX as a Dapp page, with privacy and security language connected to the broader app trust model.", compactSignal: "Chat page owner", kpis: ["Conversation card reviewable", "Contact context state checked", "Message input and send path scoped", "Privacy/security copy linked"], dependencies: ["technical-demo-contacts-surface", "technical-dev-security-hygiene"], links: [link.demoChat, link.demoSecurity, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Chat page checklist for conversation, contact context, message input, send behavior, and privacy copy.", proof: "This card is complete only when the Chat page can be reviewed independently and does not rely on an untracked communications assumption." }),
  card({ id: "technical-demo-settings-profile-security", title: "Settings, Profile And Security Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo"], workState: "later", status: "Drafting", progress: 12, objective: "Make Preferences reviewable across settings and updates, profile, security, appearance, display, addresses, sync, and vault-key guidance.", summary: "Give Settings, My profile, and Security a concrete owner so the Dapp Lens points to real preference and identity work.", compactSignal: "Preferences owner", kpis: ["Settings updates page reviewable", "Profile/avatar fields scoped", "Security/vault-key guidance checked", "Appearance/display/address/sync sections listed"], dependencies: ["technical-dev-security-hygiene"], links: [link.demoSettingsUpdates, link.demoProfile, link.demoSecurity, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Preferences checklist covering settings updates, profile, security, display, addresses, and sync.", proof: "This card is complete only when Preferences pages have pass/fix/open rows and public-safe security wording." }),
  card({ id: "technical-invest-coverage-fund-ui", title: "Invest And Coverage Fund UI", stream: "Technical Stream", category: "Invest And Coverage Fund", appPhases: ["Demo"], workState: "later", status: "Drafting", progress: 18, objective: "Make Invest and Coverage Fund screens readable while staying aligned with protocol truth.", summary: "Rework the Coverage Fund surface so it shows fund size, accumulated fees, and historical return first, while clearly separating illustrative UI from protocol truth.", compactSignal: "Invest truth alignment", kpis: ["Current fund size shown first", "Accumulated fees shown first", "Annualized historical return shown first", "cf-holder and first-loss language aligned with mechanics", "Illustrative values clearly labelled where needed"], dependencies: ["financial-protocol-truth-guard", "technical-network-mds-runtime-truth"], links: [link.demoTracker, link.mechanics], metrics: ["coverage_fund_summary_order_ready", "coverage_fund_label_aligned", "coverage_fund_truth_copy_aligned"], nextStep: "Produce a before/after screenshot or review note showing the Coverage Fund summary order and labels.", proof: "This card is complete only when the Demo Invest screen shows fund size, accumulated fees, historical return, and reviewed risk labels in the correct order." }),
  card({ id: "technical-merchant-ramp-shops-ux", title: "Merchant Ramp And Shops UX", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo"], workState: "active", status: "Drafting", progress: 20, objective: "Make merchant exchange, shops, invoices, and ramp surfaces reflect the real merchant-first path.", summary: "Bring the merchant-first banking path into the app through shops, invoices, merchant display, QR/payment requests, and the ramp flow.", compactSignal: "Merchant app path", kpis: ["Shops and merchant surfaces mapped", "Invoice/payment request flow visible", "Nearby merchant / DIY exchange route leads ramp UX", "Current available route remains explicit"], dependencies: ["community-merchant-preparation", "financial-merchant-first-ramp-ux"], links: [link.uiInventory, link.demoTracker], metrics: ["merchant_directory_listings", "merchant_payment_requests_created"], nextStep: "Map every merchant-facing screen and choose the first Demo surface to make reviewable.", proof: "App UI inventory and CD-012 define the first merchant/ramp direction." }),
  card({ id: "technical-merchant-wallet-validation-ux", title: "Merchant Wallet And Validation UX", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 10, objective: "Define how merchant wallets become recognizable, usable, and eventually valid inputs for merchant identity.", summary: "Connect merchant wallet profile, payment receiving, invoice history, validation status, and pseudonymous merchant identity path.", compactSignal: "Merchant wallet identity", kpis: ["Merchant wallet profile scope drafted", "Validation status concept separated from live identity claims", "Payment receiving linked to merchant profile", "Pseudonymous merchant identity path documented"], dependencies: ["technical-merchant-ramp-shops-ux", "community-merchant-preparation"], links: [link.uiInventory, link.charter], metrics: ["merchant_validations_issued", "merchant_reviews_submitted"], nextStep: "Draft the merchant wallet validation UX from Demo to Test without implying production identity is live.", proof: "Charter identity direction and merchant preparation docs define the need; implementation evidence is pending." }),
  card({ id: "technical-merchant-pos-path", title: "Merchant Point-Of-Sale Path", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test", "Prod"], workState: "active", status: "Drafting", progress: 12, objective: "Turn merchant acceptance into a concrete app path instead of only a community ambition.", summary: "Define payment requests, QR checkout, merchant display, settlement visibility, and receipt/invoice flow for accepting-network readiness.", compactSignal: "POS path", kpis: ["QR/payment request path drafted", "Merchant display path drafted", "Receipt/invoice flow mapped", "Settlement visibility requirements identified"], dependencies: ["technical-merchant-ramp-shops-ux", "financial-merchant-settlement-local-liquidity"], links: [link.uiInventory, link.charter, link.currentPath], metrics: ["merchant_payment_requests_created"], nextStep: "Identify the minimum Demo point-of-sale flow that can be reviewed by merchants and ambassadors.", proof: "Charter merchant settlement network and app UI inventory establish the component." }),
  card({ id: "technical-demo-invoice-merchant-qr", title: "Invoice And Merchant QR Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo"], workState: "active", status: "Drafting", progress: 10, objective: "Make Create Invoice a reviewable merchant payment-request surface with invoice details, merchant QR, and merchant display path.", summary: "Give the Create Invoice Dapp page a concrete owner inside merchant tooling instead of leaving it implied by broader POS work.", compactSignal: "Invoice page owner", kpis: ["Invoice details card reviewable", "Merchant QR path scoped", "Merchant Display entry checked", "Payment-request data fields listed"], dependencies: ["technical-merchant-pos-path", "technical-merchant-ramp-shops-ux"], links: [link.demoInvoice, link.demoMyShop, link.uiInventory], metrics: ["merchant_payment_requests_created"], nextStep: "Create the Create Invoice checklist covering invoice fields, QR payload, merchant display, and demo limitations.", proof: "This card is complete only when Create Invoice can be reviewed as its own Dapp page." }),
  card({ id: "technical-dev-structure", title: "World-Class Development Structure", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Showcase", "Demo"], workState: "active", status: "In progress", reviewedProgress: 82, objective: "Put in place a world-class development structure where the repository, Dapp stage folders, website assets, source documents, generated Navi/Dashboard data, and deployment files each have a professional, inspectable home.", summary: "Build the project on a professional repository and folder structure: development/current/archive separation, Dapp stage folders, website assets, generated Navi/Dashboard data, and source documents are visible and reviewable.", compactSignal: "World-class dev structure", kpis: ["Development/current/archive layout visible", "Dapp stage folders visible", "Website asset folders visible", "Generated Navi/Dashboard data locations visible", "Source docs linked to cards"], links: [link.githubOrg, link.websiteDappLinks, link.demoOfficialLinks], metrics: ["navi_metric_link_coverage"], nextStep: "Create a pass/fail structure checklist for repository folders, stage folders, generated files, source docs, and deployment assets.", proof: "This card is complete only when a reviewer can open the repository/public links and verify where each development surface lives." }),
  card({ id: "technical-dev-infra-tooling", title: "Development Infrastructure And Tooling", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Showcase", "Demo"], workState: "active", status: "In progress", reviewedProgress: 40, objective: "Make the local development and generation tools repeatable before adding more public-facing work.", summary: "Track the concrete tooling needed to work safely: local server, Navi builder, Dashboard generator, JSON validation, lints, Dapp package checks, deployment preview commands, and the still-open on-chain implementation toolchain.", compactSignal: "Dev tooling", kpis: ["Local preview command documented", "Navi builder command documented", "Dashboard generator command documented", "Validation command documented", "Dapp package check documented", "On-chain build/test tooling still open"], dependencies: ["technical-dev-structure"], links: [link.githubOrg, link.websiteDappLinks, link.demoDapp], metrics: ["navi_metric_link_coverage", "dashboard_metric_sources_ready"], nextStep: "Write the first repeatable dev command checklist for local preview, data generation, validation, package review, and on-chain build/test preparation.", proof: "This card is complete only when another contributor can run the documented commands and reproduce the Navi/Dashboard/Dapp preview state plus the on-chain development checks." }),
  card({ id: "technical-dev-security-hygiene", title: "Development Environment Security Hygiene", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", reviewedProgress: 60, objective: "Secure the development environment before wider contributors or public testing depend on it.", summary: "Track the practical security basics: no secrets in public files, credentials kept out of generated data, official security/support route listed, deploy keys separated, and public links verified before release.", compactSignal: "Dev security", kpis: ["Public files checked for secrets", "Generated Navi links contain public URLs only", "Security support route linked", "Deploy/access responsibility listed", "Release checklist includes security review"], dependencies: ["technical-dev-structure", "community-public-presence-reach"], links: [link.demoSecurity, link.demoOfficialLinks, link.websiteCouncilLinks, link.securityTelegram], metrics: ["navi_metric_link_coverage"], nextStep: "Create the first dev-security checklist covering secrets, public URLs, deployment access, and security support routing.", proof: "This card is complete only when the checklist is visible and each release candidate can be marked pass/fix/open before publication." }),
  card({ id: "technical-deployment-verification", title: "Deployment Test And Public Preview Verification", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Showcase", "Demo"], workState: "active", status: "Drafting", reviewedProgress: 55, objective: "Test the deployment path before treating Navi, Dashboard, links, or Dapp stages as public-ready.", summary: "Verify that domain routes, GitHub Pages/public hosting, Dapp stage URLs, links page anchors, Navi, Dashboard, and generated JSON load correctly after each publish.", compactSignal: "Deploy verification", kpis: ["Showcase URL opens", "Demo URL opens", "Links page anchors open", "Navi JSON loads", "Dashboard JSON loads", "Deployment test result recorded"], dependencies: ["technical-dev-infra-tooling", "technical-dev-security-hygiene"], links: [link.websiteHome, link.websiteDappLinks, link.showcaseDapp, link.demoDapp, link.websiteCouncilLinks], metrics: ["demo_status", "navi_items_total", "dashboard_metric_sources_ready"], nextStep: "Write the deployment smoke-test checklist for domain routes, Dapp stages, Navi, Dashboard, and generated JSON.", proof: "This card is complete only when a deployment test result is recorded with pass/fix/open status for every public route." }),
  card({ id: "technical-network-mds-runtime-truth", title: "Dapp Channel, Node Connection And Release Surface", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Showcase", "Demo", "Test", "Prod"], workState: "active", status: "Drafting", progress: 22, objective: "Make the Dapp channel state, node connection model, and release evidence truthful across Showcase, Demo, Test, and Prod.", summary: "Unify channel truth, MDS/standalone-node connection state, synthetic/degraded/disconnected labels, downstream porting, and release evidence as one page-level review surface.", compactSignal: "Channel and release truth", kpis: ["Channel truth visible at page level", "MDS/degraded/disconnected states labelled", "Lead-channel and downstream porting rows tied to shipped features", "Standalone node dependency documented for Test", "No Demo connector confused with Prod readiness"], dependencies: ["technical-demo-minima-wallet-baseline", "technical-test-standalone-node-requirement"], links: [link.uiInventory, link.versioning, link.porting, link.review], metrics: ["channel_truth_model_defined", "demo_status"], nextStep: "Convert channel truth, node connection state, and porting evidence into one page-level release review checklist.", proof: "This card is complete only when a reviewer can inspect the release surface and see channel truth, node state, porting status, and release evidence together." }),
  card({ id: "technical-next-demo-cycle", title: "Review Package", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Demo"], workState: "active", status: "In progress", progress: 15, type: "milestone", objective: "Assemble the next public Demo review package across all reviewable Demo pages.", summary: "This is the current technical todo bundle for the next Demo review: build link, changelog, review notes, feedback ask, known limitations, and blocker list must exist together.", compactSignal: "Current review package", kpis: ["Build link identified", "Changelog summary drafted", "Review notes drafted", "Feedback ask drafted", "Known limitations listed", "Open blockers listed"], dependencies: ["technical-network-mds-runtime-truth", "technical-demo-minima-wallet-baseline", "technical-invest-coverage-fund-ui"], links: [link.demoTracker, link.demoPlan], metrics: ["channel_truth_model_defined", "demo_onboarding_message_ready", "demo_release_notes_ready", "feedback_items_routed_to_tracker", "github_feedback_open", "demo_status"], nextStep: "Create the first Demo review package that a tester can open, read, and answer.", proof: "This card is complete only when the review package can be opened and contains build, changelog, notes, feedback ask, known limitations, and blocker list." }),
  card({ id: "technical-test-standalone-node-requirement", title: "Test Standalone Node Requirement", stream: "Technical Stream", category: "Dapp Channels And Development Infrastructure", appPhases: ["Test"], workState: "later", status: "Not started", progress: 0, type: "milestone", objective: "Make standalone node readiness a Test-phase requirement instead of leaving the app dependent on the Demo MDS connector model.", summary: "Track the external dependency on what the Minima team makes available for standalone node function, local helper, or non-MDS connector path.", compactSignal: "External dependency", kpis: ["Minima standalone path clarified", "Non-MDS connector option evaluated", "Test package criteria updated", "MDS-only dependency removed from Test definition"], dependencies: ["technical-network-mds-runtime-truth"], links: [link.versioning, link.review], nextStep: "Create the Test readiness row that records the selected standalone-node path, owner, and decision status.", proof: "This card is complete only when the Test readiness row names the chosen node path, the source of the decision, and the package criterion it unlocks." }),
  card({ id: "technical-testing-app-easter-eggs", title: "Testing App Easter Egg Minting", stream: "Technical Stream", category: "Mint, Burn And Token Scope", appPhases: ["Showcase", "Test"], workState: "later", status: "Drafting", progress: 5, objective: "Define the app-side testing feature where users can discover and freely mint NFT easter eggs inside the testing app.", summary: "Add free testing-app NFT easter eggs as contribution markers, not financial assets, linked to UX Reviewer and future tester categories.", compactSignal: "Free tester NFTs", kpis: ["Free minting scope defined", "No value claim included", "UX Reviewer category supported first", "Feedback farming dependency linked"], dependencies: ["community-feedback-farming-program"], links: [link.review], nextStep: "Draft the first UX Reviewer easter egg loop and decide where it appears in the app.", proof: "User decision: NFTs are free testing-app easter eggs, not a funding gate." }),
  card({ id: "technical-demo-faucet-winiwa-claim", title: "Get Winiwa Faucet Surface", stream: "Technical Stream", category: "Mint, Burn And Token Scope", appPhases: ["Showcase", "Demo"], workState: "active", status: "Drafting", progress: 12, objective: "Make Get Winiwa reviewable as the Demo faucet surface for claiming Winiwa and resetting balances with clear no-value boundaries.", summary: "Give the Faucet page a concrete owner so Winiwa claim and reset behavior is not hidden inside token-scope language.", compactSignal: "Faucet page owner", kpis: ["Claim Winiwa card reviewable", "Reset balances card reviewable", "No-value boundary visible", "Demo/Test language checked"], dependencies: ["financial-demo-token-ui-scope"], links: [link.demoFaucet, link.demoMint, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Get Winiwa checklist for claim, reset, no-value copy, and Demo/Test boundary.", proof: "This card is complete only when the Faucet page has pass/fix/open rows for claim, reset, and token-value language." }),
  card({ id: "technical-wallet-send-receive-qr-surface", title: "Send, Receive And QR Payment Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 18, objective: "Make send, receive, QR, camera permission, address format, and payment-request entry points reviewable as one wallet transaction surface.", summary: "Own the wallet modal layer: native Minima send when node live, demo-token send boundaries, receive address formats, QR scan/pay behaviour, and merchant checkout entry points.", compactSignal: "Send/receive owner", kpis: ["Native Minima send path checked", "Demo-token send boundary visible", "Mx and 0x receive formats checked", "QR scan permission states listed", "Merchant checkout entry path scoped"], dependencies: ["technical-demo-minima-wallet-baseline", "technical-network-mds-runtime-truth"], links: [link.demoWallet, link.demoInvoice, link.uiInventory], metrics: ["demo_minima_wallet_baseline_verified", "navi_metric_link_coverage"], nextStep: "Create the send/receive checklist from amount entry through QR, address format, node-live execution, and demo-only fallbacks.", proof: "This card is complete only when every send/receive modal state has a pass/fix/open row tied to the Demo wallet route." }),
  card({ id: "technical-exchange-conversion-surface", title: "Exchange Conversion Surface", stream: "Technical Stream", category: "Wallet And User Banking", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 14, objective: "Make the Exchange page reviewable as a wallet conversion surface with currency selectors, balances, recent exchanges, detail modal, and liquidity CTA.", summary: "Track the conversion UX that turns wallet balances into exchangeable demo assets while keeping live liquidity and production claims out of scope.", compactSignal: "Exchange page owner", kpis: ["Send/receive currency selectors checked", "Available balance hints checked", "Recent exchanges render", "Exchange detail modal scoped", "Liquidity CTA connects to Invest LP panel"], dependencies: ["technical-demo-minima-wallet-baseline", "technical-liquidity-funds-surface"], links: [link.demoExchange, link.demoInvest, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Exchange checklist for selectors, balances, conversion math labels, history rows, and liquidity CTA.", proof: "This card is complete only when Exchange can be reviewed independently from the wallet home card." }),
  card({ id: "technical-mint-xwiniwa-surface", title: "xWiniwa Mint And Burn Surface", stream: "Technical Stream", category: "Mint, Burn And Token Scope", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 16, objective: "Make the xWiniwa mint/burn panel reviewable with leverage chart, collateral-ratio language, no-value boundaries, and source mechanics.", summary: "Own the xWiniwa side of the Mint page: mint button, burn path, leverage traces, current leverage row, and stress language aligned to protocol truth.", compactSignal: "xWiniwa mint owner", kpis: ["Mint xWiniwa panel checked", "Burn xWiniwa panel checked", "Leverage chart labels checked", "CR stress copy aligned", "No production value implied"], dependencies: ["financial-demo-token-ui-scope", "financial-protocol-truth-guard"], links: [link.demoMint, link.mechanics, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the xWiniwa mint/burn checklist covering chart, leverage math, buttons, copy, and no-value boundary.", proof: "This card is complete only when the Mint page xWiniwa section can be reviewed without relying on the broader token-scope card." }),
  card({ id: "technical-mint-wables-surface", title: "Wables Mint And Burn Surface", stream: "Technical Stream", category: "Mint, Burn And Token Scope", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 14, objective: "Make Wables minting and burning reviewable across asset selection, issue/reclaim amounts, available balances, and demo/protocol wording.", summary: "Own the Wables side of the Mint page so stable-token issuance and reclaim paths have their own checklist and source links.", compactSignal: "Wables mint owner", kpis: ["Issue Wables panel checked", "Reclaim Wables panel checked", "Currency selection checked", "Available balance hints checked", "Stable-token wording aligned"], dependencies: ["financial-demo-token-ui-scope", "technical-token-vault-currency-controls"], links: [link.demoMint, link.mechanics, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Wables issue/reclaim checklist for inputs, balances, labels, copy, and protocol boundaries.", proof: "This card is complete only when Wables mint/burn can be reviewed separately from xWiniwa minting." }),
  card({ id: "technical-token-vault-currency-controls", title: "Shared Token And Currency Controls", stream: "Technical Stream", category: "Mint, Burn And Token Scope", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make the shared currency dropdown and amount-control system reliable across send, receive, exchange, mint, invoice, coverage deposit, and LP quote flows.", summary: "Track the shared vault controls that keep balances, selected currencies, MAX actions, and hidden form values consistent across app pages.", compactSignal: "Shared token controls", kpis: ["Currency dropdown reused across flows", "Balance hints refresh", "MAX actions checked", "Hidden input values synced", "No visible scrollbar regression"], dependencies: ["technical-demo-minima-wallet-baseline", "technical-mint-wables-surface", "technical-demo-invoice-merchant-qr"], links: [link.demoWallet, link.demoMint, link.demoExchange, link.demoInvoice, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create a shared-control matrix listing every page using the currency selector, amount input, balance hint, and MAX behaviour.", proof: "This card is complete only when every shared token control has one pass/fix/open row and one owning source path." }),
  card({ id: "technical-invest-my-holdings-surface", title: "Invest Holdings Surface", stream: "Technical Stream", category: "Invest And Coverage Fund", appPhases: ["Demo"], workState: "active", status: "Drafting", progress: 12, objective: "Make the Invest My investment tab reviewable as portfolio summary plus available balances without conflicting with wallet balances.", summary: "Own the holdings tab inside Invest so portfolio summary, available balances, and demo-value language are tracked separately from Coverage Fund and LP work.", compactSignal: "Holdings tab owner", kpis: ["Portfolio summary checked", "Available balances checked", "Wallet-balance consistency checked", "Demo-value language visible"], dependencies: ["technical-demo-minima-wallet-baseline"], links: [link.demoInvest, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Invest holdings checklist for summary, balances, copy, and wallet consistency.", proof: "This card is complete only when the My investment tab can be reviewed without opening Coverage Fund or LP sections." }),
  card({ id: "technical-coverage-fund-performance-surface", title: "Coverage Fund Performance Surface", stream: "Technical Stream", category: "Invest And Coverage Fund", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 14, objective: "Make Coverage Fund performance reviewable across 30-day metrics, historical performance, NAV overlays, fund composition, and deposit/withdraw states.", summary: "Split Coverage Fund performance out from the broad Invest UI so charts, fund size, accumulated fees, risk labels, and cf-token accounting have a concrete owner.", compactSignal: "Coverage performance owner", kpis: ["30-day chart checked", "Historical chart checked", "Fund composition checked", "Deposit/withdraw states checked", "cf-token labels aligned"], dependencies: ["financial-coverage-fund-cf-tokens", "technical-invest-coverage-fund-ui"], links: [link.demoInvest, link.mechanics, link.uiInventory], metrics: ["coverage_fund_summary_order_ready", "coverage_fund_label_aligned"], nextStep: "Create the Coverage Fund chart and composition checklist with chart labels, day slider, NAV overlay, and deposit/withdraw rows.", proof: "This card is complete only when Coverage Fund can be reviewed as its own Invest tab surface." }),
  card({ id: "technical-liquidity-funds-surface", title: "Liquidity Funds Surface", stream: "Technical Stream", category: "Invest And Coverage Fund", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 10, objective: "Make the LP panel reviewable across current liquidity buckets, Add liquidity, base-currency quote, and Exchange linkage.", summary: "Track the liquidity-funds tab as the app surface that connects Invest to Exchange without implying production DEX depth.", compactSignal: "LP tab owner", kpis: ["Liquidity buckets checked", "Add liquidity form checked", "Base-currency quote checked", "Exchange CTA checked", "Production liquidity caveat visible"], dependencies: ["technical-exchange-conversion-surface", "financial-secondary-market-dex-liquidity"], links: [link.demoInvest, link.demoExchange, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the LP checklist for buckets, quote currency, add-liquidity flow, and Exchange CTA.", proof: "This card is complete only when the Liquidity funds tab can be reviewed independently from Coverage Fund." }),
  card({ id: "technical-treasury-stress-test-surface", title: "Treasury And Stress Test Surface", stream: "Technical Stream", category: "Invest And Coverage Fund", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make Treasury reviewable as an app surface for protocol standing, liability structure, concentration, trading depth, and Winiwa price stress testing.", summary: "Bring the Treasury page into Technical navigation so its charts and stress controls are tracked as implemented UI, not only financial theory.", compactSignal: "Treasury page owner", kpis: ["Protocol standing card checked", "Liability structure chart checked", "Concentration and depth checked", "Stress slider checked", "Live spot source labelled"], dependencies: ["financial-mathematical-annex-stress-model", "financial-balance-sheet-truth"], links: [link.demoTreasury, link.mechanics, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Treasury UI checklist for every chart, slider label, spot source, and stress result row.", proof: "This card is complete only when Treasury can be reviewed as a Dapp page with app evidence and financial-source links." }),
  card({ id: "technical-shops-directory-surface", title: "Shops Directory Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make the Shops page reviewable as a merchant directory with search, merchant rows, List my shop CTA, and ambassador CTA.", summary: "Own the bottom-tab Shops surface before merchant acceptance can be tested with real participants.", compactSignal: "Shops page owner", kpis: ["Merchant rows checked", "Search input checked", "List my shop CTA checked", "Ambassador CTA checked", "Category sections checked"], dependencies: ["community-merchant-preparation", "technical-my-shop-merchant-tools-surface"], links: [link.demoMerchants, link.demoMyShop, link.demoAmbassador, link.uiInventory], metrics: ["merchant_directory_listings", "merchant_profiles_ready", "merchant_ramp_structure_ready"], nextStep: "Create the Shops checklist for merchant rows, category sections, CTAs, and empty/future states.", proof: "This card is complete only when Shops can be reviewed without relying on broad merchant ramp notes." }),
  card({ id: "technical-onoff-ramp-surface", title: "On/Off Ramp Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 14, objective: "Make the On/Off Ramp page reviewable across where MINIMA trades, on-ramp flow, off-ramp flow, bridge/DEX links, and Mint deep links.", summary: "Own the paper-money-to-Stables pathway in the Dapp so ramp education and merchant-first routing are visible and testable.", compactSignal: "Ramp page owner", kpis: ["Where MINIMA trades checked", "On-ramp steps checked", "Off-ramp steps checked", "Bridge/DEX route checked", "Mint deep links checked"], dependencies: ["financial-merchant-first-ramp-ux", "technical-mint-wables-surface"], links: [link.demoRamp, link.demoMint, link.uiInventory], metrics: ["merchant_ramp_structure_ready"], nextStep: "Create the ramp checklist covering each step, each external route, and each Mint deep link.", proof: "This card is complete only when On/Off Ramp can be reviewed as its own app page." }),
  card({ id: "technical-my-shop-merchant-tools-surface", title: "My Shop Merchant Tools Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make My shop reviewable across shop listing, invoice entry, webshop linking, QR payload, merchant API kit, sticker, and hidden webhook readiness.", summary: "Own the merchant self-service surface that turns the directory into practical merchant tooling.", compactSignal: "My shop owner", kpis: ["Shop listing card checked", "Create Invoice entry checked", "Webshop QR payload checked", "Merchant API kit checked", "Sticker asset checked", "Webhook hidden state documented"], dependencies: ["technical-shops-directory-surface", "technical-demo-invoice-merchant-qr"], links: [link.demoMyShop, link.demoInvoice, link.uiInventory], metrics: ["merchant_directory_listings", "merchant_payment_requests_created"], nextStep: "Create the My shop checklist covering listing, invoice entry, QR payload, API kit, sticker, and hidden webhook state.", proof: "This card is complete only when My shop has page-level review evidence for every merchant tool block." }),
  card({ id: "technical-ambassador-merchant-registration-surface", title: "Ambassador Merchant Registration Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 10, objective: "Make the Ambassadors page reviewable as a merchant onboarding and retrocession surface with listing model, registration path, and Telegram CTA.", summary: "Bring the Ambassador page into Technical navigation because it is an app page with concrete onboarding and merchant-growth UI.", compactSignal: "Ambassador page owner", kpis: ["Listing model card checked", "Retrocession split checked", "Become ambassador CTA checked", "Telegram join path checked", "Merchant relationship visible"], dependencies: ["community-ambassador-network", "community-merchant-preparation"], links: [link.demoAmbassador, link.ambassadorProgram, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Ambassador page checklist for listing costs, retrocession wording, CTA behaviour, and discussion link.", proof: "This card is complete only when the Ambassadors page can be reviewed as a Dapp surface rather than only a community program." }),
  card({ id: "technical-merchant-api-webshop-qr-surface", title: "Merchant API, Webshop And QR Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test", "Prod"], workState: "later", status: "Drafting", progress: 6, objective: "Define the merchant integration surface for API kit copy, QR/payment link payloads, preview behaviour, webhooks, and future callback readiness.", summary: "Separate merchant integration plumbing from simple invoice UX so future production API and webhook claims stay controlled.", compactSignal: "Merchant integration owner", kpis: ["QR payload fields listed", "Payment link fields listed", "API kit copy checked", "Webhook hidden state documented", "Future callback boundary stated"], dependencies: ["technical-my-shop-merchant-tools-surface", "technical-smart-contract-specification-package"], links: [link.demoMyShop, link.demoInvoice, link.githubOrg, link.uiInventory], metrics: ["merchant_payment_requests_created"], nextStep: "Create the merchant integration checklist for QR payload, payment link, API kit, webhook state, and future callback requirements.", proof: "This card is complete only when merchant integration has an explicit Demo/Test/Prod boundary table." }),
  card({ id: "technical-merchant-promotion-surface", title: "Merchant Promotion And Sticker Surface", stream: "Technical Stream", category: "Merchant Banking Tools", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 10, objective: "Make merchant promotion reviewable across the public directory CTA, shop listing copy, Pay in Stables sticker, printable asset, and merchant display path.", summary: "Track the visible promotion pieces that help a merchant announce Stables acceptance without overpromising production payment availability.", compactSignal: "Merchant promotion owner", kpis: ["List my shop CTA checked", "Pay in Stables sticker asset checked", "Printable card checked", "Merchant display path checked", "Production-availability caveat visible"], dependencies: ["technical-shops-directory-surface", "technical-my-shop-merchant-tools-surface"], links: [link.demoMerchants, link.demoMyShop, link.uiInventory], metrics: ["merchant_ramp_structure_ready"], nextStep: "Create the merchant promotion checklist for CTA copy, sticker display, printable asset, merchant display, and production caveats.", proof: "This card is complete only when merchant promotion has app evidence separate from invoice and API tooling." }),
  card({ id: "technical-council-communications-surface", title: "Council Communications Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make Council communications reviewable as an in-app surface for security notices, updates, critical messages, and version banners.", summary: "Own the Council communications page injected by activity-contacts.js so updates and critical notices have a technical checklist.", compactSignal: "Council comms owner", kpis: ["Version banner checked", "Security notice block checked", "Critical notices checked", "Update cards checked", "Source route identified"], dependencies: ["technical-network-mds-runtime-truth", "community-communication-platform-strategy"], links: [link.demoCouncilComms, link.uiInventory, link.communicationPlanPage], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Council communications checklist from version banner through notices and update cards.", proof: "This card is complete only when Council communications can be reviewed as an app page with source path and public-safe copy." }),
  card({ id: "technical-feedback-submission-surface", title: "Feedback Submission Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Showcase", "Demo", "Test"], workState: "active", status: "Drafting", progress: 14, objective: "Make the Feedback page reviewable across public feedback fields, optional Minima/contact fields, consent, submit target, public database link, and Telegram fallback.", summary: "Track the technical feedback intake surface that routes community input into GitHub/API/Telegram without losing consent and privacy boundaries.", compactSignal: "Feedback page owner", kpis: ["Structured fields checked", "Consent flow checked", "Submit endpoint checked", "Public DB link checked", "Telegram fallback checked"], dependencies: ["community-public-feedback-intake", "technical-dev-security-hygiene"], links: [link.demoFeedback, link.uiInventory, link.communicationPlanPage], metrics: ["feedback_items_routed_to_tracker", "github_feedback_open"], nextStep: "Create the Feedback page checklist for fields, schema, endpoint, public DB link, Telegram fallback, and failure states.", proof: "This card is complete only when feedback submission can be tested or explicitly marked blocked with endpoint evidence." }),
  card({ id: "technical-academy-guided-help-surface", title: "Academy And Guided Help Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Demo", "Test"], workState: "later", status: "Drafting", progress: 8, objective: "Make Help and Academy reviewable across guided tours, questionnaires, score tracking, certificates, and StablesAgent entry points.", summary: "Own the app education surface so user guidance and future certificate logic are not hidden under general communication work.", compactSignal: "Academy owner", kpis: ["Guided tours listed", "Questionnaire flow scoped", "Score tracking scoped", "Certificate state scoped", "Agent entry checked"], dependencies: ["community-help-academy-guided-tours"], links: [link.demoAcademy, link.demoCouncilComms, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Academy checklist for tours, questionnaire states, score tracking, certificates, and agent hooks.", proof: "This card is complete only when Academy/help functionality has a route-level checklist tied to the Demo page." }),
  card({ id: "technical-official-links-surface", title: "Official Links Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Showcase", "Demo", "Test", "Prod"], workState: "active", status: "Drafting", progress: 16, objective: "Make the in-app All links page reviewable across domains, GitHub, emails, social links, Telegram, Discord, and the public links page handoff.", summary: "Track the official-links surface as the app-side companion to the website links page and social registry.", compactSignal: "All links owner", kpis: ["Domains checked", "GitHub links checked", "Emails checked", "Social links checked", "Public links page handoff checked"], dependencies: ["community-public-presence-reach", "community-social-profiles-live-registry"], links: [link.demoOfficialLinks, link.websiteLinks, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the All links checklist and compare it to the website links page and social-profile registry.", proof: "This card is complete only when the in-app links page and website links page agree on official public surfaces." }),
  card({ id: "technical-legal-notices-surface", title: "Legal And Notices Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Showcase", "Demo", "Test", "Prod"], workState: "active", status: "Drafting", progress: 10, objective: "Make Legal and notices reviewable across terms, privacy, data use, security, Minima dependencies, oracle notices, and Council-property wording.", summary: "Own the legal-notices page as an implemented app surface, with public-safe boundaries and Charter consistency.", compactSignal: "Legal page owner", kpis: ["Terms summary checked", "Privacy copy checked", "Data use copy checked", "Security CTA checked", "Minima dependency wording checked"], dependencies: ["financial-protocol-truth-guard", "technical-dev-security-hygiene"], links: [link.demoLegal, link.demoSecurity, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Legal and notices checklist covering each copy block and its source-of-truth reference.", proof: "This card is complete only when legal/notices wording is reviewed as app UI, not only as a document." }),
  card({ id: "technical-profile-identity-surface", title: "Profile And Council Identity Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make My profile reviewable across Council name, role, avatar, NFT fields, profile mode controls, save/reset, and local storage behaviour.", summary: "Split profile and identity out from general settings so Council identity UX has its own technical owner.", compactSignal: "Profile owner", kpis: ["Name/role fields checked", "Avatar flow checked", "NFT fields checked", "Profile mode controls checked", "Local storage behaviour checked"], dependencies: ["technical-settings-updates-surface"], links: [link.demoProfile, link.demoSettingsUpdates, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the My profile checklist for fields, avatar, NFT metadata, mode controls, save/reset, and local persistence.", proof: "This card is complete only when profile identity can be reviewed independently from Settings." }),
  card({ id: "technical-settings-updates-surface", title: "Settings And Updates Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Demo", "Test"], workState: "active", status: "Drafting", progress: 12, objective: "Make Settings and updates reviewable across package updates, appearance, display, wallet addresses, sync preferences, and theme/display state.", summary: "Own the preferences surface that controls global app behaviour and wallet address presentation.", compactSignal: "Settings owner", kpis: ["App updates card checked", "Appearance behaviour checked", "Display settings checked", "Wallet addresses checked", "Sync preferences checked"], dependencies: ["technical-dev-security-hygiene"], links: [link.demoSettingsUpdates, link.demoWallet, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Settings and updates checklist for package, appearance, display, addresses, and sync blocks.", proof: "This card is complete only when settings changes have visible app effects and review rows." }),
  card({ id: "technical-security-vault-key-surface", title: "Security And Vault Key Surface", stream: "Technical Stream", category: "Community, Communications And Support Surfaces", appPhases: ["Demo", "Test", "Prod"], workState: "active", status: "Drafting", progress: 12, objective: "Make the Security page reviewable across vault-key wording, seed guidance, Security app CTA, and no-custody boundary.", summary: "Own the in-app security surface that tells users the vault key is the only access to funds.", compactSignal: "Security page owner", kpis: ["Vault-key copy checked", "Seed guidance checked", "Security app CTA checked", "No-custody boundary visible", "Legal/security links checked"], dependencies: ["technical-dev-security-hygiene", "technical-legal-notices-surface"], links: [link.demoSecurity, link.demoLegal, link.uiInventory], metrics: ["navi_metric_link_coverage"], nextStep: "Create the Security page checklist for vault-key copy, seed guidance, CTA behaviour, and no-custody wording.", proof: "This card is complete only when the Security page can be reviewed as a standalone user-safety surface." }),
  card({ id: "technical-sovereign-banking-device", title: "Sovereign Banking Device", stream: "Technical Stream", category: "Destinations", appPhases: ["Prod"], workState: "destination", status: "Not started", progress: 0, type: "destination", objective: "Reach the long-term technical endpoint where Stables can run as an integrated sovereign banking device, with a Minima node on chip and the Stables Dapp embedded as the user banking layer.", summary: "A dedicated sovereign banking device with a Minima node on chip and the Stables Dapp integrated.", compactSignal: "Destination", kpis: ["Dedicated sovereign banking device concept documented", "Minima node-on-chip architecture path defined", "Stables Dapp integration model drafted", "Core assets and contracts handover path connected", "Prod readiness kept at 0% until real device validation exists"], dependencies: ["technical-test-standalone-node-requirement", "technical-network-mds-runtime-truth", "financial-destination", "community-council-handover"], links: [link.charter, link.charterCompanion, link.currentPath, link.versioning], metrics: ["navi_average_progress", "navi_not_started"], discussion: ["What has to be true before a dedicated device can be more than a concept?", "What role does Minima node-on-chip availability play in the technical path?", "Which Dapp and custody functions must be controlled by Council before this can move toward Prod?"], nextStep: "Define the Test and Prod technical milestones that must precede any dedicated-device execution path.", proof: "Charter, current state/path, and standalone-node planning define this as a production technical endpoint, not active execution." })
];

const moreItems = [
  ["financial-minima-l1-settlement-and-omnia-prototype-eval", "Minima L1 Truth Layer And Omnia Instant Payment Evaluation", "Financial Stream", "Protocol Mechanics And Solvency", ["Demo", "Test", "Prod"], "active", "Hold Minima L1 as the final truth layer for balances, minting, burning, collateral logic, and settlement while treating Omnia or other Minima-supported Layer 2 mechanisms as prototype evaluation rails for everyday instant payments subject to Charter verification gates."],
  ["technical-main-instant-balance-surfaces", "Main And Instant Balance Product Language And Wallet Surfaces", "Technical Stream", "Wallet And User Banking", ["Demo", "Test", "Prod"], "active", "Ship wallet surfaces that mirror the Charter Main Balance versus Instant Balance model using simple verbs (Prepare Money, Ready to Pay, Pay, Receive, Return Money) while keeping Omnia/channel/off-chain jargon out of normal user paths unless explained as optional advanced mechanics."],
  ["financial-protocol-truth-guard", "Peg Mechanics Claim Guard", "Financial Stream", "Protocol Mechanics And Solvency", ["Showcase", "Demo", "Test", "Prod"], "active", "Ensure every public app and Navi claim supports the locked peg-maintenance mechanics."],
  ["financial-oracle-framework-integrity-gate", "Oracle Framework And Integrity Gate", "Financial Stream", "Protocol Mechanics And Solvency", ["Demo", "Test", "Prod"], "later", "Design the oracle measurement system that controls issuance integrity without interrupting redemption continuity."],
  ["financial-mathematical-annex-stress-model", "Mathematical Annex And Stress Model", "Financial Stream", "Protocol Mechanics And Solvency", ["Showcase", "Demo", "Test", "Prod"], "active", "Turn Annex A formulas into a reviewable model for backing ratio, issuance, redemption, collateral valuation, stress behaviour, xMinima, Coverage Fund, leverage, and fees."],
  ["financial-balance-sheet-truth", "Peg Balance Sheet Truth", "Financial Stream", "Protocol Mechanics And Solvency", ["Demo", "Test", "Prod"], "later", "Explain the balance sheet components that maintain the peg before deeper financial surfaces are shown."],
  ["financial-fee-economics", "Peg Fee Economics", "Financial Stream", "Protocol Mechanics And Solvency", ["Demo", "Test", "Prod"], "later", "Make fee formula, fee flow, and fee destination unambiguous as part of peg maintenance."],
  ["financial-coverage-fund-cf-tokens", "Coverage Fund And cf Tokens", "Financial Stream", "Invest And Coverage Fund", ["Showcase", "Demo", "Test", "Prod"], "later", "Explain the Coverage Fund as a junior/first-loss layer with cf-token accounting."],
  ["financial-xminima-equity-router", "xMinima Equity And Router", "Financial Stream", "Protocol Mechanics And Solvency", ["Demo", "Test", "Prod"], "later", "Explain xMinima as protocol equity, not a transaction-fee claim."],
  ["financial-demo-token-ui-scope", "Token UI Scope", "Financial Stream", "Mint, Burn And Token Scope", ["Showcase", "Demo"], "later", "Clarify what users can test in Demo without implying production token behavior or real value."],
  ["financial-merchant-first-ramp-ux", "Merchant-First Ramp UX", "Financial Stream", "Merchant Network Economics", ["Demo"], "active", "Restructure ramp language around the real merchant-first exchange path."],
  ["financial-merchant-network-soundness", "Merchant Network Soundness", "Financial Stream", "Merchant Network Economics", ["Demo", "Test", "Prod"], "active", "Define what makes the merchant network financially usable, not just socially present."],
  ["financial-merchant-treasury-entry-logic", "Merchant Treasury And Entry Logic", "Financial Stream", "Merchant Network Economics", ["Demo", "Test", "Prod"], "active", "Clarify how merchant/ambassador entry economics support the Council treasury and network growth."],
  ["financial-merchant-settlement-local-liquidity", "Merchant Settlement And Local Liquidity", "Financial Stream", "Merchant Network Economics", ["Test", "Prod"], "active", "Track the path from merchant acceptance to reliable local settlement and liquidity."],
  ["financial-secondary-market-dex-liquidity", "Secondary Market And DEX Liquidity Requirements", "Financial Stream", "Protocol Mechanics And Solvency", ["Test", "Prod"], "later", "Define the required secondary-market and DEX liquidity conditions for Stables, xMinima, cf tokens, redemption confidence, and router execution."],
  ["financial-test-channel-preparation", "Test Channel Preparation", "Financial Stream", "Mint, Burn And Token Scope", ["Showcase", "Test"], "later", "Prepare the future Test channel after Demo is truthful and reviewed."],
  ["financial-destination", "Peg-Maintaining Financial System Basis For Builders And Community Fee Redistribution", "Financial Stream", "Destinations", ["Prod"], "destination", "Reach the production financial system basis where Stables maintains the peg through stable settlement, protocol accounting, on-chain credit inputs, and community fee redistribution so lending and financial players can build on top."],
  ["financial-doc-truth-drift-guard", "Protocol Claim Audit Queue", "Financial Stream", "Protocol Mechanics And Solvency", ["Showcase", "Demo", "Test", "Prod"], "active", "Track every public economic claim that still needs to be checked against the locked mechanics."],
  ["technical-smart-contract-specification-package", "Smart Contract Specification Package", "Technical Stream", "Dapp Channels And Development Infrastructure", ["Test", "Prod"], "later", "Write the reviewable contract specifications for minting, xMinima routing, Coverage Fund, merchant payments, lending boundaries, and invariant enforcement before implementation."],
  ["technical-onchain-anchoring-verification", "On-Chain Anchoring And Public Verification", "Technical Stream", "Dapp Channels And Development Infrastructure", ["Demo", "Test", "Prod"], "later", "Define the Integritas anchoring package: canonical document format, hash production, Council signatures, immutable reference ID, public verification, and amendment versioning."],
  ["community-public-presence-reach", "Domain, GitHub And Official Links Registry", "Community Stream", "Community Communication And Feedback", ["Showcase"], "active", "Register and maintain the official public surfaces: domain, GitHub, links page, Telegram, Discord, X, and other social profiles."],
  ["community-social-profiles-live-registry", "Social Profiles Live Registry", "Community Stream", "Community Communication And Feedback", ["Showcase"], "active", "Present the social profiles already put in place and separate live, draft, and future public channels."],
  ["community-content-phase-runway", "Public Post Queue By Dapp Phase", "Community Stream", "Community Communication And Feedback", ["Showcase", "Demo"], "active", "Prepare the next public posts and map each one to the Dapp phase it can truthfully discuss."],
  ["community-communication-plan", "Navi And Dashboard Launch Explanation", "Community Stream", "Community Communication And Feedback", ["Showcase"], "active", "Write the first public explanation for what Navi and Dashboard show and how the community should use them."],
  ["community-communication-platform-strategy", "Detailed Multi-Platform Communication Plan", "Community Stream", "Community Communication And Feedback", ["Showcase", "Demo", "Test", "Prod"], "active", "Maintain a dedicated communication strategy page with platform-specific plans for Facebook, Instagram, X, Telegram, Discord, YouTube, TikTok, Twitch, and future channels."],
  ["community-public-feedback-intake", "Public Feedback Intake", "Community Stream", "Community Communication And Feedback", ["Showcase", "Demo"], "active", "Turn public feedback into structured inputs for the next Demo cycle."],
  ["community-stablesagent-knowledge-loop", "StablesAgent FAQ Gap Log", "Community Stream", "Community Communication And Feedback", ["Showcase", "Demo"], "later", "Record repeated community questions that StablesAgent cannot answer well enough yet."],
  ["community-demo-release-rhythm", "Community Release Rhythm", "Community Stream", "Community Communication And Feedback", ["Demo"], "active", "Keep releases understandable by pairing changelogs, open items, feedback asks, and visible roadmap."],
  ["community-first-review-quest", "First Review Quest", "Community Stream", "Community Communication And Feedback", ["Demo"], "later", "Invite community review only once the Demo cycle is coherent enough to inspect."],
  ["community-feedback-farming-program", "Feedback Farming Program", "Community Stream", "Community Communication And Feedback", ["Demo", "Test"], "active", "Turn feedback into a visible participation program connected to testing app easter eggs and structured review."],
  ["community-help-academy-guided-tours", "Help, Academy And Guided Tours", "Community Stream", "Community Communication And Feedback", ["Demo"], "later", "Make Dapp help and education entry points reviewable through guided tours, Academy explanations, and user-facing learning routes."],
  ["community-ambassador-network", "Ambassador Network", "Community Stream", "Ambassadors And Cluster Growth", ["Showcase", "Demo"], "active", "Build the ambassador layer before direct merchant onboarding."],
  ["community-ambassador-merchant-cell-model", "Ambassador And Merchant Cell Model", "Community Stream", "Ambassadors And Cluster Growth", ["Showcase", "Demo"], "active", "Show how ambassadors and merchants grow together as local cells instead of separate programs."],
  ["community-merchant-preparation", "Merchant Preparation", "Community Stream", "Ambassadors And Cluster Growth", ["Demo"], "active", "Prepare merchant onboarding through ambassadors."],
  ["community-cluster-spark", "Cluster Spark", "Community Stream", "Ambassadors And Cluster Growth", ["Demo", "Test"], "active", "Define the first local cluster target where ambassadors and merchants reinforce each other."],
  ["community-cluster-challenge", "Cluster Challenge", "Community Stream", "Ambassadors And Cluster Growth", ["Test", "Prod"], "later", "Convert cluster growth into staged Bronze, Silver, and Gold progression."],
  ["community-global-growth", "Self-Onboarding Growth Checklist", "Community Stream", "Community Communication And Feedback", ["Showcase", "Demo", "Test"], "active", "List the concrete assets a new community member needs to understand, test, join, and invite others."],
  ["community-unified-clusters", "Cluster Federation Validation Criteria", "Community Stream", "Ambassadors And Cluster Growth", ["Test", "Prod"], "later", "Define the proof required before separate local clusters can be treated as a connected accepting network."],
  ["community-council-creation-charter", "Council Creation And Charter", "Community Stream", "Council Formation And Handover", ["Showcase", "Demo", "Test"], "active", "Present the Charter and Council model as the cornerstone of autonomous execution."],
  ["community-risk-matrix-response-boundaries", "Risk Matrix And Response Boundaries", "Community Stream", "Council Formation And Handover", ["Showcase", "Demo", "Test", "Prod"], "active", "Build Annex B into a structured matrix with risk scenario, impact, probability, structural mitigation, monitoring metrics, and deterministic response boundaries."],
  ["community-governance-transition-mechanics", "Governance Transition Mechanics", "Community Stream", "Council Formation And Handover", ["Demo", "Test", "Prod"], "later", "Define Annex C transition mechanics: decentralisation milestones, locked/flexible/transient decision scopes, upgrade thresholds, timelocks, seat composition, rotation, and time-weighted governance mechanics."],
  ["community-council-seat-voting-design", "Council Seat And Voting Design", "Community Stream", "Council Formation And Handover", ["Test", "Prod"], "later", "Separate designed Council structure from what is actually live."],
  ["community-council-handover", "Council Handover", "Community Stream", "Council Formation And Handover", ["Prod"], "later", "Define the transition from core development control to Council custody and execution."],
  ["community-destination", "Autonomous Council, Pseudonymous Identity, And Self-Growing Local Clusters", "Community Stream", "Destinations", ["Prod"], "destination", "Reach the production community layer where the Council operates autonomously, members use pseudonymous on-chain identity, and local ambassador/merchant clusters grow with the whole community support."]
];

const contentOverrides = {
  "financial-minima-l1-settlement-and-omnia-prototype-eval": {
    summary: "Prototype and verify whether Omnia or other Minima-supported Layer 2 rails can satisfy instant payment needs without breaking L1 settlement truth, self-custody, recoverability, or fees that must be enforced only through transaction logic or signed payment states per Charter Article II.10.",
    kpis: [
      "L1 settlement truth documented for balances, mint, burn, collateral, and settlement finality",
      "Prototype evaluation checklist covers token compatibility on candidate L2 rails",
      "Signed-state fee inclusion checkpoints aligned with locked protocol mechanics",
      "Return-to-Main-Balance and failure-recovery behaviours documented before production claims",
      "Challenge and verification hooks preserve Minima as the escalation layer"
    ],
    progress: 28,
    dependencies: ["financial-protocol-truth-guard", "technical-smart-contract-specification-package", "financial-fee-economics"],
    links: [link.mechanics, link.currentPath, link.paymentCapacityOmniaHandover, link.charterFeeIntegrity210, link.charterOmniaEval335],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Convert the Annex E referenced handover packet into dated prototype checkpoints with owners, prerequisites, evidence links, and go/no-go language.",
    proof: "This card is complete only when each Charter III.3.5 verification gate has a checklist row tied to observable prototype output and Annex E linkage."
  },
  "technical-main-instant-balance-surfaces": {
    summary: "Express the chartered balance model inside the wallet: Main Balance for maximum-security funds, Instant Balance for limited prepared everyday spending money, Omnia jargon hidden from default paths unless surfaced as voluntary deep explanations.",
    kpis: [
      "Wallet copy uses Prepare Money, Ready to Pay, Pay, Receive, and Return Money consistently",
      "Instant Balance framing never reads as custodial trusted server balances",
      "Default UI hides Omnia/channel/off-chain mechanics while advanced help routes exist",
      "Activity and legal surfaces reinforce the fee and truth story without conflicting language"
    ],
    progress: 10,
    dependencies: ["technical-demo-minima-wallet-baseline", "financial-minima-l1-settlement-and-omnia-prototype-eval"],
    links: [link.demoWallet, link.demoActivity, link.demoLegal, link.uiInventory, link.charterFeeIntegrity210],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Pair each balance verb with specific Demo routes, copy drafts, and reviewer sign-off slots before enabling external testing.",
    proof: "This card is complete only when wallet + activity reviewers can trace every user verb to Charter II.10 and III.3.5 language with signed review notes."
  },
  "financial-protocol-truth-guard": {
    summary: "Keep app copy, public pages, Navi cards, and Dashboard wording aligned with the locked peg-maintenance mechanics for minting, burning, fees, Coverage Fund signed-state rules, xMinima, and CR visibility, including chartered boundaries that forbid trusted-database fee math outside transaction logic.",
    kpis: ["Peg-maintenance claims checked against protocol spec", "Fee and token wording reconciled before publication", "Misleading production-language removed from Demo/Test surfaces", "Open contradictions logged for resolution"],
    progress: 30,
    nextStep: "Create a pass/fix/open mechanics checklist for minting, burning, fees, coverage, xMinima, and CR visibility.",
    proof: "This card is complete only when every mechanics claim has a source location, protocol reference, and pass/fix/open status."
  },
  "financial-oracle-framework-integrity-gate": {
    summary: "Specify the oracle framework as a real decision package: multi-source pricing, median aggregation, time-weighted smoothing, outlier filtering, integrity scoring, issuance gating, and redemption continuity.",
    kpis: ["Oracle source model drafted", "Median/TWAP/outlier rules listed", "Integrity score fields defined", "Mint gating boundary stated", "Redemption continuity protected"],
    progress: 5,
    dependencies: ["financial-mathematical-annex-stress-model", "technical-smart-contract-specification-package"],
    links: [link.charterOracle, link.charterMathAnnex, link.charterRiskAnnex, link.currentPath],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Create the oracle decision sheet with sources, aggregation method, integrity score, gating threshold status, and redemption boundary.",
    proof: "This card is complete only when the oracle decision sheet can be reviewed and every row has source, formula/rule, risk category, and open/decided status."
  },
  "financial-mathematical-annex-stress-model": {
    summary: "Turn Annex A into inspectable formulas and stress scenarios covering BR, issuance constraint, redemption, accounting identity, collateral valuation, xMinima, leverage, Coverage Fund, and fees.",
    kpis: ["Backing Ratio formula written", "Issuance constraint written", "Redemption formula written", "Collateral valuation inputs listed", "Stress model scenarios drafted", "xMinima/Coverage/Fee formulas reconciled"],
    progress: 25,
    dependencies: ["financial-protocol-truth-guard"],
    links: [link.charterMathAnnex, link.charterCore, link.mechanics, link.demoTreasury],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Build the Annex A formula table and mark each formula as drafted, sourced, reviewed, or open.",
    proof: "This card is complete only when every Annex A definition has a formula/source row and at least one reviewable stress scenario."
  },
  "financial-balance-sheet-truth": {
    summary: "Explain assets, liabilities, coverage, reserves, fees, and issuance boundaries as the accounting basis for maintaining the peg.",
    kpis: ["Peg balance sheet components listed", "Demo illustrative values separated from real balances", "Coverage Fund relationship explained", "Solvency wording reviewed against peg mechanics"],
    progress: 8,
    nextStep: "Draft the first peg balance sheet explanation that can appear in Demo without implying live protocol accounting.",
    proof: "Protocol mechanics and current state/path define the balance sheet concepts that maintain the peg before production metrics are shown."
  },
  "financial-fee-economics": {
    summary: "Make fee formula, fee routing, fee destination, Omnia-era signed payment states, and rebate handling unambiguous inside transaction logic as part of peg maintenance instead of implying server-side reconciliation that contradicts Charter Article II.10.",
    kpis: ["Fee formula stated from the mechanics spec", "Fees proven inside transaction logic or signed payment state checklist", "Fee destination reconciled across docs", "Demo copy avoids live-fee claims", "Governance questions separated from locked mechanics"],
    progress: 15,
    nextStep: "Write the fee-economics reconciliation row listing formula, destination wording, affected files, and open decision status.",
    proof: "This card is complete only when the fee formula and destination wording are written once and every affected public surface is marked aligned or open."
  },
  "financial-coverage-fund-cf-tokens": {
    summary: "Present the Coverage Fund as the junior/first-loss peg-protection layer with cf-token accounting, visible risk language, accumulated fees, and clear separation from synthetic Demo values.",
    kpis: ["First-loss peg-protection role explained", "cf-token accounting described", "Fund size and accumulated fees display order defined", "Risk and return labels reviewed"],
    progress: 12,
    nextStep: "Align the Invest/Coverage Fund UI copy with the first-loss and cf-token mechanics.",
    proof: "Protocol mechanics spec defines Coverage Fund and cf-token behavior; Demo tracker identifies the UI alignment work."
  },
  "financial-xminima-equity-router": {
    summary: "Explain xMinima as protocol equity and router-linked value exposure, not as a transaction-fee claim or ordinary stablecoin balance.",
    kpis: ["xMinima role described as protocol equity", "Router relationship explained", "Transaction-fee entitlement confusion removed", "Demo/Test visibility boundaries stated"],
    progress: 10,
    nextStep: "List every xMinima reference in the app/Navi/docs and mark each as equity-router accurate or needing correction.",
    proof: "This card is complete only when the xMinima reference list exists and each row has source, expected wording, and pass/fix/open status."
  },
  "financial-demo-token-ui-scope": {
    summary: "Define what Demo users can safely test around token screens, mint/burn concepts, balances, and peg-related labels without implying official Stables value.",
    kpis: ["Demo-only token labels visible", "No official-value claim present", "Mint/burn peg-control scope explained", "Synthetic or illustrative values marked clearly"],
    progress: 15,
    nextStep: "Audit Demo token screens for language that could be confused with Test or Prod assets.",
    proof: "Dapp phase definitions require Demo assets and token UI to stay clearly non-production."
  },
  "financial-merchant-first-ramp-ux": {
    summary: "Reframe ramp UX around real merchant-first exchange routes: local availability, nearby merchants, DIY exchange paths, and current-route transparency.",
    kpis: ["Merchant-first ramp language drafted", "Nearby merchant path mapped", "DIY exchange route explained", "Unavailable routes labelled without overpromising"],
    progress: 30,
    nextStep: "Connect the ramp copy to merchant surfaces in the app UI inventory.",
    proof: "Current state/path and app UI inventory point to merchant-first exchange as the practical early ramp direction."
  },
  "financial-merchant-network-soundness": {
    summary: "Define the financial conditions that support peg maintenance in real use: circulation, local redemption, liquidity confidence, settlement clarity, and repeatable merchant demand.",
    kpis: ["Peg-support soundness criteria listed", "Liquidity and settlement risks named", "Merchant acceptance loop connected to ambassadors", "Network-health indicators identified"],
    progress: 25,
    nextStep: "Turn merchant network soundness into measurable Dashboard indicators.",
    proof: "Merchant strategy and ambassador framework require the accepting network to be financially usable, not only socially recruited."
  },
  "financial-merchant-treasury-entry-logic": {
    summary: "Clarify how merchant and ambassador participation can feed Council treasury formation, entry logic, local credibility, and long-term network growth.",
    kpis: ["Entry logic described", "Treasury relationship separated from live promises", "Ambassador/merchant economics connected", "Council benefit path stated"],
    progress: 20,
    nextStep: "Write the merchant entry logic table with Demo education, Test validation, Prod mechanics, and Council treasury effect in separate columns.",
    proof: "This card is complete only when the entry logic table exists and each row has phase, user action, treasury effect, and live/not-live status."
  },
  "financial-merchant-settlement-local-liquidity": {
    summary: "Track the future path from merchant acceptance to peg-supporting settlement, local liquidity, redemption confidence, and stable circulation in Test and Prod.",
    kpis: ["Settlement requirements listed", "Local liquidity dependency stated", "Redemption confidence criteria drafted", "Peg validation held at 0% until Test/Prod evidence"],
    progress: 0,
    nextStep: "Wait for Test-channel mechanics before defining live settlement progress.",
    proof: "This is a Test/Prod financial requirement; it must remain at 0% until real settlement validation exists."
  },
  "financial-secondary-market-dex-liquidity": {
    summary: "Define the required tradable pairs, market-depth checks, DEX route assumptions, router dependencies, and liquidity warnings needed before live xMinima/cf-token/stablecoin mechanics are treated as executable.",
    kpis: ["Required pairs listed", "Market-depth checks drafted", "DEX route assumptions written", "Router dependency connected", "Liquidity warning copy drafted"],
    progress: 0,
    dependencies: ["financial-xminima-equity-router", "financial-coverage-fund-cf-tokens", "financial-oracle-framework-integrity-gate"],
    links: [link.mechanics, link.currentPath, link.demoExchange, link.demoInvest],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Create the secondary-market requirements table for stablecoins, xMinima, cf tokens, Minima pairs, and DEX route assumptions.",
    proof: "This card is complete only when each required pair has route, depth criterion, dependency, and Test/Prod status."
  },
  "financial-test-channel-preparation": {
    summary: "Prepare the financial requirements for Test: real on-chain test tokens, no official value, standalone-node dependency, bridge/x402 watch, and clear user warnings.",
    kpis: ["Test financial warnings drafted", "No official-value language included", "Standalone-node dependency linked", "Bridge/x402 constraints tracked"],
    progress: 0,
    nextStep: "Define the Test financial readiness checklist after Demo truth is stable.",
    proof: "Dapp phase definitions and standalone-node dependency set the boundary for future Test readiness."
  },
  "financial-destination": {
    objective: "Establish Stables as the production peg-maintaining financial system basis: stable settlement, protocol accounting, on-chain credit inputs, and community fee redistribution that builders, merchants, and lending players can build on top of.",
    summary: "Stables becomes the production financial system basis by maintaining the peg through stable settlement, protocol accounting, on-chain credit inputs, and community fee redistribution that builders and financial players can use as permissionless infrastructure.",
    kpis: ["Peg-maintaining settlement foundation documented", "Protocol accounting basis defined", "On-chain credit and identity inputs defined", "Builder and lending-player integration boundaries stated", "Community fee redistribution framed as permissionless infrastructure"],
    dependencies: ["financial-protocol-truth-guard", "financial-balance-sheet-truth", "financial-fee-economics", "financial-merchant-network-soundness", "financial-merchant-settlement-local-liquidity", "community-council-handover"],
    links: [link.mechanics, link.charter, link.charterCompanion, link.currentPath, link.masterRef],
    metrics: ["navi_average_progress", "navi_not_started", "navi_metric_link_coverage"],
    nextStep: "Define the Test and Prod milestones for peg maintenance, stable settlement, accounting truth, credit-input visibility, and builder boundaries before treating this destination as active execution.",
    proof: "Protocol mechanics, Charter, master reference, and current state/path define Stables as the peg-maintaining financial system basis, with permissionless rails, community fee mechanisms, and open infrastructure for external builders and financial players."
  },
  "financial-doc-truth-drift-guard": {
    summary: "Maintain a concrete queue of protocol claims to verify before publication: fees, mint/burn, Coverage Fund, xMinima, CR visibility, and Test/Prod wording.",
    kpis: ["Claim queue exists", "Each claim names its source page or card", "Each claim links to the mechanics source", "Each claim is marked pass/fix/open"],
    progress: 25,
    nextStep: "Create the first claim-audit queue from Navi cards, Dashboard labels, and Dapp financial copy.",
    proof: "This card is complete only when a reviewer can open the queue and see each claim with source, authority, decision, and fix status."
  },
  "technical-smart-contract-specification-package": {
    summary: "Prepare the contract specification package before implementation: stablecoin mint/burn, xMinima router, Coverage Fund, merchant payments, future lending boundaries, oracle integrity gating, and invariant enforcement.",
    kpis: ["Mint/burn contract spec row created", "xMinima router spec row created", "Coverage Fund spec row created", "Merchant payment spec row created", "Oracle gating boundary included", "Audit/review status visible"],
    progress: 0,
    dependencies: ["financial-oracle-framework-integrity-gate", "financial-mathematical-annex-stress-model", "financial-secondary-market-dex-liquidity"],
    links: [link.charterCore, link.charterOracle, link.charterRiskAnnex, link.currentPath],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Create the contract-spec checklist and mark each contract as not started, drafting, review, or blocked.",
    proof: "This card is complete only when each contract has scope, invariants, dependencies, risk category, and review status."
  },
  "technical-onchain-anchoring-verification": {
    summary: "Turn Article VIII and Annex D into an anchoring work package: canonical Charter format, hash algorithm, Integritas registration, Council signature threshold, public verification guide, immutable reference ID, and amendment versioning.",
    kpis: ["Canonical format drafted", "Hash procedure drafted", "Integritas registration steps listed", "Council signature threshold identified", "Public verification guide drafted", "Amendment versioning path stated"],
    progress: 8,
    dependencies: ["community-council-creation-charter", "community-governance-transition-mechanics"],
    links: [link.charterAnchoring, link.charterAnchoringAnnex, link.demoLegal, link.onchainWatch],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Draft the anchoring checklist from final document format through public verification.",
    proof: "This card is complete only when a reviewer can follow the anchoring checklist and see which steps are drafted, blocked, or ready."
  },
  "community-public-presence-reach": {
    summary: "Keep one verified public registry for the domain, GitHub organization, Dapp links, links page, Telegram community, Telegram Council, Discord, X, and other social accounts.",
    kpis: ["Domain listed on links page", "GitHub organization listed", "Telegram community listed", "Telegram Council listed", "Discord listed", "X profile listed", "Manual reach baselines recorded"],
    progress: 45,
    metrics: ["community_telegram_ready", "council_official_ready", "social_profiles_ready", "navi_metric_link_coverage"],
    nextStep: "Audit the links page and mark each official public property as live, draft, or missing.",
    proof: "This card is complete only when the links page and Navi card show the official public properties with live/draft/missing status."
  },
  "community-social-profiles-live-registry": {
    summary: "Present the social profile set already put in place: X, Instagram, Facebook page, Facebook group, YouTube, TikTok, Twitch, Moltbook, Telegram Community, Telegram Council, Discord, and GitHub.",
    kpis: ["X profile listed", "Instagram profile listed", "Facebook page listed", "Facebook group listed", "YouTube profile listed", "TikTok profile listed", "Twitch profile listed", "Moltbook profile listed", "Telegram and Discord links listed", "Dashboard reach metrics connected"],
    progress: 35,
    dependencies: ["community-public-presence-reach"],
    links: [link.websiteLinks, link.websiteCommunityLinks, link.githubOrg],
    metrics: ["social_profiles_ready", "x_followers", "instagram_followers", "facebook_page_followers", "facebook_group_members", "youtube_subscribers", "tiktok_followers", "twitch_followers", "moltbook_followers", "discord_members"],
    nextStep: "Add live/draft/future labels to the public links page and record the first manual weekly baselines for each live profile.",
    proof: "This card is complete only when the public links page, Navi card, and Dashboard metrics all show the same official social profile set."
  },
  "community-content-phase-runway": {
    summary: "Maintain a small queue of publishable posts where each post has a topic, target channel, Dapp phase, source card, and publish status.",
    kpis: ["Post queue has at least 5 entries", "Each post names a Dapp phase", "Each post links to a Navi card", "Each post has draft/review/published status"],
    progress: 15,
    metrics: ["x_recent_posts", "instagram_recent_posts", "navi_metric_link_coverage"],
    nextStep: "Build the first five-post queue for Showcase, Demo review, feedback, Ambassador, and Council draft topics.",
    proof: "This card is complete only when the post queue can be reviewed and every row has topic, channel, phase, source card, and status."
  },
  "community-communication-plan": {
    summary: "Write the first public explanation for Navi and Dashboard: what each page shows, what Public Draft means, and where people should give feedback.",
    kpis: ["Short launch explanation drafted", "Public Draft meaning stated", "Navi purpose stated", "Dashboard purpose stated", "Feedback channel included"],
    progress: 20,
    dependencies: ["community-social-profiles-live-registry", "community-communication-platform-strategy"],
    links: [link.communicationPlanPage, link.websiteCommunityLinks, link.websiteCouncilLinks],
    metrics: ["communication_plan_page_ready", "x_recent_posts", "instagram_recent_posts", "agent_total_questions", "agent_answer_gaps", "navi_metric_link_coverage"],
    nextStep: "Draft the launch explanation in publishable language and link it to the feedback route.",
    proof: "This card is complete only when the launch explanation text exists and can be copied into the website/social announcement flow."
  },
  "community-communication-platform-strategy": {
    summary: "Maintain the dedicated public communication-plan page with platform-specific strategy, audience, content format, cadence, measurement, and next action for Facebook, Instagram, X, Telegram, Discord, YouTube, TikTok, Twitch, and future channels.",
    kpis: ["Dedicated page exists", "Facebook strategy drafted", "Instagram strategy drafted", "X strategy drafted", "Telegram strategy drafted", "Discord strategy drafted", "Video-platform strategy drafted", "Measurement links mapped to Dashboard metrics"],
    progress: 25,
    dependencies: ["community-social-profiles-live-registry", "community-content-phase-runway"],
    links: [link.communicationPlanPage, link.contentStrategy, link.toneGuide, link.websiteCommunityLinks],
    metrics: ["communication_plan_page_ready", "social_profiles_ready", "x_recent_posts", "instagram_recent_posts", "facebook_page_followers", "facebook_group_members", "youtube_recent_views", "discord_members", "navi_metric_link_coverage"],
    nextStep: "Turn the page outline into a first 30-day calendar with owners, status, and weekly measurement rows.",
    proof: "This card is complete only when every platform section has audience, role, cadence, content formats, source cards, Dashboard measures, and an inspectable next action."
  },
  "community-public-feedback-intake": {
    summary: "Turn public feedback into a structured intake that can be routed to Demo tasks, content questions, app UX fixes, or future Test requirements.",
    kpis: ["Feedback channels identified", "Routing categories defined", "Review cadence drafted", "Dashboard feedback metrics connected"],
    progress: 25,
    nextStep: "Define the first intake format for Demo reviewers.",
    proof: "Demo release planning and Dashboard manual inputs require feedback to become structured project evidence."
  },
  "community-stablesagent-knowledge-loop": {
    summary: "Record questions that StablesAgent answers poorly, with the missing source, corrected answer, and whether the knowledge base was updated.",
    kpis: ["FAQ gap log created", "Each gap has question and corrected answer", "Each gap links to a source document", "Resolved gaps marked updated"],
    progress: 5,
    nextStep: "Create the FAQ gap log template and seed it with the first real community or internal review questions.",
    proof: "This card is complete only when the log contains inspectable question/source/fix/status rows."
  },
  "community-demo-release-rhythm": {
    summary: "Make Demo releases understandable by pairing each cycle with changelogs, known open items, feedback asks, and visible movement in Navi.",
    kpis: ["Release notes prepared", "Known issues listed", "Feedback ask attached", "Navi cards updated with release evidence"],
    progress: 15,
    nextStep: "Prepare the release rhythm for the next coherent Demo cycle.",
    proof: "Demo tracker and MiniDapp versioning docs define the release evidence that should feed Navi."
  },
  "community-first-review-quest": {
    summary: "Invite the first focused UX review only when the Demo is coherent enough for useful feedback, starting with UX Reviewer as the first tester category.",
    kpis: ["UX Reviewer category scoped", "Review task list drafted", "Feedback reward link noted", "Launch gate tied to Demo readiness"],
    progress: 5,
    nextStep: "Draft the first UX Reviewer quest after the next Demo release bar is confirmed.",
    proof: "User decision selected UX Reviewer as the first tester category; Demo readiness controls timing."
  },
  "community-feedback-farming-program": {
    summary: "Turn useful feedback into visible participation through structured review actions, UX Reviewer loops, and future free testing-app easter eggs.",
    kpis: ["Feedback actions defined", "UX Reviewer loop connected", "Free easter egg reward boundary stated", "No financial reward claim included"],
    progress: 20,
    nextStep: "Define the first feedback actions that can later connect to testing-app easter eggs.",
    proof: "User decision links free testing-app NFT easter eggs to feedback farming while postponing exact placement."
  },
  "community-help-academy-guided-tours": {
    summary: "Own the Help and Academy page path: guided tours, plain-language education, official explanations, and links from high-impact app surfaces.",
    kpis: ["Guided tour entry points listed", "Academy/help sections scoped", "High-impact flow help links identified", "Non-authoritative education boundary stated"],
    progress: 5,
    dependencies: ["community-stablesagent-knowledge-loop", "community-public-feedback-intake"],
    links: [link.demoAcademy, link.demoOfficialLinks, link.websiteCommunityLinks],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Create the Help/Academy checklist for tours, education modules, high-impact flow links, and missing explanations.",
    proof: "This card is complete only when Help and Academy have reviewable routes, source links, and pass/fix/open status."
  },
  "community-ambassador-network": {
    summary: "Build the ambassador layer that can explain Stables locally, collect feedback, prepare merchants, and seed early cluster formation.",
    kpis: ["Ambassador role explained", "Local explanation materials scoped", "Feedback collection role defined", "Merchant preparation dependency visible"],
    progress: 35,
    nextStep: "Turn the ambassador proposition into the first operational role checklist.",
    proof: "Ambassador framework proposition defines the community layer before direct merchant onboarding."
  },
  "community-ambassador-merchant-cell-model": {
    summary: "Show how ambassadors and merchants form small local cells where education, acceptance, liquidity, feedback, and trust grow together.",
    kpis: ["Cell structure described", "Ambassador role connected to merchant role", "Local trust loop explained", "Cluster Spark dependency visible"],
    progress: 25,
    nextStep: "Draft the smallest ambassador/merchant cell model that can be tested in one location.",
    proof: "User decision: merchant concepts should be active immediately and reflected inside the Community Stream."
  },
  "community-merchant-preparation": {
    summary: "Prepare merchants through ambassador-led education, acceptance-flow explanation, early feedback, and realistic expectations about Demo/Test/Prod phases.",
    kpis: ["Merchant onboarding questions listed", "Ambassador preparation path linked", "Demo limitations explained", "Merchant feedback route defined"],
    progress: 20,
    nextStep: "Create the first merchant preparation checklist for ambassadors.",
    proof: "Merchant app cards and ambassador proposition both require community preparation before merchant onboarding can be real."
  },
  "community-cluster-spark": {
    summary: "Define the first local cluster target where ambassadors and merchants reinforce each other before broader Cluster Challenge mechanics exist.",
    kpis: ["First cluster criteria drafted", "Merchant and ambassador roles linked", "Local feedback path included", "Test transition kept future-facing"],
    progress: 12,
    nextStep: "Choose the first reviewable cluster scenario and define its minimum proof.",
    proof: "Cluster Spark was selected as an immediate merchant/community card in the Navi planning review."
  },
  "community-cluster-challenge": {
    summary: "Convert local cluster growth into staged Bronze, Silver, and Gold progression only after Test/Prod mechanics can support real validation.",
    kpis: ["Bronze/Silver/Gold idea documented", "Validation requirements separated from Demo", "No live achievement claim included", "Council link identified"],
    progress: 0,
    nextStep: "Hold progress at 0% until Test validation rules and cluster proof mechanics exist.",
    proof: "Cluster Challenge is a future Test/Prod program and must not imply live validated community achievements today."
  },
  "community-global-growth": {
    summary: "Define the exact checklist a new participant needs: official links, Showcase, Demo feedback, Telegram/Discord, Ambassador path, and first contribution route.",
    kpis: ["Checklist rows written", "Each row has a public link", "Each row has an owner or source card", "Missing assets are marked open"],
    progress: 20,
    nextStep: "Write the first self-onboarding checklist from the public links page, Dapp feedback screen, and Ambassador page.",
    proof: "This card is complete only when a new participant checklist exists with links, owner/source card, and open/done status."
  },
  "community-unified-clusters": {
    summary: "Define the future validation criteria for a federated accepting network: minimum merchants, active users, settlement proof, ambassador coverage, and inter-cluster learning.",
    kpis: ["Minimum merchant count criterion written", "Minimum active-user criterion written", "Settlement proof criterion written", "Ambassador coverage criterion written", "Inter-cluster learning criterion written"],
    progress: 0,
    nextStep: "Keep progress at 0% until Test/Prod can produce real cluster validation evidence.",
    proof: "This card is complete only when the validation criteria exist and each future cluster can be checked against them."
  },
  "community-council-creation-charter": {
    summary: "Present the Charter and Council formation path as the community achievement that eventually governs protocol direction and execution.",
    kpis: ["Charter surfaced clearly", "Council purpose explained", "Community achievement framing used", "Handover dependency visible"],
    progress: 30,
    nextStep: "Review Charter/Council wording for public clarity before launch.",
    proof: "Charter and companion docs define the Council as the governance destination and organizing structure."
  },
  "community-risk-matrix-response-boundaries": {
    summary: "Build the Annex B matrix instead of only naming risks: each risk needs scenario, impact, probability, structural mitigation, monitoring metrics, and response boundaries.",
    kpis: ["12 Annex B risk rows created", "Scenario field completed", "Impact/probability fields drafted", "Structural mitigation linked", "Monitoring metric identified", "Response boundary stated"],
    progress: 15,
    dependencies: ["financial-oracle-framework-integrity-gate", "financial-secondary-market-dex-liquidity", "community-governance-transition-mechanics"],
    links: [link.charterRiskAnnex, link.charterGovernance, link.demoCouncil, link.websiteCouncilLinks],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Create the Annex B risk matrix with the 12 named risk categories and mark each row open/drafted/reviewed.",
    proof: "This card is complete only when every Annex B risk category has a matrix row with mitigation, metric, and response-boundary fields."
  },
  "community-governance-transition-mechanics": {
    summary: "Define the Annex C mechanics for moving from founding execution to open Council stewardship: milestone criteria, locked/flexible/transient decision scopes, approval thresholds, timelocks, seat composition, rotation rules, and time-weighted governance.",
    kpis: ["Decentralisation milestones listed", "Decision scope categories drafted", "Approval thresholds drafted", "Timelock policy drafted", "Seat/rotation rules drafted", "Time-weighted governance mechanics connected"],
    progress: 5,
    dependencies: ["community-council-creation-charter", "community-council-seat-voting-design", "technical-onchain-anchoring-verification"],
    links: [link.charterGovernance, link.charterGovernanceAnnex, link.charterCompanionFounding, link.demoCouncil],
    metrics: ["navi_metric_link_coverage"],
    nextStep: "Write the governance transition table with phase, milestone, decision scope, threshold, timelock, and evidence fields.",
    proof: "This card is complete only when Annex C has a reviewable transition table and each mechanism has source, owner, and open/drafted/reviewed status."
  },
  "community-council-seat-voting-design": {
    summary: "Separate the designed Council seat and voting structure from what is actually live, so Test/Prod governance remains truthful.",
    kpis: ["Seat design described", "Voting model boundaries stated", "Not-live status visible", "Prod governance dependency linked"],
    progress: 0,
    nextStep: "Keep governance progress at 0% until real seat/voting mechanics can be validated.",
    proof: "Council seat and voting design is future governance architecture, not a live production mechanism."
  },
  "community-council-handover": {
    summary: "Define the transition from core development control to Council custody, including assets, contracts, operational responsibility, and execution authority.",
    kpis: ["Handover domains listed", "Asset/contract custody path drafted", "Operational responsibility described", "Prod dependency stated"],
    progress: 0,
    nextStep: "Define the handover milestones that must precede production Council custody.",
    proof: "Charter and current state/path establish Council custody as the long-term handover direction."
  },
  "community-destination": {
    objective: "Reach the production community endpoint where Council governance, pseudonymous identity, ambassador/merchant cells, and local clusters operate with the whole community support.",
    summary: "Stables reaches an autonomous community operating model where the Council governs execution, members participate through pseudonymous identity, and local ambassador/merchant clusters grow and coordinate with the whole community support.",
    kpis: ["Autonomous Council operation model documented", "Pseudonymous on-chain identity path defined", "Local cluster growth model validated", "Ambassador and merchant cells operating independently", "Founder-led control handed over to Council custody"],
    dependencies: ["community-council-creation-charter", "community-council-seat-voting-design", "community-council-handover", "community-ambassador-merchant-cell-model", "community-cluster-challenge", "community-unified-clusters"],
    links: [link.charter, link.charterCompanion, link.currentPath, link.ambassador, link.contentStrategy],
    metrics: ["telegram_council_members", "interested_ambassadors", "navi_average_progress"],
    nextStep: "Define the Test and Prod governance, identity, and cluster milestones required before autonomous Council operation can be treated as active execution.",
    proof: "Charter, companion docs, ambassador framework, and current state/path define autonomous Council operation, pseudonymous identity, and local cluster growth as the production community endpoint."
  }
};

for (const [id, title, stream, category, appPhases, workState, objective] of moreItems) {
  const override = contentOverrides[id] || {};
  const resolvedAppPhases = override.appPhases || (category === "Community Communication And Feedback" ? ["Showcase", "Demo", "Test", "Prod"] : appPhases);
  items.push(card({
    id,
    title,
    stream,
    category,
    appPhases: resolvedAppPhases,
    workState,
    progress: override.progress,
    type: workState === "destination" ? "destination" : "work-item",
    objective: override.objective || objective,
    summary: override.summary || objective,
    compactSignal: workState === "destination" ? "Destination" : category,
    kpis: override.kpis || [`${title} pass/fail checkpoint written`, `${category} evidence source attached`, "Done/open status visible"],
    dependencies: override.dependencies,
    links: override.links || [link.review],
    metrics: override.metrics,
    charterRefs: override.charterRefs,
    riskRefs: override.riskRefs,
    dappRefs: override.dappRefs,
    nextStep: override.nextStep || "Define the first pass/fail checkpoint and the evidence source that will prove this card is complete.",
    proof: override.proof || "This card is complete only when a reviewer can inspect the output, owner/source, and done/open status."
  }));
}

for (const item of items) {
  if (item.category === "Community Communication And Feedback") {
    item.appPhases = ["Showcase", "Demo", "Test", "Prod"];
    item.phaseSummary = item.appPhases.join(" + ");
  }
}

const ids = new Set();
for (const item of items) {
  if (ids.has(item.id)) throw new Error(`Duplicate Navi id: ${item.id}`);
  ids.add(item.id);
}

const next = {
  version: "0.2",
  updated: today,
  statusValues: current.statusValues,
  itemTypes: current.itemTypes,
  streams: current.streams,
  categories,
  categoryDescriptions,
  items,
  appPhases: current.appPhases,
  model: {
    ...(current.model || {}),
    categoryValues: categories,
    sourceNote: "Navi is the structural source for streams, categories, active work, destinations, and Dapp phase placement."
  }
};

fs.writeFileSync(naviPath, JSON.stringify(next, null, 2) + "\n");
console.log(`Wrote ${items.length} Navi cards to ${path.relative(process.cwd(), naviPath)}.`);
