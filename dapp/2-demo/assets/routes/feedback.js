/**
 * Feedback page: structured public submission (POST to optional API) + Telegram block.
 * Local ledger + server: see 1_development/stream_2_community/task_x_public_feedback_ledger/
 */
(function () {
  const FEEDBACK_SCHEMA_VERSION = 1;
  const TOPIC_ACTIVE = ['general_concept', 'financial_structure', 'technical_decision'];
  const KIND_ACTIVE = ['comment'];

  const APP_PAGE_OPTIONS = [
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
    { id: 'settings-profile', label: 'Settings — My profile' },
    { id: 'settings-updates', label: 'Settings and updates' },
    { id: 'settings-security', label: 'Security' },
    { id: 'settings-legal', label: 'Legal & notices' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'activity', label: 'Activity' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'feedback', label: 'Feedback' }
  ];

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
    if (isLocalHost && !c.FEEDBACK_SKIP_LOCAL_SUBMIT) {
      return 'http://127.0.0.1:8788/api/feedback';
    }
    return primary;
  }

  function getAppBuild() {
    return (window.STABLES_CONFIG && window.STABLES_CONFIG.APP_BUILD_VERSION) || 'unknown';
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

  function buildPageSelectOptions() {
    return APP_PAGE_OPTIONS.map(function (o) {
      return '<option value="' + o.id + '">' + o.label + '</option>';
    }).join('');
  }

  function buildFeedbackFormHtml() {
    var dbUrl = getFeedbackDbUrl();
    return (
      '<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20">' +
      '<div class="stitle-row">' +
      '<div class="stitle">Public feedback (GitHub)</div>' +
      '<button type="button" class="agent-mini-btn" onclick="openAgentExplain(\'Feedback: public ledger on GitHub; Send posts JSON when the Council wires the endpoint; no secrets\')" title="StablesAgent">' +
      '<img src="agent.png" alt="StablesAgent">' +
      '</button></div>' +
      '<div class="card app-section-card" style="padding:14px 16px;margin-bottom:14px;border:1px solid rgba(251,191,36,0.35);background:rgba(251,191,36,0.08)">' +
      '<div style="font-size:12px;font-weight:900;color:#fbbf24;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Public ledger</div>' +
      '<p class="sec-body" style="margin:0 0 10px;line-height:1.55;font-weight:800;color:var(--t)">Do not include personal data, private keys, seed phrases, or anything you are not comfortable sharing <strong>forever</strong> in the open.</p>' +
      '<p class="xs mu" style="margin:0;line-height:1.5;font-weight:700">Submissions go to a <a href="' + dbUrl + '" target="_blank" rel="noopener noreferrer" style="color:var(--c);font-weight:900;text-decoration:underline">public GitHub folder</a>. Anyone can read them. Optional fields below are still <strong>public</strong>.</p>' +
      '</div>' +
      '<div class="card app-section-card" style="padding:14px 16px;margin-bottom:14px;border:1px solid rgba(103,232,249,.12)">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Topic area</label>' +
      '<select class="fsel" id="feedbackStructDomain" style="width:100%;margin-bottom:8px" aria-label="Topic area">' +
      '<option value="">Choose…</option>' +
      '<option value="general_concept">General concept</option>' +
      '<option value="financial_structure">Financial structure</option>' +
      '<option value="technical_decision">Technical decision</option>' +
      '<option value="app" disabled>App (MiniDapp) - available shortly</option>' +
      '<option value="other" disabled>Other (structured) - available shortly</option>' +
      '<option value="open_text" disabled>Open topic (free form) - available shortly</option>' +
      '</select>' +
      '<p class="xs mu" style="margin:0 0 10px;line-height:1.45;color:var(--am);font-weight:800">Some topic areas are not active yet. These will be made available shortly (you are early).</p>' +
      '<div id="feedbackGroupFinancial" style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Financial structure: detail</label>' +
      '<select class="fsel" id="feedbackStructFinancialSub" style="width:100%;margin-bottom:8px">' +
      '<option value="idea">Idea</option><option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupTechnical" style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Technical: detail</label>' +
      '<select class="fsel" id="feedbackStructTechnicalSub" style="width:100%;margin-bottom:8px">' +
      '<option value="community_communication">Community communication</option>' +
      '<option value="smart_contract">Smart contract</option>' +
      '<option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupApp" style="display:none">' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Page</label>' +
      '<select class="fsel" id="feedbackStructAppPage" style="width:100%;margin-bottom:10px">' +
      '<option value="">Choose page…</option>' +
      buildPageSelectOptions() +
      '</select>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Section (short hint)</label>' +
      '<input class="finput" id="feedbackStructAppSection" type="text" placeholder="e.g. Coverage fund card" style="width:100%;margin-bottom:10px" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Element (short hint)</label>' +
      '<input class="finput" id="feedbackStructAppElement" type="text" placeholder="e.g. Deposit button" style="width:100%;margin-bottom:10px" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">App topic</label>' +
      '<select class="fsel" id="feedbackStructAppAspect" style="width:100%;margin-bottom:8px">' +
      '<option value="design">Design</option>' +
      '<option value="functionality">Functionalities</option>' +
      '<option value="other">Other</option></select></div>' +
      '<div id="feedbackGroupOpenText" style="display:none">' +
      '<p class="xs mu" style="margin:0 0 8px;line-height:1.5;font-weight:800;color:var(--m)">We offer this so nothing is blocked, but <strong>free-form items may take longer</strong> to triage than structured feedback.</p></div>' +
      '<div id="feedbackGroupOtherHint" style="display:none">' +
      '<p class="xs mu" style="margin:0;line-height:1.5;font-weight:700;color:var(--muted)">Use the title and description below to name the area (protocol, ops, docs, …).</p></div>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Feedback type</label>' +
      '<select class="fsel" id="feedbackStructKind" style="width:100%;margin-bottom:8px">' +
      '<option value="comment">Comment</option>' +
      '<option value="improvement" disabled>Improvement - available shortly</option>' +
      '<option value="bug" disabled>Bug - available shortly</option>' +
      '<option value="other" disabled>Other - available shortly</option></select>' +
      '<p class="xs mu" style="margin:0 0 12px;line-height:1.45;color:var(--am);font-weight:800">For now, only Comment is active. More feedback types are coming shortly.</p>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Title (short)</label>' +
      '<input class="finput" id="feedbackStructTitle" type="text" maxlength="200" style="width:100%;margin-bottom:12px" placeholder="One line summary" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Details</label>' +
      '<textarea class="finput" id="feedbackStructBody" rows="5" style="width:100%;margin-bottom:12px;resize:vertical" placeholder="What you want the Council / builders to know"></textarea>' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:var(--muted)">Minima address (optional) <span aria-hidden="true">🚜</span></label>' +
      '<p class="xs mu" style="margin:0 0 8px;line-height:1.45;font-weight:800;color:var(--muted)">Hey, we never know what the future will be made of. This field is optional and <strong>public</strong>. <strong>No engagement, no promise</strong> here. Everything will be decided by the Council.</p>' +
      '<p class="xs mu" style="margin:0 0 8px;line-height:1.45;font-weight:800;color:var(--t)">We <strong>strongly recommend</strong> a <strong>new Minima address used only for this feedback</strong>, separate from your main wallet. That matters <strong>even more</strong> if you also add an <strong>email</strong> (or other contact) in the <strong>next step</strong>.</p>' +
      '<input class="finput" id="feedbackStructMinimaAddr" type="text" maxlength="200" style="width:100%;margin-bottom:12px" placeholder="Optional Minima address (public if filled)" />' +
      '<label class="xs mu" style="display:block;font-weight:900;margin-bottom:6px;color:#fbbf24">Public contact (optional)</label>' +
      '<p class="xs mu" style="margin:0 0 6px;line-height:1.45;font-weight:800;color:#fbbf24">If you fill this, it is <strong>published with the JSON</strong>. Use only a contact you already treat as public. If you add <strong>email</strong> here, the feedback-only Minima address above is <strong>especially</strong> recommended.</p>' +
      '<input class="finput" id="feedbackStructContact" type="text" style="width:100%;margin-bottom:12px" placeholder="e.g. public @handle or email (optional)" />' +
      '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:14px">' +
      '<input type="checkbox" id="feedbackStructConsent" style="margin-top:4px;flex-shrink:0" />' +
      '<span class="xs mu" style="line-height:1.45;font-weight:800;color:var(--t)">I confirm this message is OK to publish on GitHub, contains no personal secrets, and I understand anyone can read it (including any optional address or contact I add).</span></label>' +
      '<button type="button" id="feedbackStructSend" class="btn btn-w" style="width:100%;margin-bottom:10px" onclick="window.feedbackSend()">Send</button>' +
      '<a href="' +
      dbUrl +
      '" id="feedbackPublicDbLink" target="_blank" rel="noopener noreferrer" class="btn btn-g btn-w" style="display:block;width:100%;text-align:center;box-sizing:border-box;text-decoration:none;padding:14px 16px;font-size:14px;font-weight:900;border-radius:16px">See what others sent (GitHub)</a>' +
      '</div></div>'
    );
  }

  const FEEDBACK_TELEGRAM_BLOCK =
    '<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20">' +
    '<div class="stitle-row">' +
    '<div class="stitle">Telegram</div>' +
    '<button type="button" class="agent-mini-btn" onclick="openAgentExplain(\'Feedback: reach Stables on Telegram (community and core team)\')" title="StablesAgent">' +
    '<img src="agent.png" alt="StablesAgent">' +
    '</button></div>' +
    '<div class="card app-section-card" style="padding:14px 14px;border-radius:14px;background:rgba(0,0,0,.22);border:1px solid rgba(103,232,249,.12)">' +
    '<div style="font-size:14px;font-weight:900;color:var(--accent);margin-bottom:12px">Community &amp; team</div>' +
    '<p style="margin:0 0 16px;font-size:14px;line-height:1.6;font-weight:800;color:var(--muted)">' +
    'There are two ways to reach us, both on Telegram. Use the button below to open the Stables community: share feedback there with everyone and join the discussion. To contact the core dev team in private, open Telegram and start a chat with <strong style="color:var(--t)">@stablescouncil</strong>.' +
    '</p>' +
    '<a href="https://t.me/stablescommunity" id="feedbackTelegramMain" target="_blank" rel="noopener" class="btn btn-w" style="display:block;width:100%;text-align:center;text-decoration:none;box-sizing:border-box;padding:16px 18px;font-size:15px;font-weight:900;border-radius:16px;border:1px solid rgba(103,232,249,0.3);background:linear-gradient(135deg, rgba(103,232,249,0.35), rgba(167,139,250,0.35));color:rgba(255,255,255,.96);box-shadow:0 0 20px rgba(103,232,249,0.18)">' +
    'Open Stables on Telegram: t.me/stablescommunity</a></div></div>';

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
      return { error: 'This topic area is not active yet. Please use General concept, Financial structure, or Technical decision.' };
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
      var pid = el('feedbackStructAppPage').value;
      if (!pid) return { error: 'Choose an app page.' };
      appCtx.page_id = pid;
      appCtx.section_hint = (el('feedbackStructAppSection').value || '').trim() || null;
      appCtx.element_hint = (el('feedbackStructAppElement').value || '').trim() || null;
    }

    var topicSub = collectTopicSub(domain);
    var kind = el('feedbackStructKind').value;
    if (KIND_ACTIVE.indexOf(kind) === -1) {
      return { error: 'This feedback type is not active yet. Please choose Comment.' };
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
    } else {
      alert(msg);
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
          btn.disabled = !getFeedbackSubmitUrl();
          btn.textContent = 'Send';
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
    app.innerHTML = '<div style="display:grid;gap:0">' + buildFeedbackFormHtml() + FEEDBACK_TELEGRAM_BLOCK + '</div>';
    wireFeedbackForm(app);
  }

  function wireFeedbackForm(root) {
    var d = root.querySelector('#feedbackStructDomain');
    if (d) d.addEventListener('change', updateFeedbackTopicUI);
    if (d && !d.value) d.value = 'general_concept';
    updateFeedbackTopicUI();
  }

  window.renderFeedbackPage = function renderFeedbackPage() {
    var root = document.getElementById('feedbackApp');
    if (!root) return;
    root.innerHTML = '<div style="display:grid;gap:0">' + buildFeedbackFormHtml() + FEEDBACK_TELEGRAM_BLOCK + '</div>';
    wireFeedbackForm(root);
  };

  window.StablesRoutes = window.StablesRoutes || {};
  window.StablesRoutes.renderFeedback = renderFeedback;
})();
