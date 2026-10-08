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
  var labels = {difficulte:'Difficult\u00e9 possible', attente:'Temps long', repetition:'R\u00e9p\u00e9tition',
    travail:'Au travail', silence:'Sans action', ancien:'Session ancienne'};
  var groupes = ['attention', 'repetition', 'travail', 'silence', 'ancien'];
  var filtres = {actifs:'Tous', attention:'\u00c0 aller voir', repetition:'R\u00e9p\u00e9tition', travail:'Au travail',
    silence:'Sans action', tous:'Avec les sessions anciennes'};
  var ouverts = {};
  function groupe(x) {
    if (!x.inSession) return 'ancien';
    if (x.signal === 'difficulte' || x.signal === 'attente') return 'attention';
    if (x.signal === 'repetition') return 'repetition';
    return x.active ? 'travail' : 'silence';
  }
  function titreGroupe(g) {
    return {attention:'\u00c0 aller voir', repetition:'R\u00e9p\u00e9tition apr\u00e8s r\u00e9ussite', travail:'Au travail',
      silence:'Sans action depuis ' + number('inactivite') + ' min', ancien:'Sessions ouvertes, hors de la fen\u00eatre'}[g];
  }
  function heure(t) { return new Date(t * 1000).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }); }
  // Couleur d'une note d'apres les seuils : rouge = compte pour une difficulte, vert = compte pour une reussite.
  function carre(score, titre) {
    var c = score === null ? 'np' : score < number('note-faible') ? 'faible' : score >= number('note-reussite') ? 'reussie' : 'moyenne';
    var e = el('span', score === null ? '?' : String(score), 'nova-suivi-carre nova-suivi-carre-' + c);
    e.title = titre; return e;
  }
  function exercice(r) {
    if (r.sheet && !/^(home|adm\/)/.test(r.module)) return (r.exam ? 'Examen ' : 'Feuille ') + r.sheet + ' \u00b7 ' + r.activity;
    return r.activity;
  }
  function chronologie(x, id) {
    var tr = el('tr', undefined, 'nova-suivi-chrono'), td = el('td');
    td.colSpan = 6; td.id = id; tr.appendChild(td);
    td.appendChild(el('p', 'Chronologie \u00b7 ' + number('fenetre') + ' derni\u00e8res minutes', 'nova-suivi-chrono-titre'));
    // Un groupe par exercice, titre au-dessus de ses notes (un titre par note se chevauchait). Nouveaux essais :
    // rien pour un seul (ouvrir puis repondre, deroulement normal) ; a partir de deux a la suite sans note, une
    // fleche grise << xN >> (l'eleve relance sans repondre ; choix de l'utilisateur, 2026-10-08).
    var list = el('ol', undefined, 'nova-suivi-segments'), essais = null, avant = '', relances = [];
    var vider = function () {
      if (relances.length >= 2) {
        var li = el('li', undefined, 'nova-suivi-relance');
        li.title = relances.length + ' nouveaux essais sans r\u00e9ponse : ' + relances.map(heure).join(', ');
        li.appendChild(el('span', '', 'nova-suivi-relance-icone'));
        li.appendChild(el('small', '\u00d7' + relances.length));
        essais.appendChild(li);
      }
      relances = [];
    };
    var fermer = function () {
      if (!essais) return;
      vider();
      if (!essais.children.length) essais.appendChild(el('li', 'pas de note', 'nova-suivi-sans-note'));
    };
    x.recent.slice(-40).forEach(function (e) {
      var cle = e.exam + ':' + e.sheet + ':' + e.exo;
      if (cle !== avant) {
        fermer();
        var segment = el('li', undefined, 'nova-suivi-segment'), titre = (e.exam ? 'Examen ' : 'Feuille ') + e.sheet + ' \u00b7 ' + e.title;
        var t = el('strong', titre); segment.appendChild(t);
        // Titre en bulle (CSS) : survol, clavier ou clic, qui le garde affiche.
        segment.tabIndex = 0;
        segment.addEventListener('click', function () { this.classList.toggle('nova-suivi-titre-ouvert'); });
        essais = el('ol'); segment.appendChild(essais); list.appendChild(segment); avant = cle;
      }
      if (e.kind !== 'score') { relances.push(e.at); return; }
      vider();
      var li = el('li');
      li.appendChild(carre(e.score, e.score === null ? 'R\u00e9sultat indisponible' : e.score + '/10'));
      li.appendChild(el('span', heure(e.at), 'nova-suivi-heure'));
      li.appendChild(el('small', e.score === null ? 'r\u00e9sultat indisponible' : 'note'));
      essais.appendChild(li);
    });
    fermer();
    if (!x.recent.length) list.appendChild(el('li', 'Aucun essai journalis\u00e9 dans cette fen\u00eatre.'));
    td.appendChild(list);
    if (x.recent.length > 40) td.appendChild(el('p', 'Les 40 derniers \u00e9v\u00e9nements sont affich\u00e9s.', 'nova-suivi-aide'));
    if (x.r.historyTruncated) td.appendChild(el('p', 'Historique partiel : les \u00e9v\u00e9nements les plus anciens sont omis.', 'nova-suivi-aide'));
    var masquer = el('button', 'Masquer la chronologie', 'nova-suivi-masquer'); masquer.type = 'button';
    masquer.addEventListener('click', function () { delete ouverts[x.r.class + ':' + x.r.login]; render(); });
    td.appendChild(masquer);
    return tr;
  }
  function ligne(x, plusieurs) {
    var r = x.r, key = r.class + ':' + r.login, ouvert = !!ouverts[key];
    var tr = el('tr', undefined, 'nova-suivi-' + (x.inSession ? x.signal : 'inactif') + ' nova-suivi-g-' + x.groupe);
    tr.dataset.key = key;
    var etiquette = x.groupe === 'attention' || x.groupe === 'repetition' ? x.signal : x.groupe;
    var situation = el('td'); situation.appendChild(el('span', labels[etiquette], 'nova-suivi-tag nova-suivi-tag-' + etiquette)); tr.appendChild(situation);
    var nom = el('td', undefined, 'nova-suivi-nom'); nom.appendChild(el('strong', r.name));
    if (x.signal !== 'normal') nom.appendChild(el('small', x.why + (x.inSession ? '' : ' \u00b7 signal de l\u2019activit\u00e9 pass\u00e9e')));
    else nom.appendChild(el('small', r.login + (plusieurs ? ' \u00b7 ' + r.className : '')));
    tr.appendChild(nom);
    tr.appendChild(el('td', exercice(r), 'nova-suivi-exercice'));
    var notes = el('td', undefined, 'nova-suivi-notes');
    if (x.scores.length) x.scores.slice(-5).forEach(function (e) { notes.appendChild(carre(e.score, e.score + '/10 \u00e0 ' + heure(e.at))); });
    else notes.appendChild(el('small', r.sheet && !/^(home|adm\/)/.test(r.module) ? 'pas encore de note' : '\u2014'));
    tr.appendChild(notes);
    tr.appendChild(el('td', ago(r.last).replace('Il y a', 'il y a'), 'nova-suivi-quand'));
    var cell = el('td', undefined, 'nova-suivi-ouvrir'), b = el('button', undefined, 'nova-suivi-chevron');
    b.type = 'button';
    b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    b.setAttribute('aria-label', (ouvert ? 'Masquer' : 'Voir') + ' la chronologie de ' + r.name);
    if (ouvert) b.setAttribute('aria-controls', 'nova-suivi-chrono-' + r.login);
    function basculer() { if (ouverts[key]) delete ouverts[key]; else ouverts[key] = true; render(); }
    b.addEventListener('click', basculer);
    // Toute la ligne ouvre et ferme la chronologie : au telephone, la pastille de retour en haut peut couvrir la fleche.
    tr.addEventListener('click', function (e) { if (!e.target.closest('a, button, input, select')) basculer(); });
    cell.appendChild(b); tr.appendChild(cell);
    return tr;
  }
  function render() {
    document.getElementById('nova-suivi-auto-libelle').textContent = 'Actualiser toutes les ' + number('intervalle') + ' s';
    var ordre = {attention:0, repetition:1, travail:2, silence:3, ancien:4};
    var analyzed = rows.map(inspect);
    analyzed.forEach(function (x) { x.groupe = groupe(x); });
    analyzed.sort(function (a,b) { return ordre[a.groupe]-ordre[b.groupe] || a.priority-b.priority || a.r.name.localeCompare(b.r.name, 'fr'); });
    var nbClasses = Object.keys(classes).length;
    document.getElementById('nova-suivi-classe-bloc').hidden = nbClasses < 2;
    var choisie = controls.classe.value;
    document.getElementById('nova-suivi-sous-titre').textContent =
      (choisie ? classes[choisie] : nbClasses === 1 ? classes[Object.keys(classes)[0]] : nbClasses + ' classes ou cours') +
      ' \u00b7 ' + number('fenetre') + ' derni\u00e8res minutes';
    var scoped = analyzed.filter(function (x) { return !choisie || x.r.class === choisie; });
    var filter = controls.filtre.value;
    if (filter === 'difficulte') filter = 'attention';
    if (!filtres[filter]) filter = 'actifs';
    controls.filtre.value = filter;
    var compte = {actifs:0, tous:scoped.length};
    groupes.forEach(function (g) { compte[g] = 0; });
    scoped.forEach(function (x) { compte[x.groupe]++; if (x.inSession) compte.actifs++; });
    var puces = document.getElementById('nova-suivi-compteurs'); puces.replaceChildren();
    ['actifs', 'attention', 'repetition', 'travail', 'silence', 'tous'].forEach(function (f) {
      if (f === 'tous' && !compte.ancien && filter !== 'tous') return;
      var b = el('button', undefined, 'nova-suivi-puce nova-suivi-puce-' + f + (f === filter ? ' on' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', f === filter ? 'true' : 'false');
      b.appendChild(el('strong', String(compte[f]))); b.appendChild(el('span', filtres[f]));
      b.addEventListener('click', function () { controls.filtre.value = f; saveAndRender(); });
      puces.appendChild(b);
    });
    var body = document.querySelector('#nova-suivi-table tbody'); body.replaceChildren();
    var term = controls.recherche.value.toLocaleLowerCase('fr');
    var visible = scoped.filter(function (x) {
      return (x.r.name+' '+x.r.login).toLocaleLowerCase('fr').includes(term) &&
        (filter === 'tous' || (filter === 'actifs' ? x.inSession : x.groupe === filter));
    });
    var present = {};
    visible.forEach(function (x) { present[x.r.class + ':' + x.r.login] = true; });
    Object.keys(ouverts).forEach(function (k) { if (!present[k]) delete ouverts[k]; });
    var dernier = '';
    visible.forEach(function (x) {
      if (x.groupe !== dernier) {
        var tr = el('tr', undefined, 'nova-suivi-groupe'), th = el('th', titreGroupe(x.groupe));
        th.colSpan = 6; th.scope = 'colgroup'; tr.appendChild(th); body.appendChild(tr); dernier = x.groupe;
      }
      body.appendChild(ligne(x, nbClasses > 1));
      if (ouverts[x.r.class + ':' + x.r.login]) body.appendChild(chronologie(x, 'nova-suivi-chrono-' + x.r.login));
    });
    document.getElementById('nova-suivi-vide').hidden=visible.length>0;
    document.getElementById('nova-suivi-commandes').hidden=false;
    state.className = 'nova-suivi-ok';
    state.textContent='Relev\u00e9 \u00e0 '+clock(data.now);
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
      state.className = 'nova-suivi-panne';
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
  var panneau = document.getElementById('nova-suivi-panneau');
  document.getElementById('nova-suivi-reglages').addEventListener('click', function () {
    if (panneau.showModal) panneau.showModal(); else panneau.setAttribute('open', '');
  });
  ['nova-suivi-fermer', 'nova-suivi-fermer-bas'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function () { if (panneau.close) panneau.close(); else panneau.removeAttribute('open'); });
  });
  timer = setInterval(function(){if(controls.auto.checked&&!document.hidden&&Date.now()-snapshot>=number('intervalle')*1000&&!Object.keys(ouverts).length&&!(root.contains(document.activeElement)&&document.activeElement.matches('input[type=search], input[type=number], select')))refresh();},1000);
  window.addEventListener('pagehide',function(){clearInterval(timer);});
  render();
})();
