
  /* ===== js/src/60-eleve.js : accueil de l'élève, Mon activité, badges ===== */
  /* Élève d'un portail ou d'un groupement dont l'accueil ne propose qu'un seul cours (ou une seule classe) :
   * il y entre directement, juste après la connexion comme à chaque retour à cet accueil, qui devient ainsi
   * le cours (demande de l'utilisateur, 2026-10-05). Seulement si cet accueil n'a rien d'autre à montrer : ni
   * travail (#widget_user_list), ni message de la classe (themes/_widgets/motd.phtml). location.replace :
   * pas d'étape de plus dans l'historique. Un retour depuis le cours passe par le portail (ou le groupement) :
   * sa page de classe renvoie d'abord à la classe, il faut un second saut (vécu au banc). Garde-fou : au plus
   * 3 sauts vers le même cours en 10 s. */
  function coursUnique() {
    if (!document.getElementById('nova-eleve')) return;
    // Avant tout retour anticipé : chaque page de l'élève doit noter sa classe.
    // Sens du déplacement (correction du 2026-10-07, signalée par l'utilisateur : un élève qui remontait du cours
    // vers une page à entrée unique, celle de sa classe, y était renvoyé aussitôt vers le cours, page masquée, et
    // ne passait qu'après plusieurs « Retour » rapides). On ne saute que vers le bas : juste après la connexion
    // (session=new.), ou depuis une page qui n'est pas sous l'entrée unique. La classe de chaque page de l'élève
    // (meta nova-classe, htmlheader.phtml) est retenue pour la page suivante.
    var meta = document.querySelector('meta[name="nova-classe"]');
    var ici = meta ? meta.getAttribute('content') : '';
    var precedente = null;
    try { precedente = sessionStorage.getItem('nova-classe-prec'); if (ici) sessionStorage.setItem('nova-classe-prec', ici); } catch (e) { /* sans stockage */ }
    if (/[?&]session=new\./.test(location.href)) precedente = null;
    var corps = document.querySelector('.wimsbody');
    // Réglage par surcharge CSS (jetons.css) : :root { --nova-entree-directe: non; } garde l'élève sur cet
    // accueil (demande de l'utilisateur, 2026-10-06).
    var reglage = getComputedStyle(document.documentElement).getPropertyValue('--nova-entree-directe').trim().toLowerCase();
    if (/^["']?(non|no|none|aucune|off|0)["']?$/.test(reglage)) { if (corps) corps.classList.add('nova-sans-saut'); return; }
    var liste = corps && corps.querySelector(':scope > ul.wims_subclasses');
    var liens = liste ? liste.querySelectorAll('a[href*="type=authparticipant"]') : [];
    var travail = document.getElementById('widget_user_list');
    var seul = liens.length === 1 && !(travail && travail.textContent.trim()) &&
      !document.querySelector('#wims_class_motd, #wims_class_pmotd');
    if (!liste) return;
    if (seul) {
      var cible = (/[?&+]class=([^&]*)/.exec(liens[0].getAttribute('href')) || [])[1] || liens[0].href;
      try { cible = decodeURIComponent(cible); } catch (e) { /* telle quelle */ }
      if (precedente && (precedente === cible || precedente.indexOf(cible + '/') === 0)) { corps.classList.add('nova-sans-saut'); return; }
      var recent = false;
      try {
        var dernier = JSON.parse(sessionStorage.getItem('nova-cours-unique') || 'null');
        var suite = !!dernier && dernier.cible === cible && Date.now() - dernier.t < 10000;
        var essais = suite ? dernier.n + 1 : 1;
        recent = essais > 3;
        if (!recent) sessionStorage.setItem('nova-cours-unique', JSON.stringify({ cible: cible, t: suite ? dernier.t : Date.now(), n: essais }));
      } catch (e) { /* stockage refusé : on entre quand même */ }
      // Après « load » et un délai : une requête partie moins d'une seconde après la précédente est traitée
      // avec l'état précédent de la session et ramène ici (mesuré au banc : 300 ms échoue, 1 s passe de
      // justesse, 1,5 s passe). Juste après la connexion (session=new.…), 300 ms suffisent.
      if (!recent) {
        var delai = /[?&]session=new\./.test(location.href) ? 300 : 1500;
        var partir = function () { setTimeout(function () { location.replace(liens[0].href); }, delai); };
        if (document.readyState === 'complete') partir(); else window.addEventListener('load', partir);
        return;
      }
    }
    corps.classList.add('nova-sans-saut');
  }

  /* « Dernière connexion le 07/10/2026 - 23:03:05 » (modules/home/main.phtml, date de scripts/adm/date.phtml, hors du
   * thème) : jour/mois et heures:minutes seulement, « 07/10 à 23:03 » (demande de l'utilisateur, 2026-10-08). */
  function derniereConnexion() {
    var a = /^en/i.test(document.documentElement.lang || '') ? 'at' : '\u00e0';
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody .wims_msg.info'), function (m) {
      var re = /(\d{1,2})\/(\d{1,2})\/\d{4}\s*-\s*(\d{1,2}):(\d{2}):\d{2}/;
      if (!re.test(m.textContent)) return;
      var marche = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
      for (var t = marche.nextNode(); t; t = marche.nextNode()) {
        if (re.test(t.nodeValue)) { t.nodeValue = t.nodeValue.replace(re, '$1/$2 ' + a + ' $3:$4'); return; }
      }
    });
  }

  /* Menu latéral rangé dans #wimspagebox par WIMS sur certaines pages (page de réponse d'un exercice de feuille)
   * au lieu d'être enfant de #wimsbodybox comme partout ailleurs : remis à sa place habituelle, sinon ni le tiroir
   * ni la grille de Nova ne s'appliquent (vécu le 2026-10-08 : menu ☰ en bas de page, sous les boutons collés et
   * le voile). */
  /* Page « Mon activité » de l'élève (demande de l'utilisateur, 2026-10-08, maquette A) : le lien de WIMS
   * (module adm/class/activity) mène à la page Nova de l'accueil (nova_activite=1, _widgets/activite.phtml), sauf
   * réglage --nova-activite: non (page Apparence) ou « Menus comme le thème standard ». */
  function activiteLien() {
    if (!document.getElementById('nova-eleve') || standard('menus')) return;
    var v = getComputedStyle(document.documentElement).getPropertyValue('--nova-activite').trim().replace(/["']/g, '');
    if (v === 'non') return;
    document.querySelectorAll('#wimsmenumodubox a[href*="module=adm%2Fclass%2Factivity"], #wimstopbox a[href*="module=adm%2Fclass%2Factivity"]').forEach(function (a) {
      a.href = a.href.replace(/module=adm%2Fclass%2Factivity(&\+job=[^&]*)?/, 'module=home&+nova_activite=1');
    });
  }

  /* Badges de l'élève (demande de l'utilisateur, 2026-10-07, maquette B ; premier badge : Fidélité).
   *  - « Mes badges » dans le menu du compte de l'élève, sur toutes ses pages, quand --nova-badges vaut oui
   *    (pas en session d'examen) : lien vers l'accueil de la classe, qui ouvre la fenêtre (#nova-badges) ;
   *  - sur l'accueil (user.phtml) : pastille à côté de « Mes notes », annonce d'un nouveau niveau, et données
   *    du badge (#nova-badges, calculées par _procs/badges.awk) pour la fenêtre, ouverte d'un toucher. */
  function badges() {
    var racine = document.documentElement;
    var actif = getComputedStyle(racine).getPropertyValue('--nova-badges').trim().replace(/["']/g, '') === 'oui';
    if (getComputedStyle(racine).getPropertyValue('--nova-badges-actifs').trim().replace(/["']/g, '') === 'aucun') actif = false;
    var maison = document.querySelector('#wimstopbox .class_home a[href]');
    var surAccueil = !!document.getElementById('nova-badges');
    // « Mes badges » juste après « Mes notes », dans le même menu (le menu latéral ; demande de l'utilisateur,
    // 2026-10-07). Classe « heart » : icône cœur du jeu Font_Awesome de WIMS (sans elle, un tiret), rien
    // avec le jeu « default ».
    var notes = document.querySelector('#wimsmenumodubox .menuitem > a.myscore');
    var textes = document.getElementById('nova-textes');
    if (actif && notes && document.getElementById('nova-eleve') && (maison || surAccueil) &&
        !document.body.classList.contains('nova-examen-session') && !document.querySelector('.nova-mes-badges')) {
      var item = notes.parentNode.cloneNode(false);
      item.removeAttribute('id');
      var lien = document.createElement('a');
      lien.className = 'heart nova-mes-badges';
      lien.href = maison ? maison.href.split('#')[0] + '#nova-badges' : '#nova-badges';   // accueil : sans lien de retour
      lien.textContent = (textes && textes.getAttribute('data-texte-mes-badges')) || 'My badges';
      item.appendChild(lien);
      notes.parentNode.parentNode.insertBefore(item, notes.parentNode.nextSibling);
    }

    var d = document.getElementById('nova-badges');
    if (!d) return;
    var masquer = document.querySelector('.nova-badge-annonce .nova-badge-masquer');
    if (masquer) masquer.addEventListener('click', function () { masquer.closest('.nova-badge-annonce').remove(); });
    var fenetre = null;
    var ouvrir = function (badge) {
      if (!fenetre) fenetre = fenetreBadges(d);
      if (badge && fenetre.choisir) fenetre.choisir(badge);
      if (typeof fenetre.showModal === 'function') { if (!fenetre.open) fenetre.showModal(); }
      else fenetre.setAttribute('open', '');
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#nova-badges"]');
      if (!a) return;
      e.preventDefault();
      ouvrir(a.getAttribute('data-badge'));
    });
    if (location.hash === '#nova-badges') {
      try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* adresse gardée */ }
      ouvrir();
    }
  }

  function fenetreBadges(d) {
    var a = function (nom) { return d.getAttribute('data-' + nom) || ''; };
    var el = function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte != null) e.textContent = texte;
      return e;
    };
    var noms = a('niveaux').split(',');
    var reg = a('reglages').split(/\s+/);   // reglages <exercices/semaine> <réussite> <échec> <échecs> <examens>
    var parsem = +reg[1] || 1, reussite = reg[2] || '7', echec = reg[3] || '5', nechecs = reg[4] || '2', examens = reg[5] !== '0';
    var nsess = +reg[7] || 2;   // Échauffement : sessions d'entraînement demandées avant le DM noté
    var f = el('dialog', 'nova-badges-fenetre');
    f.setAttribute('aria-labelledby', 'nova-badges-titre');
    var tete = el('div', 'nova-badges-entete');
    var h = el('h2', '', a('titre'));
    h.id = 'nova-badges-titre';
    var fermer = el('button', 'nova-badges-fermer', '\u00d7');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', a('fermer'));
    fermer.addEventListener('click', function () { f.close ? f.close() : f.removeAttribute('open'); });
    tete.appendChild(h); tete.appendChild(fermer);
    f.appendChild(tete);
    // Toucher à côté de la fenêtre : la ferme.
    f.addEventListener('click', function (e) { if (e.target === f && f.close) f.close(); });

    var dateLongue = function (o) {
      if (!/^\d{8}$/.test(o)) return '';
      return new Date(+o.slice(0, 4), +o.slice(4, 6) - 1, +o.slice(6, 8)).toLocaleDateString(racineLangue(), { day: 'numeric', month: 'long', year: 'numeric' });
    };
    // Panneau commun : en-tête (image, nom, niveau, date, règle), chiffres, état, grille des niveaux, aide.
    var panneau = function (cle, nom, niveau, np, paliers, obtenu, regle, chiffresListe, etatClasse, etatTexte, unite, aide, images) {
      var carte = el('section', 'nova-badge-detail');
      carte.setAttribute('data-badge', cle);
      var image = function (n) { return images + Math.max(1, n) + '.webp'; };
      var haut = el('div', 'nova-badge-haut');
      var img = el('img', niveau ? '' : 'nova-badge-verrou');
      img.src = image(niveau); img.alt = ''; img.width = 96; img.height = 96;
      haut.appendChild(img);
      var titre = el('div');
      titre.appendChild(el('h3', '', nom));
      titre.appendChild(el('p', 'nova-badge-niveau', niveau ? noms[niveau - 1] + ' \u00b7 ' + a('niveau') + ' ' + niveau + '/' + np : a('aucun')));
      var dt = niveau ? dateLongue(obtenu) : '';
      if (dt) titre.appendChild(el('p', '', a('obtenu') + ' ' + dt + '.'));
      titre.appendChild(el('p', '', regle));
      haut.appendChild(titre);
      carte.appendChild(haut);
      var chiffres = el('div', 'nova-badge-chiffres');
      chiffresListe.forEach(function (c) {
        var b = el('div');
        b.appendChild(el('b', '', String(c[0])));
        b.appendChild(el('span', '', c[1]));
        chiffres.appendChild(b);
      });
      carte.appendChild(chiffres);
      if (etatTexte) carte.appendChild(el('p', 'nova-badge-etat nova-badge-etat-' + etatClasse, etatTexte));
      var grille = el('ol', 'nova-badge-niveaux');
      paliers.forEach(function (p, i) {
        var n = i + 1;
        var li = el('li', n < niveau ? 'nova-atteint' : (n === niveau ? 'nova-atteint nova-actuel' : 'nova-verrou'));
        var im = el('img');
        im.src = image(n); im.alt = ''; im.width = 52; im.height = 52; im.loading = 'lazy';
        li.appendChild(im);
        li.appendChild(el('span', '', noms[i] || String(n)));
        li.appendChild(el('b', '', unite ? p + ' ' + unite : String(p)));
        grille.appendChild(li);
      });
      carte.appendChild(grille);
      if (aide) carte.appendChild(el('p', 'nova-badge-aide', aide));
      return carte;
    };
    var panneaux = [];
    // Régularité (ex-Fidélité ; compteur de semaines depuis le 2026-11-07, maquette validée par l'utilisateur) :
    // fidelite on niveau total total etat prochain nouveau obtenu np paliers… (etat : fait | attente).
    var mf = a('fidelite').split(/\s+/);
    if (mf[1] === 'on') {
      var niveau = +mf[2], totalF = +mf[3], etat = mf[5] === 'fait' ? 'fait' : 'attente', prochain = +mf[6], np = +mf[9];
      var paliers = mf.slice(10, 10 + np).map(Number);
      var suite = niveau < np ? (prochain === 1 ? a('fid-suite1') : a('fid-suite')).replace('%n', prochain).replace('%s', noms[niveau]) : a('max');
      var etatTexte = etat === 'fait' ? (a('fid-etat-fait') + ' ' + suite).trim()
        : (parsem === 1 ? a('fid-etat-attente1') : a('fid-etat-attente')).replace('%e', parsem);
      var chiffresF = [[totalF, a('fid-total')]];
      if (niveau < np) chiffresF.push([prochain, a('avant').replace('%s', noms[niveau])]);
      panneaux.push(['fidelite', a('fid-nom'), panneau('fidelite', a('fid-nom'), niveau, np, paliers, mf[8],
        (parsem === 1 ? a('fid-regle1') : a('fid-regle')).replace('%e', parsem), chiffresF, etat, etatTexte, a('sem'), a('fid-aide'), a('images-fidelite'))]);
    }
    // Persévérance : perseverance on niveau total prochain nouveau obtenu np paliers…
    var mp = a('perseverance').split(/\s+/);
    if (mp[1] === 'on') {
      var nivP = +mp[2], total = +mp[3], prochP = +mp[4], npP = +mp[7];
      var palP = mp.slice(8, 8 + npP).map(Number);
      var chiffresP = [[total, a('per-total')]];
      if (nivP < npP) chiffresP.push([prochP, a('avant').replace('%s', noms[nivP])]);
      // « En cours » : exercice qui n'attend qu'une réussite (titre|échecs), sinon ce qui reste.
      var enc = a('encours'), etatP, texteP;
      if (enc && enc.indexOf('|') > 0) {
        var t = enc.split('|');
        etatP = 'attente';
        texteP = a('per-encours').replace('%t', t[0]).replace('%n', t[1]).replace('%e', echec);
      } else {
        etatP = 'fait';
        texteP = nivP < npP ? (prochP === 1 ? a('per-suite1') : a('per-suite')).replace('%n', prochP).replace('%s', noms[nivP]) : a('max');
      }
      panneaux.push(['perseverance', a('per-nom'), panneau('perseverance', a('per-nom'), nivP, npP, palP, mp[6],
        a('per-regle').replace('%r', reussite).replace('%n', nechecs).replace('%e', echec), chiffresP, etatP, texteP, '',
        a(examens ? 'per-examens-oui' : 'per-examens-non'), a('images-perseverance'))]);
    }
    // Échauffement (DM WIMS, 2026-11-06) : echauffement on niveau total prochain nouveau obtenu np paliers… ;
    // data-dm = « faites demandées titre » du DM noté ouvert et pas encore commencé, ou « - ».
    var mh = a('echauffement').split(/\s+/);
    if (mh[1] === 'on') {
      var nivH = +mh[2], totalH = +mh[3], prochH = +mh[4], npH = +mh[7];
      var palH = mh.slice(8, 8 + npH).map(Number);
      var chiffresH = [[totalH, a('ech-total')]];
      if (nivH < npH) chiffresH.push([prochH, a('avant').replace('%s', noms[nivH])]);
      var dm = /^dm (\d+) (\d+) (.+)$/.exec(a('dm')), etatH, texteH;
      if (dm) {
        var reste = +dm[2] - +dm[1];
        etatH = reste > 0 ? 'attente' : 'fait';
        texteH = (reste > 1 ? a('ech-dm').replace('%n', reste) : (reste === 1 ? a('ech-dm1') : a('ech-pret'))).replace('%t', dm[3]);
      } else {
        etatH = 'fait';
        texteH = nivH < npH ? (prochH === 1 ? a('ech-suite1') : a('ech-suite')).replace('%n', prochH).replace('%s', noms[nivH]) : a('max');
      }
      panneaux.push(['echauffement', a('ech-nom'), panneau('echauffement', a('ech-nom'), nivH, npH, palH, mh[6],
        (nsess === 1 ? a('ech-regle1') : a('ech-regle')).replace('%n', nsess), chiffresH, etatH, texteH, '',
        a('ech-aide'), a('images-echauffement'))]);
    }
    // Au top (DM WIMS notés réussis, 2026-11-07) : top on niveau total prochain nouveau obtenu np paliers… ;
    // data-topdm = « topdm <note retenue | -> <seuil> <titre> » du DM noté ouvert le plus récent, ou « topdm - ».
    var mt = a('top').split(/\s+/);
    if (mt[1] === 'on') {
      var nivT = +mt[2], totalT = +mt[3], prochT = +mt[4], npT = +mt[7];
      var palT = mt.slice(8, 8 + npT).map(Number);
      var chiffresT = [[totalT, a('top-total')]];
      if (nivT < npT) chiffresT.push([prochT, a('avant').replace('%s', noms[nivT])]);
      var td = /^topdm (\S+) (\S+) (.+)$/.exec(a('topdm')), etatT, texteT;
      var virgule = function (n) { return String(Math.round(n * 10) / 10).replace('.', racineLangue() === 'fr' ? ',' : '.'); };
      var seuilT = +reg[8] || (td ? +td[2] : 9);
      if (td && td[1] === '-') { etatT = 'attente'; texteT = a('top-afaire'); }
      else if (td && +td[1] >= seuilT) { etatT = 'fait'; texteT = a('top-reussi'); }
      else if (td) { etatT = 'attente'; texteT = a('top-encore'); }
      if (td) texteT = texteT.replace('%t', td[3]).replace('%n', virgule(+td[1])).replace('%s', virgule(seuilT));
      else {
        etatT = 'fait';
        texteT = nivT < npT ? (prochT === 1 ? a('top-suite1') : a('top-suite')).replace('%n', prochT).replace('%s', noms[nivT]) : a('max');
      }
      panneaux.push(['top', a('top-nom'), panneau('top', a('top-nom'), nivT, npT, palT, mt[6],
        a('top-regle').replace('%s', virgule(seuilT)), chiffresT, etatT, texteT, '', a('top-aide'), a('images-top'))]);
    }
    // Couleur personnelle : carte dans l'onglet du badge choisi par l'enseignant (reglages : 9e champ badge, 10e niveau).
    var drC = droitsCouleur(d);
    panneaux.forEach(function (p) {
      if (!drC || (p[0] !== drC.badge && p[0] !== drC.badgeDeg)) return;
      var detail = p[2], aide = detail.querySelector('.nova-badge-aide');
      var carte = carteCouleur(d, p[0]);
      detail.insertBefore(carte, detail.querySelector('.nova-badge-niveaux') || aide);
    });
    // Onglets, s'il y a plus d'un badge.
    var onglets = null;
    f.choisir = function (cle) {
      panneaux.forEach(function (p) {
        var on = p[0] === cle;
        p[2].hidden = !on;
        if (p[3]) { p[3].setAttribute('aria-selected', on ? 'true' : 'false'); p[3].classList.toggle('nova-actif', on); p[3].tabIndex = on ? 0 : -1; }
      });
    };
    if (panneaux.length > 1) {
      onglets = el('div', 'nova-badges-onglets');
      onglets.setAttribute('role', 'tablist');
      panneaux.forEach(function (p) {
        var b = el('button', 'nova-badges-onglet');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.id = 'nova-onglet-' + p[0];
        var im = el('img');
        var niv = +({ fidelite: mf, perseverance: mp, echauffement: mh, top: mt }[p[0]][2]);
        im.src = a('images-' + p[0]) + Math.max(1, niv) + '.webp'; im.alt = ''; im.width = 28; im.height = 28;
        if (!niv) im.className = 'nova-badge-verrou';
        b.appendChild(im);
        b.appendChild(el('span', 'nova-badges-onglet-nom', p[1]));
        b.title = p[1];
        b.addEventListener('click', function () { f.choisir(p[0]); });
        p[2].setAttribute('role', 'tabpanel');
        p[2].setAttribute('aria-labelledby', b.id);
        p[3] = b;
        onglets.appendChild(b);
      });
      onglets.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var i = panneaux.findIndex(function (p) { return !p[2].hidden; });
        var n = (i + (e.key === 'ArrowRight' ? 1 : panneaux.length - 1)) % panneaux.length;
        f.choisir(panneaux[n][0]); panneaux[n][3].focus();
      });
      f.appendChild(onglets);
    }
    panneaux.forEach(function (p) { f.appendChild(p[2]); });
    if (panneaux.length) f.choisir(panneaux[0][0]);
    document.body.appendChild(f);
    return f;
  }

  /* Accueil de l'élève, écran étroit (2026-11-11, utilisateur) : « Mes notes » garde sa largeur ; la pastille des badges
   * montre moins de badges (les derniers d'abord, au moins un), puis perd son libellé s'il le faut (le lien garde son
   * aria-label). Recalculé quand la largeur change. */
  function pastilleBadges() {
    var p = document.querySelector('.nova-mes-notes a.nova-pastille-badge');
    if (!p) return;
    var imgs = [].slice.call(p.querySelectorAll('img')), libelle = p.querySelector('span');
    var ajuster = function () {
      imgs.forEach(function (i) { i.hidden = false; });
      if (libelle) libelle.hidden = false;
      for (var n = imgs.length - 1; n > 0 && p.scrollWidth > p.clientWidth + 1; n--) imgs[n].hidden = true;
      if (libelle && p.scrollWidth > p.clientWidth + 1) libelle.hidden = true;
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    window.addEventListener('load', ajuster);
  }
