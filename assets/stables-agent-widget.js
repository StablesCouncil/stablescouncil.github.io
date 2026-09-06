/* StablesAgent floating button and chat popup, shared by every public page.
 *
 * Until 2026-09-06 this lived inline on the links page only (founder: "we need the agent icon
 * displayed on the main webpage and payment-app too"). One file now injects the same button,
 * popup and behaviour on every page that includes it: no per-page copy of ninety lines, one place
 * for the agent URL and the health check. The hover tooltip of the old inline copy is not carried
 * over: the button already names itself for assistive technology, and the secondary-page chrome
 * contract refuses the tooltip on its pages. Placement rules per page family stay in the shared
 * stylesheets (site-chrome.css, secondary-page-chrome.css, stables-visual-authority.css). */
(function () {
  'use strict';
  if (typeof document === 'undefined' || document.getElementById('agentFab')) return;

  var AGENT_URL = 'https://agent.stablescouncil.org/chat?embed=1';
  var HEALTH_URL = 'https://agent.stablescouncil.org/health';
  var AVATAR = '/stables_agent_avatar.png';

  var css = ''
    + '.agent-fab{position:fixed;bottom:32px;right:32px;z-index:9000;display:flex;align-items:center;gap:12px;cursor:pointer;border:none;background:none;padding:0}'
    + '.agent-fab-btn{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,rgba(103,232,249,0.25),rgba(167,139,250,0.25));border:1px solid rgba(103,232,249,0.45);box-shadow:0 0 24px rgba(103,232,249,0.2);display:flex;align-items:center;justify-content:center;position:relative;transition:transform 0.25s ease,box-shadow 0.25s ease}'
    + '.agent-fab:hover .agent-fab-btn{transform:scale(1.1);box-shadow:0 0 40px rgba(103,232,249,0.4)}'
    + '.agent-fab-btn img{width:32px;height:32px;object-fit:contain}'
    + '.agent-fab-dot{position:absolute;top:3px;right:3px;width:11px;height:11px;border-radius:50%;background:#6b7280;border:2px solid #0b0f14;transition:background 0.4s ease}'
    + '.agent-fab-pulse{position:absolute;width:58px;height:58px;border-radius:50%;border:1px solid rgba(103,232,249,0.5);animation:agent-radar 2.4s ease-out infinite;pointer-events:none}'
    + '.agent-fab-pulse:nth-child(2){animation-delay:0.8s}.agent-fab-pulse:nth-child(3){animation-delay:1.6s}'
    + '@keyframes agent-radar{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}'
    + '.agent-backdrop{display:none;position:fixed;inset:0;z-index:9050;background:transparent}.agent-backdrop.open{display:block}'
    + '.agent-popup{position:fixed;bottom:104px;right:32px;z-index:9100;width:390px;height:min(680px,calc(100vh - 130px));background:#101826;border:1px solid rgba(103,232,249,0.3);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,0.7);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(16px) scale(0.98);pointer-events:none;transition:opacity 0.25s ease,transform 0.25s ease}'
    + '.agent-popup.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}'
    + '.agent-popup-header{display:flex;align-items:center;gap:11px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}'
    + '.agent-popup-logo{width:34px;height:34px;border-radius:8px;background:rgba(103,232,249,0.08);border:1px solid rgba(103,232,249,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}'
    + '.agent-popup-logo img{width:22px;height:22px;object-fit:contain}'
    + '.agent-popup-title{flex:1}'
    + '.agent-popup-title-main{font-size:13px;font-weight:700;color:#e6edf3;font-family:Inter,sans-serif;letter-spacing:0.03em}'
    + '.agent-popup-title-sub{font-size:11px;color:#9fb0c0;font-family:Inter,sans-serif;margin-top:1px}'
    + '.agent-popup-status{display:flex;align-items:center;gap:6px;font-size:11px;color:#9fb0c0;font-family:Inter,sans-serif;cursor:pointer;padding:5px 10px;border-radius:999px;transition:background 0.2s;border:none;background:none}'
    + '.agent-popup-status:hover{background:rgba(255,255,255,0.07)}'
    + '.agent-popup-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.2)}'
    + '.agent-popup-disclaimer{padding:7px 16px;background:rgba(251,191,36,0.08);border-bottom:1px solid rgba(251,191,36,0.25);font-family:Inter,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.08em;color:#fbbf24;text-align:center;flex-shrink:0}'
    + '.agent-popup-body{flex:1;position:relative;overflow:hidden}'
    + '.agent-popup-body iframe{width:100%;height:100%;border:none;background:#101826}'
    + '.agent-popup-fallback{display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;background:#101826}'
    + '.agent-popup-fallback.visible{display:flex}'
    + '.agent-popup-fallback p{font-family:Inter,sans-serif;font-size:14px;color:#9fb0c0;line-height:1.6}'
    + '.agent-popup-fallback a{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:12px;background:linear-gradient(135deg,rgba(103,232,249,0.25),rgba(167,139,250,0.25));border:1px solid rgba(103,232,249,0.4);color:#e6edf3;font-family:Inter,sans-serif;font-size:14px;font-weight:600;text-decoration:none;transition:box-shadow 0.2s}'
    + '.agent-popup-fallback a:hover{box-shadow:0 0 20px rgba(103,232,249,0.3)}'
    + '@media (max-width:640px){.agent-fab{bottom:20px;right:20px}.agent-popup{bottom:0;right:0;left:0;width:100%;height:75vh;border-radius:20px 20px 0 0;border-bottom:none}}';

  var html = ''
    + '<div class="agent-backdrop" id="agentBackdrop"></div>'
    + '<div class="agent-popup" id="agentPopup" role="dialog" aria-label="StablesAgent chat">'
    + '<div class="agent-popup-header">'
    + '<div class="agent-popup-logo"><img src="' + AVATAR + '" alt="" /></div>'
    + '<div class="agent-popup-title"><div class="agent-popup-title-main">StablesAgent</div><div class="agent-popup-title-sub">Ask anything about Stables</div></div>'
    + '<button type="button" class="agent-popup-status" id="agentPopupStatus" title="Close" aria-label="Close the chat"><span class="agent-popup-status-dot"></span><span>Online</span></button>'
    + '</div>'
    + '<div class="agent-popup-disclaimer">DO NOT SHARE PRIVATE OR SENSITIVE INFORMATION</div>'
    + '<div class="agent-popup-body">'
    + '<iframe id="agentFrame" title="StablesAgent Chat"></iframe>'
    + '<div class="agent-popup-fallback" id="agentFallback">'
    + '<img src="' + AVATAR + '" alt="" style="width:48px;height:48px;opacity:0.7;" />'
    + '<p>The chat will load here directly once the secure connection is active.<br>For now, open it in a new tab:</p>'
    + '<a href="https://agent.stablescouncil.org/chat" target="_blank" rel="noopener noreferrer">Open StablesAgent in a new tab</a>'
    + '</div></div></div>'
    + '<button type="button" class="agent-fab" id="agentFab" aria-label="Chat with StablesAgent">'
    + '<div class="agent-fab-btn"><span class="agent-fab-pulse"></span><span class="agent-fab-pulse"></span><span class="agent-fab-pulse"></span>'
    + '<img src="' + AVATAR + '" alt="" /><span class="agent-fab-dot"></span></div>'
    + '</button>';

  function mount() {
    if (document.getElementById('agentFab')) return;
    var style = document.createElement('style');
    style.id = 'stablesAgentWidgetStyle';
    style.textContent = css;
    document.head.appendChild(style);
    var host = document.createElement('div');
    host.id = 'stablesAgentWidget';
    host.innerHTML = html;
    while (host.firstChild) document.body.appendChild(host.firstChild);

    var agentOpen = false;
    function setStatus(online) {
      var dot = document.querySelector('.agent-popup-status-dot');
      var label = document.querySelector('.agent-popup-status span:last-child');
      var fabDot = document.querySelector('.agent-fab-dot');
      var c = online ? '#22c55e' : '#6b7280';
      var g = online ? 'rgba(34,197,94,0.2)' : 'none';
      if (dot) { dot.style.background = c; dot.style.boxShadow = '0 0 0 3px ' + g; }
      if (fabDot) fabDot.style.background = c;
      if (label) label.textContent = online ? 'Online' : 'Offline';
    }
    function pingAgent() {
      try {
        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tid = ctl ? setTimeout(function () { try { ctl.abort(); } catch (_) {} }, 4000) : null;
        fetch(HEALTH_URL, { method: 'GET', signal: ctl ? ctl.signal : undefined })
          .then(function (r) { if (tid) clearTimeout(tid); setStatus(r.ok); })
          .catch(function () { if (tid) clearTimeout(tid); setStatus(false); });
      } catch (_) { setStatus(false); }
    }
    pingAgent();
    setInterval(pingAgent, 30000);

    function openAgent() {
      var popup = document.getElementById('agentPopup');
      var backdrop = document.getElementById('agentBackdrop');
      var frame = document.getElementById('agentFrame');
      var fb = document.getElementById('agentFallback');
      if (!frame.src || frame.src === window.location.href) {
        var lang = null;
        try { lang = localStorage.getItem('stables_lang'); } catch (_) { lang = null; }
        frame.src = AGENT_URL + '&lang=' + encodeURIComponent(lang || 'en');
        var t = setTimeout(function () { fb.classList.add('visible'); }, 3000);
        frame.onload = function () { clearTimeout(t); };
      }
      popup.classList.add('open');
      backdrop.classList.add('open');
      agentOpen = true;
    }
    function closeAgent() {
      document.getElementById('agentPopup').classList.remove('open');
      document.getElementById('agentBackdrop').classList.remove('open');
      agentOpen = false;
    }
    window.toggleAgent = function () { if (agentOpen) closeAgent(); else openAgent(); };
    window.closeAgent = closeAgent;
    document.getElementById('agentFab').addEventListener('click', window.toggleAgent);
    document.getElementById('agentBackdrop').addEventListener('click', closeAgent);
    document.getElementById('agentPopupStatus').addEventListener('click', closeAgent);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && agentOpen) closeAgent(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
