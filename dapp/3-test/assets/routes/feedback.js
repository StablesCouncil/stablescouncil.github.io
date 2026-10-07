/**
 * Feedback page: structured public submission (POST to optional API) + Telegram block.
 * Local ledger + server: see 1_development/stream_2_community/task_x_public_feedback_ledger/
 */
(function () {
  const FEEDBACK_SCHEMA_VERSION = 1;
  const TOPIC_ACTIVE = [
    'general_concept',
    'financial_structure',
    'technical_decision',
    'app',
    'other',
    'open_text'
  ];
  const KIND_ACTIVE = ['comment', 'improvement', 'bug', 'other'];

  const PLATFORM_OPTIONS = [
    { id: 'web', label: 'Web app (browser)' },
    { id: 'minidapp', label: 'MiniDapp (Minima hub zip)' },
    { id: 'android', label: 'Android app (APK)' }
  ];

  const MINIDAPP_PAGE_OPTIONS = [
    { id: 'wallet', label: 'Wallet' },
    { id: 'invest', label: 'Invest' },
    { id: 'exchange', label: 'Exchange' },
    { id: 'onoff-ramp', label: 'On / Off ramp' },
    { id: 'mint', label: 'Mint' },
    { id: 'spend', label: 'Spend (Merchants)' },
    { id: 'ambassador', label: 'Ambassador' },
    { id: 'my-shop', label: 'My shop' },
    { id: 'chat', label: 'Chat' },
    { id: 'council-comms', label: 'Council communications' },
    { id: 'council', label: 'Council' },
    { id: 'treasury', label: 'Treasury' },
    { id: 'faucet', label: 'Get Winiwa' },
    { id: 'settings-profile', label: 'Settings  -  My profile' },
    { id: 'settings-updates', label: 'Settings and updates' },
    { id: 'settings-security', label: 'Security' },
    { id: 'settings-legal', label: 'Legal & notices' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'activity', label: 'Activity' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'feedback', label: 'Feedback' }
  ];

  const ANDROID_PAGE_OPTIONS = MINIDAPP_PAGE_OPTIONS.map(function (o) {
    return { id: 'android:' + o.id, label: o.label };
  }).concat([
    { id: 'android:native-shell', label: 'Native shell (install, permissions)' },
    { id: 'android:apk-update', label: 'APK update (Settings)' },
    { id: 'android:embedded-node', label: 'Embedded Minima node' }
  ]);

  const WEB_PAGE_OPTIONS = [
    { id: 'homepage', label: 'Homepage' },
    { id: 'links', label: 'Links hub' },
    { id: 'playing-field', label: 'Playing field' },
    { id: 'circular-economy', label: 'Circular economy' },
    { id: 'banking-system', label: 'Banking system infographic' },
    { id: 'ambassadors-program', label: 'Ambassadors program' },
    { id: 'onchain-watch', label: 'Minima onchain watch' },
    { id: 'agent-chat', label: 'StablesAgent web chat' },
    { id: 'council-navigation', label: 'Council navigation system' },
    { id: 'council-dashboard', label: 'Council dashboard' },
    { id: 'communication-plan', label: 'Communication plan' },
    { id: 'brand-assets', label: 'Brand assets' }
  ];

  const PAGE_OPTIONS_BY_PLATFORM = {
    web: WEB_PAGE_OPTIONS,
    minidapp: MINIDAPP_PAGE_OPTIONS,
    android: ANDROID_PAGE_OPTIONS
  };

  function getFeedbackDbUrl() {
    var c = window.STABLES_CONFIG || {};
    return (
      c.FEEDBACK_PUBLIC_DB_URL ||
      'https://github.com/StablesCouncil/StablesCouncil.github.io/tree/main/feedback'
    );
  }

  /**
   * Production: FEEDBACK_SUBMIT_URL (default agent.stablescouncil.org/api/feedback).
   * Localhost / 127.0.0.1: use ledger test server on 127.0.0.1:8788 unless FEEDBACK_SKIP_LOCAL_SUBMIT is true.
   */
  function getFeedbackSubmitUrl() {
    var c = window.STABLES_CONFIG || {};
    var primary = c.FEEDBACK_SUBMIT_URL != null ? String(c.FEEDBACK_SUBMIT_URL).trim() : '';
    if (!primary) primary = 'https://agent.stablescouncil.org/api/feedback';
    var h = (window.location && window.location.hostname) || '';
    var isLocalHost = h === 'localhost' || h === '127.0.0.1' || h === '::1';
    // When a Minima node is connected, the POST is sent via MDS.net.POST, which runs ON the
    // node, so a 127.0.0.1 URL would hit the node's own loopback (nothing listening there,
    // "Connection refused: getsockopt"). Only use the local ledger test server for genuine
    // local BROWSER dev with no node session.
    var mdsActive = typeof MDS !== 'undefined' && MDS && MDS.net &&
      typeof MDS.mainhost === 'string' && MDS.mainhost.length > 0;
    if (isLocalHost && !c.FEEDBACK_SKIP_LOCAL_SUBMIT && !mdsActive) {
      return 'http://127.0.0.1:8788/api/feedback';
    }
    return primary;
  }

  function getAppBuild() {
    if (typeof window.stablesBuildLabel === 'function') {
      return String(window.stablesBuildLabel()).replace(/^v/, '');
    }
    return (window.STABLES_CONFIG && window.STABLES_CONFIG.APP_BUILD_VERSION) || 'unknown';
  }

  function getDemoFeedbackRoadmapConfig() {
    var c = window.STABLES_CONFIG || {};
    var r = c.DEMO_FEEDBACK_ROADMAP || {};
    return {
      summary:
        r.summary ||
        'Review the live demo against channel truth, native Minima wallet behaviour, demo-only Winiwa and Wables flows, merchant-first ramps, Coverage fund copy, links, and feedback routing.',
      nowReview: r.nowReview || 'Wallet, Mint, Coverage fund, On/Off Ramp, Settings, links',
      comingSoon: r.comingSoon || 'App feedback topic, bug reports, roadmap votes',
      nextModules: r.nextModules || 'Personal themes, merchant validation, academy lessons',
      footnote:
        r.footnote ||
        'Use the form below for concept, financial, and technical comments today.'
    };
  }

  function buildFeedbackRoadmapBlock() {
    var roadmap = getDemoFeedbackRoadmapConfig();
    /* Page review 2026-10 (D120): what this test covers, after the form, as three plain rows. The version kicker
       and the summary paragraph named an older build than the one running (0.0.11.88 under 0.0.12.059). */
    void getAppBuild;
    return (
      '<div class="app-section app-section--caption-bottom">' +
      '<div class="stitle-row">' +
      '<div class="stitle">What this test covers</div>' +
      '</div>' +
      '<div class="ui-list">' +
      '<div class="ui-list-row feedback-roadmap-row"><span class="ui-list-row__main"><span class="ui-list-row__name">To review now</span><span class="ui-list-row__sub">' + roadmap.nowReview + '</span></span></div>' +
      '<div class="ui-list-row feedback-roadmap-row"><span class="ui-list-row__main"><span class="ui-list-row__name">Coming soon</span><span class="ui-list-row__sub">' + roadmap.comingSoon + '</span></span></div>' +
      '<div class="ui-list-row feedback-roadmap-row"><span class="ui-list-row__main"><span class="ui-list-row__name">Later</span><span class="ui-list-row__sub">' + roadmap.nextModules + '</span></span></div>' +
      '</div></div>'
    );
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setDisplay(id, on) {
    var n = el(id);
    if (n) n.style.display = on ? 'block' : 'none';
  }

  function updateFeedbackTopicUI() {
    var domain = (el('feedbackStructDomain') && el('feedbackStructDomain').value) || '';
    setDisplay('feedbackGroupFinancial', domain === 'financial_structure');
    setDisplay('feedbackGroupTechnical', domain === 'technical_decision');
    setDisplay('feedbackGroupApp', domain === 'app');
    setDisplay('feedbackGroupOpenText', domain === 'open_text');
    setDisplay('feedbackGroupOtherHint', domain === 'other');
  }

  function buildPlatformSelectOptions() {
    return PLATFORM_OPTIONS.map(function (o) {
      return '<option value="' + o.id + '">' + o.label + '</option>';
    }).join('');
  }

  function buildPageSelectOptions(platform) {
    var pages = PAGE_OPTIONS_BY_PLATFORM[platform] || [];
    return pages.map(function (o) {
      return '<option value="' + o.id + '">' + o.label + '</option>';
    }).join('');
  }

  function updateFeedbackSendButtonTone() {
    var consent = el('feedbackStructConsent');
    var btn = el('feedbackStructSend');
    if (!btn) return;
    var canSend = !!(consent && consent.checked) && !!getFeedbackSubmitUrl();
    btn.disabled = !canSend;
    btn.classList.remove('btn-primary', 'btn-disabled');
    btn.classList.add(canSend ? 'btn-primary' : 'btn-disabled');
    btn.setAttribute('aria-disabled', canSend ? 'false' : 'true');
  }

  function updateFeedbackAppPageSelect() {
    var platformEl = el('feedbackStructAppPlatform');
    var pageEl = el('feedbackStructAppPage');
    if (!platformEl || !pageEl) return;
    var platform = platformEl.value || '';
    var prev = pageEl.value;
    pageEl.innerHTML =
      '<option value="">Choose page…</option>' + (platform ? buildPageSelectOptions(platform) : '');
    pageEl.disabled = !platform;
    if (prev && platform) {
      var still = Array.prototype.some.call(pageEl.options, function (opt) {
        return opt.value === prev;
      });
      if (still) pageEl.value = prev;
    }
  }

  function buildFeedbackFormHtml() {
    var dbUrl = getFeedbackDbUrl();
    return (
      /* Page review 2026-10 (D120): the form is the page, so it comes first. That everything sent is public is
         safety copy and stays, said once and plainly by the Send button instead of five times over the page. */
      '<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20">' +
      '<div class="stitle-row">' +
      '<div class="stitle">Send feedback</div>' +
      '</div>' +
      '<div class="card app-section-card feedback-form-card">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Topic area</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructDomain" style="width:100%;margin-bottom:8px" aria-label="Topic area">' +
      '<option value="">Choose…</option>' +
      '<option value="general_concept">General concept</option>' +
      '<option value="financial_structure">Financial structure</option>' +
      '<option value="technical_decision">Technical decision</option>' +
      '<option value="app">App</option>' +
      '<option value="other">Other (structured)</option>' +
      '<option value="open_text">Open topic (free form)</option>' +
      '</select>' +
      '<div id="feedbackGroupFinancial"  style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Financial structure: detail</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructFinancialSub" style="width:100%;margin-bottom:8px">' +
      '<option value="idea">Idea</option><option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupTechnical"  style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Technical: detail</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructTechnicalSub" style="width:100%;margin-bottom:8px">' +
      '<option value="community_communication">Community communication</option>' +
      '<option value="smart_contract">Smart contract</option>' +
      '<option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupApp"  style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Platform</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructAppPlatform" style="width:100%;margin-bottom:10px" aria-label="Platform">' +
      '<option value="">Choose platform…</option>' +
      buildPlatformSelectOptions() +
      '</select>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Page</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructAppPage" style="width:100%;margin-bottom:10px" aria-label="Page" disabled>' +
      '<option value="">Choose page…</option>' +
      '</select>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Section (short hint)</label>' +
      '<input class="finput" id="feedbackStructAppSection" type="text" placeholder="e.g. Coverage fund card" style="width:100%;margin-bottom:10px" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Element (short hint)</label>' +
      '<input class="finput" id="feedbackStructAppElement" type="text" placeholder="e.g. Deposit button" style="width:100%;margin-bottom:10px" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">App topic</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructAppAspect" aria-label="App topic" style="width:100%;margin-bottom:8px">' +
      '<option value="design">Design</option>' +
      '<option value="functionality">Functionalities</option>' +
      '<option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupOpenText"  style="display:none">' +
      '<p class="xs mu" style="margin:0 0 8px;line-height:1.5;font-weight:800;color:var(--m)">We offer this so nothing is blocked, but <strong>free-form items may take longer</strong> to triage than structured feedback.</p></div>' +
      '<div id="feedbackGroupOtherHint"  style="display:none">' +
      '<p class="xs mu" style="margin:0;line-height:1.5;font-weight:700;color:var(--muted)">Use the title and description below to name the area (protocol, ops, docs, …).</p></div>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Feedback type</label>' +
      '<select data-mx-dropdown class="fsel" id="feedbackStructKind" aria-label="Feedback type" style="width:100%;margin-bottom:12px">' +
      '<option value="comment">Comment</option>' +
      '<option value="improvement">Improvement</option>' +
      '<option value="bug">Bug</option>' +
      '<option value="other">Other</option></select>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Title (short)</label>' +
      '<input class="finput" id="feedbackStructTitle" type="text" aria-label="Feedback title" maxlength="200" style="width:100%;margin-bottom:12px" placeholder="One line summary" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Details</label>' +
      '<textarea class="finput" id="feedbackStructBody" aria-label="Feedback details" rows="5" style="width:100%;margin-bottom:12px;resize:vertical" placeholder="What you want the Council / builders to know"></textarea>' +
      '<details class="ui-disclosure feedback-optional">' +
      '<summary class="ui-list-row"><span class="ui-list-row__ic" aria-hidden="true">&#x1F464;</span><span class="ui-list-row__main"><span class="ui-list-row__name">Add a public address or contact</span><span class="ui-list-row__sub">Optional, published with your feedback</span></span><span class="ui-list-row__chev" aria-hidden="true"></span></summary>' +
      '<div class="ui-disclosure__body">' +
      '<p class="xs mu" style="margin:0 0 10px">Use a new Minima address kept only for this, never your main wallet.</p>' +
      '<label class="flabel" for="feedbackStructMinimaAddr">Minima address</label>' +
      '<input class="finput" id="feedbackStructMinimaAddr" type="text" aria-label="Optional public Minima address" maxlength="200" style="width:100%;margin-bottom:12px" placeholder="Mx..." />' +
      '<label class="flabel" for="feedbackStructContact">Public contact</label>' +
      '<input class="finput" id="feedbackStructContact" type="text" aria-label="Optional public contact" style="width:100%;margin-bottom:4px" placeholder="e.g. a public @handle" />' +
      '</div></details>' +
      '<p class="feedback-public-line">Everything you send is public on GitHub, for ever. Never include personal data, keys or your Vault key.</p>' +
      '<label class="feedback-consent">' +
      '<input type="checkbox" id="feedbackStructConsent" />' +
      '<span>I understand this is public</span></label>' +
      '<button type="button" id="feedbackStructSend" class="btn btn-w btn-lg btn-primary" disabled onclick="window.feedbackSend()">Send</button>' +
      '</div></div>' +
      '<div class="app-section app-section--caption-bottom">' +
      '<div class="ui-list">' +
      '<a class="ui-list-row" href="' + dbUrl + '" id="feedbackPublicDbLink" target="_blank" rel="noopener noreferrer"><span class="ui-list-row__ic" aria-hidden="true">&#x1F4C2;</span><span class="ui-list-row__main"><span class="ui-list-row__name">See what others sent</span><span class="ui-list-row__sub">GitHub</span></span><span class="ui-list-row__chev" aria-hidden="true"></span></a>' +
      '<a class="ui-list-row" href="https://t.me/stablescommunity" id="feedbackTelegramMain" target="_blank" rel="noopener"><span class="ui-list-row__ic" aria-hidden="true">&#x1F4AC;</span><span class="ui-list-row__main"><span class="ui-list-row__name">Telegram community</span><span class="ui-list-row__sub">In private: @stablescouncil</span></span><span class="ui-list-row__chev" aria-hidden="true"></span></a>' +
      '</div></div>'
    );
  }

  // D120: the Telegram row now sits with "See what others sent" under the form.
  const FEEDBACK_TELEGRAM_BLOCK = '';

  function collectTopicSub(domain) {
    if (domain === 'financial_structure') return el('feedbackStructFinancialSub').value;
    if (domain === 'technical_decision') return el('feedbackStructTechnicalSub').value;
    if (domain === 'app') return el('feedbackStructAppAspect').value;
    if (domain === 'other') return 'other';
    return null;
  }

  function buildPayload() {
    var domain = el('feedbackStructDomain').value;
    if (!domain) return { error: 'Choose a topic area.' };
    if (TOPIC_ACTIVE.indexOf(domain) === -1) {
      return { error: 'Choose a topic area.' };
    }
    var title = (el('feedbackStructTitle').value || '').trim();
    var body = (el('feedbackStructBody').value || '').trim();
    if (!title) return { error: 'Add a short title.' };
    if (!body) return { error: 'Add details.' };
    if (!el('feedbackStructConsent').checked) return { error: 'Confirm the public publication checkbox to send.' };

    var contact = (el('feedbackStructContact').value || '').trim();
    if (contact.length > 500) return { error: 'Public contact is too long (max 500 characters).' };

    var minimaAddr = (el('feedbackStructMinimaAddr').value || '').trim();
    if (minimaAddr.length > 200) return { error: 'Minima address is too long.' };

    var appCtx = { page_id: null, section_hint: null, element_hint: null };
    if (domain === 'app') {
      var platform = (el('feedbackStructAppPlatform') && el('feedbackStructAppPlatform').value) || '';
      var page = (el('feedbackStructAppPage') && el('feedbackStructAppPage').value) || '';
      if (!platform) return { error: 'Choose a platform.' };
      if (!page) return { error: 'Choose a page.' };
      if (platform === 'web') {
        appCtx.page_id = 'web:' + page;
      } else if (platform === 'android') {
        appCtx.page_id = page.indexOf('android:') === 0 ? page : 'android:' + page;
      } else {
        appCtx.page_id = page;
      }
      appCtx.section_hint = (el('feedbackStructAppSection').value || '').trim() || null;
      appCtx.element_hint = (el('feedbackStructAppElement').value || '').trim() || null;
    }

    var topicSub = collectTopicSub(domain);
    var kind = el('feedbackStructKind').value;
    if (KIND_ACTIVE.indexOf(kind) === -1) {
      return { error: 'Choose a feedback type.' };
    }

    return {
      payload: {
        schema_version: FEEDBACK_SCHEMA_VERSION,
        submitted_at: new Date().toISOString(),
        source: { app_build: getAppBuild(), client: 'stables-minidapp' },
        topic_domain: domain,
        topic_sub: topicSub,
        app_context: appCtx,
        kind: kind,
        title: title,
        body: body,
        optional_minima_address: minimaAddr || null,
        public_contact: contact || null,
        consent_public_ledger: true,
        flags: { low_priority_freeform: domain === 'open_text' }
      }
    };
  }

  function feedbackNotify(msg, ok) {
    if (typeof window.showToast === 'function') {
      var m = msg != null ? String(msg) : '';
      if (ok) {
        window.showToast(m, m.length > 72 ? { prose: true, durationMs: 5500 } : { durationMs: 3500 });
      } else {
        window.showToast(m, {
          prose: true,
          tone: 'amber',
          durationMs: Math.min(14000, 5200 + Math.min(m.length * 35, 7000))
        });
      }
    } else if (typeof window.stablesNotify === 'function') {
      // D023 law 1: a missing notice channel is answered by the app, never by a platform dialog.
      window.stablesNotify(msg, ok ? undefined : { tone: 'amber' });
    }
  }

  /**
   * POST JSON to feedback API. On Minima node use `MDS.net.POST` (no CORS). In browser use `fetch`.
   */
  function postFeedbackJson(url, payload) {
    var mdsNetReady =
      typeof MDS !== 'undefined' &&
      MDS.net &&
      typeof MDS.mainhost === 'string' &&
      MDS.mainhost.length > 0;
    if (mdsNetReady && typeof MDS.net.POST === 'function') {
      return new Promise(function (resolve, reject) {
        var body = JSON.stringify(payload);
        MDS.net.POST(url, body, function (resp) {
          if (!resp) {
            reject(new Error('No response from node'));
            return;
          }
          if (!resp.status) {
            reject(new Error(resp.error || 'MDS network request failed'));
            return;
          }
          var t = resp.response || '';
          var data;
          try {
            data = JSON.parse(t);
          } catch (e) {
            data = { error: t || 'Invalid JSON', ok: false };
          }
          resolve({ res: { ok: true, status: 200 }, data: data, raw: t });
        });
      });
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text().then(function (t) {
        var data;
        try {
          data = JSON.parse(t);
        } catch (e) {
          data = { error: t || res.statusText };
        }
        return { res: res, data: data };
      });
    });
  }

  function hideSubmitSuccess() {
    if (typeof window.closeModal === 'function' && el('feedbackSuccessModal')) {
      window.closeModal('feedbackSuccessModal');
    }
  }

  function showSubmitSuccess(text) {
    var p = el('feedbackSuccessModalBody');
    if (p) p.textContent = text;
    if (typeof window.openModal === 'function' && el('feedbackSuccessModal')) {
      window.openModal('feedbackSuccessModal');
    } else {
      feedbackNotify(text, true);
    }
  }

  window.feedbackSend = function () {
    var url = getFeedbackSubmitUrl();
    var r = buildPayload();
    if (r.error) {
      feedbackNotify(r.error);
      return;
    }

    var btn = el('feedbackStructSend');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
    }
    hideSubmitSuccess();

    postFeedbackJson(url, r.payload)
      .then(function (out) {
        var res = out.res;
        var data = out.data || {};
        var httpOk = true;
        if (res && typeof res.ok === 'boolean' && typeof res.status === 'number') {
          httpOk = res.ok;
        }
        if (!httpOk) {
          var rawErr0 = (data && data.error) || '';
          var err0 = rawErr0 || 'Send failed (' + (res && res.status) + ')';
          if (res && res.status === 404 && String(rawErr0).trim() === 'Not found') {
            err0 =
              'Feedback API missing (404). Deploy web_agent with POST /api/feedback, or test at http://127.0.0.1 with feedback_submit_server on port 8788.';
          }
          throw new Error(err0);
        }
        if (!data.ok) {
          var rawErr = (data && data.error) || '';
          var err = rawErr || 'Send failed';
          if (res && res.status === 404 && String(rawErr).trim() === 'Not found') {
            err =
              'Feedback API missing (404). Deploy web_agent with POST /api/feedback, or test at http://127.0.0.1 with feedback_submit_server on port 8788.';
          }
          throw new Error(err);
        }
        var msg =
          'Your feedback was added as ' +
          (data.id || 'a new file') +
          (data.html_url ? '. Open GitHub to view it.' : '. It is in the public folder.');
        showSubmitSuccess(msg);
        el('feedbackStructTitle').value = '';
        el('feedbackStructBody').value = '';
        el('feedbackStructContact').value = '';
        el('feedbackStructMinimaAddr').value = '';
        el('feedbackStructConsent').checked = false;
        updateFeedbackSendButtonTone();
      })
      .catch(function (e) {
        var msg = e && e.message ? String(e.message) : 'Send failed';
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          msg =
            msg +
            ' If you are on a Minima node, ensure you are online; the app uses the node network for feedback.';
        }
        feedbackNotify(msg);
      })
      .finally(function () {
        if (btn) {
          btn.textContent = 'Send';
          updateFeedbackSendButtonTone();
        }
      });
  };

  function renderFeedback(ctx) {
    var $ = ctx.$;
    var app = ctx.app;
    if ($ && $('pageTitle')) $('pageTitle').textContent = '';
    if ($ && $('pageDesc')) $('pageDesc').textContent = '';
    if (typeof ctx.setHeaderButtons === 'function') ctx.setHeaderButtons([]);
    if (!app) return;
    app.innerHTML = '<div>' + buildFeedbackFormHtml() + buildFeedbackRoadmapBlock() + FEEDBACK_TELEGRAM_BLOCK + '</div>';
    wireFeedbackForm(app);
  }

  function wireFeedbackForm(root) {
    var d = root.querySelector('#feedbackStructDomain');
    if (d) d.addEventListener('change', updateFeedbackTopicUI);
    if (d && !d.value) d.value = 'general_concept';
    var platform = root.querySelector('#feedbackStructAppPlatform');
    if (platform) platform.addEventListener('change', updateFeedbackAppPageSelect);
    var consent = root.querySelector('#feedbackStructConsent');
    if (consent) consent.addEventListener('change', updateFeedbackSendButtonTone);
    updateFeedbackTopicUI();
    updateFeedbackAppPageSelect();
    updateFeedbackSendButtonTone();
  }

  window.renderFeedbackPage = function renderFeedbackPage() {
    var root = document.getElementById('feedbackApp');
    if (!root) return;
    root.innerHTML = '<div>' + buildFeedbackFormHtml() + buildFeedbackRoadmapBlock() + FEEDBACK_TELEGRAM_BLOCK + '</div>';
    wireFeedbackForm(root);
  };

  window.StablesRoutes = window.StablesRoutes || {};
  window.StablesRoutes.renderFeedback = renderFeedback;
})();
