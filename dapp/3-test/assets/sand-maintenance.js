/* Maintenance transactions may never select monetary wallet coins. Shared by every host. */
(function (root) {
  'use strict';
  const TOKEN = '0x3b80b22a00fafc7736242813f39b1d0a9cc1497ff006dbc9716cad10b13c9613';
  const FAUCET = '0xc536bc816ac61d74c5c2139f888aa5af25dcb857acc6af0829b000f2c5391184';
  const SCALE = 100000000n;
  const lower = x => String(x || '').toLowerCase();
  const rows = x => Array.isArray(x) ? x : (x && Array.isArray(x.coins) ? x.coins : (x && x.coinid ? [x] : []));
  function atoms(value) {
    const s = String(value);
    if (!/^\d+(\.\d{1,8})?$/.test(s)) throw Error('Invalid maintenance amount');
    const p = s.split('.'); return BigInt(p[0]) * SCALE + BigInt((p[1] || '').padEnd(8, '0'));
  }
  function amount(n) {
    if (n < 0n) throw Error('Negative maintenance amount');
    const f = (n % SCALE).toString().padStart(8, '0').replace(/0+$/, '');
    return String(n / SCALE) + (f ? '.' + f : '');
  }
  function hex(x) { if (!/^0x[0-9a-f]+$/i.test(String(x))) throw Error('Invalid maintenance identifier'); return String(x); }
  function state(c) { return Object.fromEntries((c.state || []).map(s => [Number(s.port), String(s.data)])); }
  function sandValue(c) {
    if (lower(c.tokenid) !== TOKEN || c.tokenamount == null) throw Error('Maintenance cannot spend this token');
    return atoms(c.tokenamount);
  }
  function select(coins, required) {
    return rows(coins).filter(c => !c.spent && c.walletOwned === true && Number(c.created)>0 && lower(c.tokenid) === TOKEN && !(c.state || []).length && c.tokenamount != null)
      .filter(c => sandValue(c) >= required).sort((a,b) => sandValue(a) < sandValue(b) ? -1 : sandValue(a) > sandValue(b) ? 1 : 0)[0] || null;
  }
  function faucetPlan(coins, recipient) {
    const reserve = rows(coins).filter(c => !c.spent && lower(c.address) === FAUCET && lower(c.tokenid) === TOKEN && !(c.state || []).length && sandValue(c) >= SCALE);
    const counters = rows(coins).filter(c => {
      const s = state(c);
      return !c.spent && lower(c.address) === FAUCET && lower(c.tokenid) === '0x00' && s[0] === '1' && s[2] === '6501'
        && lower(s[1]) === '0xc06801f1b74f7d60f51b43326a7489db70a2fd3789e81842df526bedf7b710c5'
        && s[4] === '72' && s[5] === '100000000' && s[6] === '100000000000000000' && lower(s[9]) === TOKEN
        && Array.from({length:10},(_,i)=>i+10).every(p => s[p] != null);
    });
    if (reserve.length !== 1 || counters.length !== 1) throw Error('SAND refill proofs are unavailable or ambiguous');
    const coin = reserve[0], counter = counters[0], prev = state(counter), rest = sandValue(coin) - SCALE;
    const next = {};
    for (const p of [0,1,2,4,5,6,9,10,11,12,13,14,15,16,17,18,19]) next[p] = prev[p];
    Object.assign(next, {3:String(BigInt(prev[3])+1n),7:String(BigInt(prev[7])+SCALE),8:rest>0n?'1':'2',20:String(SCALE),21:hex(recipient),22:String(rest),23:'0x01',24:'1'});
    const outputs = [{amount:'1',address:recipient,tokenid:TOKEN,storestate:false}];
    if (rest) outputs.push({amount:amount(rest),address:FAUCET,tokenid:TOKEN,storestate:false});
    outputs.push({amount:counter.amount,address:FAUCET,tokenid:'0x00',storestate:true});
    return {kind:'refill',inputs:[coin,counter],outputs,state:next,sign:false};
  }
  function recordPlan(coin, address, recipient, ports) {
    if (coin.walletOwned !== true || (coin.state || []).length || coin.spent || Number(coin.created)<=0) throw Error('Maintenance funding must be a confirmed wallet coin');
    const value = sandValue(coin), dust = 100n;
    if (value < dust) throw Error('SAND refill required');
    const outputs = [{amount:amount(dust),address:hex(address),tokenid:TOKEN,storestate:true}];
    if (value > dust) outputs.push({amount:amount(value-dust),address:hex(recipient),tokenid:TOKEN,storestate:false});
    return {kind:'record',inputs:[coin],outputs,state:ports,sign:true};
  }
  function recyclePlan(coins, recipient, owner, tip, retention) {
    if (!Number.isSafeInteger(tip) || !Number.isSafeInteger(retention) || retention < 1800) throw Error('Invalid retention window');
    if (!coins.length || coins.length > 8) throw Error('Invalid recycling batch');
    for (const c of coins) {
      const s = state(c);
      if (c.spent || lower(s[10]) !== lower(owner) || !['1','2'].includes(s[0]) || tip-Number(c.created) < retention) throw Error('Record is not ready for recycling');
    }
    return {kind:'recycle',inputs:coins,outputs:[{amount:amount(coins.reduce((n,c)=>n+sandValue(c),0n)),address:hex(recipient),tokenid:TOKEN,storestate:false}],state:{},sign:true};
  }
  function validate(plan) {
    if (!['record','refill','recycle'].includes(plan.kind)) throw Error('Unknown maintenance operation');
    if (!plan.inputs.length || new Set(plan.inputs.map(c=>lower(c.coinid))).size !== plan.inputs.length) throw Error('Duplicate maintenance input');
    for (const c of plan.inputs) { hex(c.coinid); hex(c.address); }
    for (const o of plan.outputs) { hex(o.address); hex(o.tokenid); if (atoms(o.amount) <= 0n) throw Error('Empty maintenance output'); }
    if (plan.kind === 'refill') {
      const canonical = faucetPlan(plan.inputs, plan.outputs[0].address);
      if (plan.inputs.some((c,i)=>lower(c.coinid)!==lower(canonical.inputs[i].coinid)) || JSON.stringify(plan.outputs) !== JSON.stringify(canonical.outputs) || JSON.stringify(plan.state) !== JSON.stringify(canonical.state) || plan.sign) throw Error('Unsafe refill shape');
    } else {
      if(plan.sign!==true) throw Error('Maintenance ownership signature required');
      if(plan.kind==='record' && (plan.inputs.length!==1 || plan.inputs[0].walletOwned!==true || plan.inputs[0].spent || Number(plan.inputs[0].created)<=0 || (plan.inputs[0].state||[]).length || plan.outputs.length>2 || plan.outputs[0].storestate!==true || atoms(plan.outputs[0].amount)!==100n || (plan.outputs[1]&&plan.outputs[1].storestate!==false))) throw Error('Unsafe maintenance record');
      if (plan.outputs.some(o=>lower(o.tokenid)!==TOKEN)) throw Error('Maintenance monetary output forbidden');
      if (plan.inputs.reduce((n,c)=>n+sandValue(c),0n) !== plan.outputs.reduce((n,o)=>n+atoms(o.amount),0n)) throw Error('Maintenance must conserve SAND');
    }
    return plan;
  }
  function splitRecords(records, bounds) {
    const pages = [], seen = new Set(); let page = [], bytes = 2;
    const max = Math.min(Number(bounds.page_orders || 16),16), limit = Math.min(Number(bounds.page_bytes || 32768),32768);
    for (const r of records) {
      if (!/^0x[0-9a-f]{64}$/i.test(r.coinid) || !/^0x(?:[0-9a-f]{2})+$/i.test(r.blob)) throw Error('Invalid proof record');
      if (seen.has(lower(r.coinid))) continue; seen.add(lower(r.coinid));
      const size = (r.blob.length-2)/2;
      if (size > 4096 || size+36 > limit) throw Error('Proof too large');
      if (page.length >= max || bytes+34+size > limit) {pages.push(page);page=[];bytes=2;}
      page.push(r); bytes+=34+size;
    }
    if (page.length) pages.push(page);
    if (!pages.length || pages.length > Math.min(Number(bounds.max_pages || 64),4)) throw Error('Maintenance proof capacity exceeded');
    return pages;
  }
  function create(adapter) {
    const key='stables_sand_maintenance_v1'; let busy=false;
    function load() { const raw=adapter.storage.getItem(key); return raw?JSON.parse(raw):null; }
    function save(j) { adapter.storage.setItem(key,JSON.stringify(j)); }
    async function reconcileRefill(j, slot, op) {
      if (op.plan.kind !== 'refill' || op.plan.sign || !adapter.tip) return false;
      // Only confirmed chain transactions can displace a claim. Missing coins or timeouts cannot.
      const tip = Number(await adapter.tip());
      const start = Number(op.scanBlock == null ? j.tip : op.scanBlock);
      if (!Number.isSafeInteger(tip) || !Number.isSafeInteger(start) || start < 1) return false;
      if (!op.transactionid) {
        const draft = await adapter.read('txnlist id:' + op.id);
        op.transactionid = draft && draft.transaction && draft.transaction.transactionid;
        if (!op.transactionid) return false;
        save(j);
      }
      let reads = 0;
      const heights=Array.from({length:4},(_,i)=>start+i).filter(h=>h<=tip-2);
      // For old journals try the current faucet's creation block first. It often contains the
      // competing spend even when the original starting block has left this node's history.
      if(adapter.faucet) {
        const current=rows(await adapter.faucet()).find(c=>lower(c.tokenid)==='0x00' && lower(c.address)===FAUCET);
        const height=Number(current && current.created);
        if(Number.isSafeInteger(height)&&height>=start&&height<=tip-2&&!heights.includes(height)
            && !op.plan.inputs.some(c=>lower(c.coinid)===lower(current.coinid)))heights.unshift(height);
      }
      for (const height of heights) {
        const sequential=height>=start&&height<start+4;
        const block = await adapter.read('txpow block:' + height);
        if (!block || !block.body || Number((block.header || {}).block) !== height || !Array.isArray(block.body.txnlist)) return false;
        const ids = [block.txpowid, ...block.body.txnlist];
        let index = sequential ? (op.scanIndex || 0) : 0;
        for (; index < ids.length; index++) {
          if (reads++ >= 8) {if(sequential){op.scanBlock=height;op.scanIndex=index;save(j);}return false;}
          const txpow = index === 0 ? block : await adapter.read('txpow txpowid:' + hex(ids[index]));
          if (!txpow || !txpow.body) return false;
          for (const transaction of [txpow.body.txn, txpow.body.burntxn]) {
            if (!transaction || !Array.isArray(transaction.inputs) || !transaction.inputs.some(c=>op.plan.inputs.some(p=>lower(p.coinid)===lower(c.coinid)))) continue;
            if(!/^0x[0-9a-f]+$/i.test(transaction.transactionid||'') || lower(txpow.txpowid)!==lower(ids[index]))return false;
            const receipt = await adapter.read('txpow onchain:' + hex(txpow.txpowid));
            if (!receipt || receipt.found !== true || Number(receipt.block)!==height || Number(receipt.confirmations)<3) return false;
            const proof={txpowid:txpow.txpowid,block:height,confirmations:Number(receipt.confirmations)};
            if (lower(transaction.transactionid) === lower(op.transactionid)) {
              op.phase='confirmed';op.chainReceipt=proof;save(j);return true;
            }
            // The losing claim is unsigned. Keep its full evidence before selecting fresh coins.
            if ((j.refillHistory || []).length >= 3) throw Error('Maintenance refill contention needs review');
            op.phase='superseded';op.conflict=proof;
            j.refillHistory=(j.refillHistory||[]).concat([op]);j.recoveredAt=Date.now();delete j.ops[slot];save(j);
            try {await adapter.cmd('txndelete id:'+op.id);} catch (_) {}
            return true;
          }
        }
        if(sequential){op.scanBlock=height+1;op.scanIndex=0;save(j);}
      }
      return false;
    }
    async function confirmed(op) {
      if (!op.outputIds || !op.outputIds.length) return false;
      // Change can legitimately be spent by another app. It is not a confirmation gate.
      for (const id of op.outputIds.slice(0,1)) {
        const coin=rows(await adapter.read('coins coinid:'+hex(id))).find(c=>lower(c.coinid)===lower(id));
        if (!coin || coin.spent || Number(coin.created)<=0) {
          if(op.txpowid) {
            const receipt=await adapter.read('txpow onchain:'+hex(op.txpowid));
            if(receipt && receipt.found===true && Number(receipt.block)>0)return true;
          }
          return false;
        }
      }
      return true;
    }
    async function execute(j, slot, plan) {
      if (!/^[a-z0-9_]+$/i.test(slot) || !/^[a-z0-9]+$/i.test(j.id)) throw Error('Invalid maintenance operation id');
      if (adapter.owner && lower(await adapter.owner()) !== lower(j.owner)) throw Error('Maintenance wallet changed');
      validate(plan);
      let op=j.ops[slot];
      if (op && op.phase==='confirmed') return op;
      if (op && await confirmed(op)) {op.phase='confirmed';save(j);return op;}
      if (op && op.plan.kind==='refill' && await reconcileRefill(j,slot,op)) return op.phase==='confirmed' ? op : null;
      if (op && ['posting','posted','unknown'].includes(op.phase)) {
        // A lost response may be retried with the identical retained signed draft.
        // No new inputs, signature, or transaction are produced. Bound retries per journal.
        if((op.reposts||0)<3 && Date.now()-(op.lastPost||0)>=60000) {
          op.reposts=(op.reposts||0)+1;op.lastPost=Date.now();save(j);
          await adapter.cmd('txnpost id:'+op.id+' txndelete:false');
        }
        return null;
      }
      if (!op) {
        op=j.ops[slot]={id:'stables_sand_'+j.id+'_'+slot+(slot==='refill' && (j.refillHistory||[]).length ? '_r'+j.refillHistory.length : ''),phase:'building',plan,scanBlock:adapter.tip?Number(await adapter.tip()):undefined};save(j);
      } else if (JSON.stringify(op.plan)!==JSON.stringify(plan)) throw Error('Maintenance operation changed during retry');
      const id=op.id;
      if (op.phase==='building') {
        // Rebuilding an unsigned draft is safe. A signed or submitted draft never enters this branch.
        try {await adapter.cmd('txndelete id:'+id);} catch (_) {}
        const commands=['txncreate id:'+id];
        plan.inputs.forEach(c=>commands.push('txninput id:'+id+' coinid:'+hex(c.coinid)));
        plan.outputs.forEach(o=>commands.push('txnoutput id:'+id+' amount:'+o.amount+' address:'+hex(o.address)+' tokenid:'+hex(o.tokenid)+' storestate:'+String(o.storestate)));
        Object.entries(plan.state).forEach(([p,v])=>{if(!/^\d+$/.test(p)||!/^(-?\d+(\.\d+)?|0x[0-9a-f]+)$/i.test(String(v)))throw Error('Invalid maintenance state');commands.push('txnstate id:'+id+' port:'+p+' value:'+v);});
        for(const command of commands) await adapter.cmd(command);
        op.phase='signing';save(j);
        if(plan.sign) await adapter.cmd('txnsign id:'+id+' publickey:'+(plan.kind==='recycle'?hex(j.owner):'auto'));
        op.phase='basics';save(j);
      }
      if(op.phase==='signing') {
        // An interrupted signing request is inspected, not repeated (stateful wallet keys).
        const draft=await adapter.read('txnlist id:'+id);
        const sigs=draft && draft.witness && draft.witness.signatures;
        if(plan.sign && (!Array.isArray(sigs)||!sigs.length)) throw Error('Interrupted maintenance signing needs review');
        op.phase='basics';save(j);
      }
      const draft=await adapter.cmd('txnbasics id:'+id);
      const check=await adapter.cmd('txncheck id:'+id);
      const valid=check && check.valid;
      const sigOK=valid && (valid.signatures===true || (Array.isArray(valid.signatures)&&valid.signatures.every(s=>s.valid===true)));
      if(!valid || valid.basic!==true || valid.scripts!==true || valid.mmrproofs!==true || !sigOK || String(check.burn)!=='0' || check.validamounts!==true || !Array.isArray(check.coins) || check.coins.some(c=>String(c.difference)!=='0')) throw Error('Maintenance transaction did not pass validation');
      const actual=draft && draft.transaction;
      if(!actual || !Array.isArray(actual.inputs)||!Array.isArray(actual.outputs)||actual.inputs.length!==plan.inputs.length||actual.outputs.length!==plan.outputs.length) throw Error('Maintenance draft shape mismatch');
      actual.inputs.forEach((c,i)=>{if(lower(c.coinid)!==lower(plan.inputs[i].coinid)||lower(c.tokenid)!==lower(plan.inputs[i].tokenid))throw Error('Maintenance draft input mismatch');});
      actual.outputs.forEach((c,i)=>{const o=plan.outputs[i];if(lower(c.address)!==lower(o.address)||lower(c.tokenid)!==lower(o.tokenid)||atoms(lower(c.tokenid)===TOKEN?c.tokenamount:c.amount)!==atoms(o.amount)||c.storestate!==o.storestate)throw Error('Maintenance draft output mismatch');});
      const actualState=state(actual), plannedState=plan.state;
      if(Object.keys(actualState).length!==Object.keys(plannedState).length || Object.entries(plannedState).some(([p,v])=>lower(actualState[p])!==lower(v))) throw Error('Maintenance draft state mismatch');
      op.transactionid=actual.transactionid||null;op.outputIds=actual.outputs.map(c=>hex(c.coinid));op.phase='posting';op.lastPost=Date.now();save(j);
      try {const posted=await adapter.cmd('txnpost id:'+id+' txndelete:false');op.txpowid=posted.txpowid||null;op.phase='posted';save(j);} catch(e) {op.phase='unknown';save(j);throw e;}
      return null;
    }
    return {load,save,execute,confirmed,async locked(fn){if(busy)return {skipped:'already publishing'};busy=true;try{return await fn();}finally{busy=false;}},newJournal(owner,recipient){return {id:Date.now().toString(36)+Math.random().toString(36).slice(2,10),owner,recipient,ops:{},created:Date.now()};}};
  }
  // One bounded step per pass. Confirmation waiting never blocks app startup or a payment.
  async function publish(a) {
    const engine=create(a);
    let j=engine.load();
    const owner=await a.owner();
    if(j && lower(j.owner)!==lower(owner)) throw Error('Maintenance wallet changed');
    if(!j || j.done) {
      if(await a.fresh())return {skipped:'shared proofs are fresh'};
      const previous=j ? (j.previous||[]).concat([{ids:j.recordIds,created:j.tip,owner:j.owner}]) : [];
      if(previous.length>32)throw Error('Maintenance retirement backlog');
      j=engine.newJournal(owner,await a.recipient());j.previous=previous;
      j.snapshotId=await a.snapshotId(j);j.tip=await a.tip();engine.save(j);
    }
    // Resume recorded operations before selecting a new coin or making another refill claim.
    for(const [slot,op] of Object.entries(j.ops)) {
      if(op.phase!=='confirmed') {
        if(!await engine.execute(j,slot,op.plan))return {pending:true,operation:slot};
      }
    }
    const funding=async()=>{
      const coin=select(await a.funds(),100n);
      if(coin)return coin;
      if(j.ops.refill)throw Error('Maintenance balance unavailable after refill');
      await engine.execute(j,'refill',faucetPlan(await a.faucet(),j.recipient));
      return null;
    };
    // Refill before collecting proofs: the claim replaces the two shared faucet coins.
    if(!j.pages) {
      if(!select(await a.funds(),100000n) && !j.ops.refill) {
        await engine.execute(j,'refill',faucetPlan(await a.faucet(),j.recipient));
        return {pending:true,operation:'refill'};
      }
      const groups=splitRecords(await a.records(j.recipient),a.bounds);
      j.pages=await Promise.all(groups.map(a.encode));
      j.count=groups.reduce((n,p)=>n+p.length,0);
      j.pageCounts=groups.map(p=>p.length);j.recordIds=[];engine.save(j);
    }
    for(let i=0;i<j.pages.length;i++) {
      const slot='page'+i;
      if(!j.ops[slot]) {
        const coin=await funding();if(!coin)return {pending:true,operation:'refill'};
        await engine.execute(j,slot,recordPlan(coin,a.pageAddress,j.recipient,a.pageState(j,i)));
        return {pending:true,operation:slot};
      }
    }
    if(!j.ops.head) {
      // Recheck every referenced page immediately before creating the head.
      const headTip=await a.tip();
      if(!Number.isSafeInteger(headTip)||headTip<=0)throw Error('Maintenance chain height unavailable');
      let stale=false;
      for(let i=0;i<j.pages.length;i++) {
        const id=j.ops['page'+i].outputIds[0];
        const hit=rows(await a.read('coins coinid:'+hex(id))).find(c=>lower(c.coinid)===lower(id)&&!c.spent&&Number(c.created)>0);
        if(!hit)throw Error('Published page is no longer available');
        if(!Number.isSafeInteger(Number(hit.created))||Number(hit.created)>headTip)throw Error('Maintenance page height unavailable');
        if(headTip-Number(hit.created)>120)stale=true;
      }
      if(stale) {
        // All operations were reconciled above and no head draft exists. Preserve the
        // abandoned pages and receipts until delayed retirement after a replacement.
        // Persist the next journal before preparing any new transaction.
        if((j.previous||[]).length>=32)throw Error('Maintenance retirement backlog');
        const next=engine.newJournal(j.owner,j.recipient);
        next.previous=(j.previous||[]).concat([{
          ids:j.pages.map((_,i)=>j.ops['page'+i].outputIds[0]),created:headTip,owner:j.owner,
          abandoned:{id:j.id,snapshotId:j.snapshotId,recipient:j.recipient,created:j.created,
            tip:j.tip,ops:j.ops,refillHistory:j.refillHistory||[],reason:'stale pages without head'}
        }]);
        next.snapshotId=await a.snapshotId(next);next.tip=headTip;
        engine.save(next);
        return {pending:true,operation:'refresh-pages'};
      }
      const coin=await funding();if(!coin)return {pending:true,operation:'refill'};
      await engine.execute(j,'head',recordPlan(coin,a.headAddress,j.recipient,await a.headState(j)));
      return {pending:true,operation:'head'};
    }
    j.recordIds=[...j.pages.map((_,i)=>j.ops['page'+i].outputIds[0]),j.ops.head.outputIds[0]];
    // Retire only journal-owned, old snapshots after their replacement has confirmed.
    // Whole groups are kept until they can be retired together; no live head loses its pages.
    const tip=await a.tip();
    for(let i=0;i<j.previous.length;i++) {
      const old=j.previous[i];if(old.retired || tip-old.created<1800)continue;
      const slot='retire'+i;
      if(j.ops[slot] && j.ops[slot].phase==='confirmed') {old.retired=true;engine.save(j);continue;}
      const coins=[];
      for(const id of old.ids||[]) {
        const hit=rows(await a.read('coins coinid:'+hex(id))).find(c=>lower(c.coinid)===lower(id)&&!c.spent);
        if(!hit)throw Error('Retirement record unavailable');
        if(![lower(a.pageAddress),lower(a.headAddress)].includes(lower(hit.address)))throw Error('Retirement address mismatch');
        coins.push(hit);
      }
      if(!j.ops[slot] && coins.length) {
        await engine.execute(j,slot,recyclePlan(coins,j.recipient,j.owner,tip,1800));
        return {pending:true,operation:slot};
      }
      old.retired=true;engine.save(j);
    }
    j.previous=j.previous.filter(p=>!p.retired);j.done=true;engine.save(j);
    for(const op of Object.values(j.ops)) {try {await a.cmd('txndelete id:'+op.id);}catch(_) {}}
    return {published:true,records:j.count,pages:j.pages.length,snapshotId:j.snapshotId};
  }
  const api={TOKEN,FAUCET,atoms,amount,rows,state,select,faucetPlan,recordPlan,recyclePlan,validate,splitRecords,create,publish};
  root.StablesMaintenance=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
