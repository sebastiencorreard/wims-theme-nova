/* Nova: classroom monitoring. No student tracking, only the authorized server snapshot. */
(function () {
  'use strict';
  var root = document.getElementById('nova-suivi');
  if (!root) return;
  var dataEl = document.getElementById('nova-suivi-donnees'), data;
  var state = document.getElementById('nova-suivi-etat');
  function el(tag, text, cls) {
    var e = document.createElement(tag); if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls; return e;
  }
  document.getElementById('nova-suivi-actualiser').addEventListener('click', function () {
    if (!data || data.error || !controls) location.reload(); else refresh();
  });
  try { data = JSON.parse(dataEl.textContent); } catch (e) { state.textContent = 'Le relev\u00e9 est indisponible. Cliquez sur Actualiser pour r\u00e9essayer.'; return; }
  if (data.error) { state.textContent = data.error; return; }
  var rows = data.students || [], snapshot = Date.now(), timer, refreshing = false;
  var defaults = {fenetre:60, inactivite:5, intervalle:30, resultats:5, erreurs:3,
    'note-faible':5, reussites:3, 'note-reussite':9, reprises:4, attente:8};
  var ids = ['filtre', 'classe', 'recherche', 'auto'].concat(Object.keys(defaults));
  var controls = {}, key = 'nova-suivi-options';
  ids.forEach(function (id) { controls[id] = document.getElementById('nova-suivi-' + id); });
  var classes = {};
  rows.forEach(function (r) { classes[r.class] = r.className; });
  Object.keys(classes).sort().forEach(function (c) { var o = el('option', classes[c]); o.value = c; controls.classe.appendChild(o); });
  try {
    var saved = JSON.parse(localStorage.getItem(key) || '{}');
    ids.forEach(function (id) { if (saved[id] !== undefined && id !== 'recherche') {
      if (id === 'auto') controls[id].checked = saved[id] === true;
      else {
        var previous = controls[id].value;
        controls[id].value = saved[id];
        if (controls[id].tagName === 'SELECT' && !controls[id].value) controls[id].value = previous;
      }
    } });
    if (!controls.classe.value) controls.classe.value = '';
  } catch (e) { /* Defaults stay usable. */ }
  function number(id) {
    var c = controls[id], n = c.value.trim() === '' ? NaN : Number(c.value);
    if (!isFinite(n)) n = defaults[id];
    if (c.step === '1') n = Math.round(n);
    else n = Math.round(n * 10) / 10;
    return Math.min(Number(c.max), Math.max(Number(c.min), n));
  }
  function normalize() {
    controls.resultats.value = number('resultats');
    controls.erreurs.max = controls.resultats.value;
    Object.keys(defaults).forEach(function (id) { controls[id].value = number(id); });
  }
  normalize();
  function clock(t) { return new Date(t * 1000).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function ago(t) {
    var age = Math.max(0, data.now - t);
    return age < 60 ? 'Il y a ' + Math.floor(age) + ' s' : 'Il y a ' + Math.floor(age / 60) + ' min';
  }
  function same(e, r) { return e.exam === r.exam && e.sheet === r.sheet && e.exo === r.exo; }
  function inspect(r) {
    var recent = r.events.filter(function (e) { return e.at >= data.now - number('fenetre') * 60; });
    var current = recent.filter(function (e) { return same(e, r); });
    var scores = current.filter(function (e) { return e.kind === 'score' && e.score !== null; });
    var lastResults = scores.slice(-number('resultats'));
    var bad = lastResults.filter(function (e) { return e.score < number('note-faible'); }).length;
    var mastered = 0, repeats = 0;
    current.forEach(function (e) {
      if (e.kind === 'score' && e.score !== null && e.score >= number('note-reussite')) mastered++;
      if (mastered >= number('reussites') && /^(new|renew)$/.test(e.kind)) repeats++;
    });
    var active = data.now - r.last <= number('inactivite') * 60;
    var inSession = data.now-r.last <= number('fenetre')*60;
    var starts = current.filter(function(e){return /^(new|renew)$/.test(e.kind);});
    var started = starts.length ? starts[starts.length-1].at : r.started;
    var exercise = r.sheet > 0 && r.exo > 0 && !/^(home|adm\/)/.test(r.module);
    var signal = 'normal', why = 'Aucun signal sur cet exercice';
    if (exercise && bad >= number('erreurs')) {
      signal = 'difficulte'; why = bad + ' r\u00e9sultats < ' + number('note-faible') + '/10 parmi les ' + lastResults.length + ' derniers';
    } else if (exercise && repeats >= number('reprises')) {
      signal = 'repetition'; why = repeats + ' reprises apr\u00e8s ' + number('reussites') + ' r\u00e9sultats \u2265 ' + number('note-reussite') + '/10';
    } else if (exercise && started && data.now-started >= number('attente')*60 &&
        !current.some(function (e) { return e.kind === 'score' && e.at >= started; })) {
      signal = 'attente'; why = 'Aucun r\u00e9sultat enregistr\u00e9 depuis ' + Math.floor((data.now-started)/60) + ' min : \u00e0 v\u00e9rifier';
    }
    return {r:r, recent:recent, scores:scores, active:active, inSession:inSession, signal:signal, why:why,
      priority:(!inSession ? 10 : ({difficulte:0, attente:1, repetition:2, normal:3}[signal]))};
  }
  var labels = {difficulte:'Difficult\u00e9 possible', repetition:'R\u00e9p\u00e9tition apr\u00e8s r\u00e9ussite', attente:'Temps long : \u00e0 v\u00e9rifier', normal:'Pas de signal'};
  function detail(x) {
    var d = el('details', undefined, 'nova-suivi-detail'), s = el('summary', 'Voir la chronologie'); d.appendChild(s);
    var list = el('ol');
    x.recent.slice(-40).reverse().forEach(function (e) {
      var text = clock(e.at) + ' \u00b7 ' + (e.exam ? 'Examen ' : 'Feuille ') + e.sheet + ' \u00b7 ' + e.title + ' \u00b7 ';
      text += e.kind === 'score' ? (e.score === null ? 'R\u00e9sultat indisponible' : e.score + '/10') : 'Nouvel essai';
      list.appendChild(el('li', text));
    });
    if (!x.recent.length) list.appendChild(el('li', 'Aucun essai journalis\u00e9 dans cette fen\u00eatre.'));
    if (x.recent.length > 40) list.appendChild(el('li', 'Les 40 derniers \u00e9v\u00e9nements sont affich\u00e9s.'));
    if (x.r.historyTruncated) list.appendChild(el('li', 'Historique partiel : les \u00e9v\u00e9nements les plus anciens sont omis.'));
    d.appendChild(list); return d;
  }
  function render() {
    var inactiveMinutes = number('inactivite');
    document.getElementById('nova-suivi-auto-libelle').textContent = 'Actualiser toutes les ' + number('intervalle') + ' s';
    var analyzed = rows.map(inspect).sort(function (a,b) { return a.priority-b.priority || a.r.name.localeCompare(b.r.name, 'fr'); });
    var stats = document.getElementById('nova-suivi-compteurs'); stats.replaceChildren();
    var active = analyzed.filter(function (x) { return x.inSession; });
    [[active.length, '\u00e9l\u00e8ves dans la s\u00e9ance'], [active.filter(function(x){return x.signal==='difficulte'||x.signal==='attente';}).length, '\u00e0 accompagner'],
      [active.filter(function(x){return x.signal==='repetition';}).length, 'en r\u00e9p\u00e9tition'], [analyzed.filter(function(x){return !x.active;}).length, 'sans action depuis ' + inactiveMinutes + ' min']].forEach(function (pair) {
      var card = el('div'); card.appendChild(el('strong', String(pair[0]))); card.appendChild(el('span', pair[1])); stats.appendChild(card);
    });
    var body = document.querySelector('#nova-suivi-table tbody');
    var expanded = {};
    body.querySelectorAll('tr[data-key]').forEach(function (r) { if (r.querySelector('details[open]')) expanded[r.dataset.key]=true; });
    body.replaceChildren();
    var filter = controls.filtre.value, term = controls.recherche.value.toLocaleLowerCase('fr');
    var visible = analyzed.filter(function (x) {
      return (!controls.classe.value || x.r.class === controls.classe.value) &&
        (x.r.name+' '+x.r.login).toLocaleLowerCase('fr').includes(term) &&
        (filter === 'tous' || (x.inSession && (filter === 'actifs' || (filter === 'attention' && x.signal !== 'normal') || filter === x.signal)));
    });
    visible.forEach(function (x) {
      var r=x.r, tr=el('tr',undefined,'nova-suivi-'+(x.inSession?x.signal:'inactif')); tr.dataset.key=r.class+':'+r.login;
      var name=el('td'); name.appendChild(el('strong',r.name)); name.appendChild(el('small',r.login+' \u00b7 '+r.className)); tr.appendChild(name);
      var activity=el('td'); activity.appendChild(el('span',r.activity));
      if (r.sheet && !/^(home|adm\/)/.test(r.module)) activity.appendChild(el('small',(r.exam?'Examen ':'Feuille ')+r.sheet+' \u00b7 exercice '+r.exo));
      tr.appendChild(activity);
      var last=el('td',ago(r.last)); last.appendChild(el('small',x.active?'Action dans les '+inactiveMinutes+' min':'Sans action depuis '+inactiveMinutes+' min')); tr.appendChild(last);
      var results=el('td');
      if (x.scores.length) { var scores=el('div',undefined,'nova-suivi-notes'); x.scores.slice(-5).forEach(function(e){scores.appendChild(el('span',e.score+'/10',e.score<number('note-faible')?'faible':''));}); results.appendChild(scores); results.appendChild(el('small',x.scores.length+' r\u00e9sultats sur cet exercice')); }
      else results.appendChild(el('span','Aucun r\u00e9sultat r\u00e9cent'));
      var history=detail(x); history.open=!!expanded[tr.dataset.key]; results.appendChild(history); tr.appendChild(results);
      var signal=el('td'); signal.appendChild(el('strong',labels[x.signal])); signal.appendChild(el('small',x.why));
      if (!x.inSession && x.signal!=='normal') signal.appendChild(el('small','Signal de l\u2019activit\u00e9 pass\u00e9e')); tr.appendChild(signal); body.appendChild(tr);
    });
    document.getElementById('nova-suivi-vide').hidden=visible.length>0;
    document.getElementById('nova-suivi-commandes').hidden=false;
    state.textContent='Relev\u00e9 \u00e0 '+clock(data.now)+' \u00b7 '+visible.length+' \u00e9l\u00e8ve(s) affich\u00e9(s).';
  }
  async function refresh() {
    if (refreshing) return;
    refreshing = true; state.textContent = 'Actualisation\u2026';
    var abort = new AbortController(), timeout = setTimeout(function () { abort.abort(); }, 15000);
    try {
      var a = root.querySelector('#nova-suivi-refresh a');
      var response = await fetch(a.href, { credentials: 'same-origin', cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var html = await response.arrayBuffer();
      var doc = new DOMParser().parseFromString(new TextDecoder('windows-1252').decode(html), 'text/html');
      var next = doc.getElementById('nova-suivi-donnees');
      if (!next) {
        controls.auto.checked = false;
        throw new Error('Session expiree ou acces indisponible : revenez a la classe.');
      }
      var fresh = JSON.parse(next.textContent);
      if (fresh.error) throw new Error(fresh.error);
      data = fresh; rows = data.students || []; dataEl.textContent = next.textContent;
      var nextLink = doc.querySelector('#nova-suivi-refresh a');
      if (nextLink) a.href = nextLink.href;
      rows.forEach(function(r) {
        if (!classes[r.class]) { var o=el('option',r.className); o.value=r.class; controls.classe.appendChild(o); classes[r.class]=r.className; }
      });
      render();
    } catch (e) {
      state.textContent = 'Actualisation impossible. Dernier relev\u00e9 : '+clock(data.now)+'. '+e.message;
    } finally { clearTimeout(timeout); snapshot=Date.now(); refreshing=false; }
  }
  function saveAndRender() {
    normalize();
    var saved={}; ids.forEach(function(k){if(k!=='recherche') saved[k]=k==='auto'?controls[k].checked:controls[k].value;});
    try{localStorage.setItem(key,JSON.stringify(saved));}catch(e){} render();
  }
  ids.forEach(function(id){controls[id].addEventListener(id==='recherche'?'input':'change',saveAndRender);});
  document.getElementById('nova-suivi-defauts').addEventListener('click',function(){
    Object.keys(defaults).forEach(function(id){controls[id].value=defaults[id];});
    saveAndRender();
  });
  timer = setInterval(function(){if(controls.auto.checked&&!document.hidden&&Date.now()-snapshot>=number('intervalle')*1000&&!root.querySelector('details.nova-suivi-detail[open]')&&!(root.contains(document.activeElement)&&document.activeElement.matches('input[type=search], input[type=number], select')))refresh();},1000);
  window.addEventListener('pagehide',function(){clearInterval(timer);});
  render();
})();
