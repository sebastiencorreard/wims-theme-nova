
  /* ===== js/src/50-exercice.js : page de réponse, claviers, images cliquables, dominos ===== */
  /* Exercice OEF (demande de l'utilisateur, 2026-10-05). « Envoyer la réponse » (div.send_answer) devient
   * « Valider ». Page de réponse (scripts/oef/answer.phtml) : le tableau « Analyse de votre réponse » (une
   * ligne par réponse : nom, réponse de l'élève, span.oef_indgood|oef_indbad|oef_indpartial|oef_indprec et la
   * bonne réponse en div.inline.tt) devient un verdict en tête de .oefanswer ; le CSS masque le reste du bloc
   * sauf .oef_feedbacks. La réponse réaffichée dans l'énoncé (scripts/oef/embed.phtml : div.oef_ind… suivi de
   * <sup><small>[k]</small></sup>, k = nom de la ligne) : rouge si fausse ; étoiles (depuis la place du bouton « Valider ») si tout est juste, la page vibre si tout est faux ;
   * oef_indneutral (bonne réponse non montrée) prend l'état de sa ligne. Ligne inconnue (conditions, « voir
   * l'analyse ») : rien ne change. */
  function retourReponse() {
    if (standard('reponse')) return;   // réglage « Réponse comme le thème standard »
    var textes = document.getElementById('nova-textes');
    var texte = function (cle, defaut) { return (textes && textes.getAttribute('data-' + cle)) || defaut; };
    document.querySelectorAll('.wimsbody .send_answer input[type="submit"]').forEach(function (b) {
      b.value = texte('valider', 'Submit');
      b.classList.add('nova-valider');
      // Place du bouton à l'envoi, à l'écran : les étoiles de la page de réponse en partiront.
      if (b.form) b.form.addEventListener('submit', function () {
        var r = b.getBoundingClientRect();
        try { sessionStorage.setItem('nova-valider', JSON.stringify({ l: r.left, t: r.top, w: r.width, h: r.height, quand: Date.now() })); } catch (e) { /* sans stockage : étoiles sur le verdict */ }
      });
    });
    var reponse = document.querySelector('.wimsbody .oefanswer');
    if (!reponse) return;
    var tableau = reponse.querySelector('table.answeranalysis');
    var lignes = [], inconnues = 0, conditions = 0;
    if (tableau) tableau.querySelectorAll('tr').forEach(function (tr) {
      // L'état est le span en tête de la dernière cellule : oef_ind… pour une réponse, oef_cond… pour une
      // condition (OUI/NON). La bonne réponse montrée à côté peut porter elle-même oef_indgood (étiquettes
      // clickfill, E3/measurement/oefdatagestion.fr, vécu 2026-10-05) : ne pas chercher ailleurs.
      var derniere = tr.lastElementChild;
      var marque = derniere && derniere.querySelector(':scope > span[class^="oef_ind"], :scope > span[class^="oef_cond"]');
      var m = marque && /^oef_(ind|cond)(good|bad|partial|prec)\b/.exec(marque.className);
      var etat = m ? { good: 'bonne', bad: 'mauvaise', partial: 'partielle', prec: 'precision' }[m[2]] : null;
      if (!etat) { if (tr.textContent.trim()) inconnues++; return; }
      var reponseEleve = m[1] === 'ind' && tr.children.length >= 3;
      if (m[1] === 'cond') conditions++;
      lignes.push({ etat: etat, nom: tr.children[0].textContent.replace(/[\s:=]+$/, '').trim(),
        eleve: reponseEleve ? tr.children[1] : null, juste: reponseEleve ? tr.children[2].querySelector('div.inline.tt') : null, champs: [] });
    });
    // Lignes sans état (« voir l'analyse », renvois) : sans conséquence s'il y a des conditions, qui donnent
    // alors le verdict ; sinon, WIMS tel quel, et l'animation suit la note (noteSeule).
    if (!lignes.length || (inconnues && !conditions)) { reponse.classList.add('nova-retour-pret'); noteSeule(reponse); return; }

    // Réponses réaffichées dans l'énoncé, rattachées à leur ligne par le renvoi [k].
    var renvoiDe = function (el) { var r = el.nextElementSibling; return r && r.tagName === 'SUP' ? r.textContent.trim() : ''; };
    document.querySelectorAll('.oefstatement div[class*="oef_ind"]').forEach(function (champ) {
      var m = /\boef_ind(good|bad|partial|prec|neutral)\b/.exec(champ.className);
      if (!m) return;
      var nom = renvoiDe(champ);
      var ligne = lignes.filter(function (l) { return nom && l.nom === nom; })[0];
      if (ligne) ligne.champs.push(champ);
      else if (m[1] === 'bad') champ.classList.add('nova-faux');
    });
    // Réponses à choix (cases à cocher, mots à marquer, choix unique réaffichés en liste : scripts/oef/embed.phtml ;
    // variante A choisie par l'utilisateur le 2026-11-08) : chaque choix est marqué dans l'énoncé — cadre et
    // pastille ✓ (choisi, juste), ✕ (choisi à tort), ! en pointillé (oublié : oef_indforget), choix non retenus
    // pâlis ; sans bonne réponse montrée (presentgood=0), seulement « choisi », en couleur d'accent. Une ligne est
    // « à choix » si elle a plusieurs champs, ou si des choix non retenus (sans renvoi) sont à côté de son champ.
    // Réponse partiellement juste : WIMS marque tous les choix « partial » ; le bon est retrouvé dans sa liste
    // « la bonne réponse est … » (même image, ou même texte).
    var nonRetenus = Array.prototype.filter.call(document.querySelectorAll('.oefstatement div.inline[class*="oef_"]'), function (d) {
      return /\boef_(indforget|indneutral|empty)\b/.test(d.className) && !renvoiDe(d);
    });
    var voisin = function (champ) {
      var zone = champ.parentElement && champ.parentElement.parentElement;
      return zone && nonRetenus.some(function (d) { return zone.contains(d); });
    };
    var cleChoix = function (el) {
      var img = el.querySelector('img');
      return img ? 'img:' + img.getAttribute('src') : 'txt:' + el.textContent.replace(/\s+/g, ' ').trim();
    };
    var oublies = 0, aTort = 0, choixVus = false;
    lignes.forEach(function (ligne) {
      if (!ligne.champs.length || !(ligne.champs.length > 1 || ligne.champs.some(voisin))) return;
      ligne.choix = true;
      choixVus = true;
      var bons = null;
      if (ligne.juste) {
        bons = {};
        Array.prototype.forEach.call(ligne.juste.querySelectorAll('img'), function (i) { bons['img:' + i.getAttribute('src')] = true; });
        ligne.juste.textContent.split(',').forEach(function (t) { t = t.replace(/\s+/g, ' ').trim(); if (t) bons['txt:' + t] = true; });
      }
      ligne.champs.forEach(function (champ) {
        var m = /\boef_ind(good|bad|partial|prec|neutral)\b/.exec(champ.className);
        var etat = m[1] === 'good' ? 'juste' : m[1] === 'bad' ? 'faux' : 'pris';
        if (etat === 'pris' && m[1] !== 'neutral' && bons) etat = bons[cleChoix(champ)] ? 'juste' : 'faux';
        if (etat === 'faux') aTort++;
        champ.classList.add('nova-choix', 'nova-choix-' + etat);
      });
    });
    if (choixVus) nonRetenus.forEach(function (d) {
      if (/\boef_indforget\b/.test(d.className)) { d.classList.add('nova-choix', 'nova-choix-oublie'); oublies++; }
      else if (/\boef_indneutral\b/.test(d.className)) d.classList.add('nova-choix-neutre');
    });
    // Pastilles et noms des états, pour les lecteurs d'écran (pastille dessinée en CSS).
    document.querySelectorAll('.oefstatement .nova-choix').forEach(function (champ) {
      var etat = /nova-choix-(juste|faux|oublie|pris)/.exec(champ.className)[1];
      var p = document.createElement('span');
      p.className = 'nova-choix-pastille';
      p.setAttribute('role', 'img');
      p.setAttribute('aria-label', texte('choix-' + etat, { juste: 'chosen, correct', faux: 'chosen, wrong', oublie: 'missed', pris: 'chosen' }[etat]));
      champ.appendChild(p);
      // Choix « image » (figure, photo) : cadre collé à l'image. Une formule rendue en image par WIMS (formules en mode
      // image, réglage de l'élève ou du site) reste un choix « texte » : petite image, de la hauteur d'une ligne
      // (vu le 2026-11-08 : texte coupé par le cadre). Seuil : 40 px.
      var imgs = [].slice.call(champ.querySelectorAll('img'));
      var texteSeul = champ.textContent.replace(/\s+/g, '').length;
      if (!imgs.length || texteSeul) return;
      var classer = function () {
        if (imgs.some(function (i) { return !i.complete; })) return;
        if (imgs.some(function (i) { return Math.max(i.naturalHeight || 0, i.getBoundingClientRect().height) >= 40; })) champ.classList.add('nova-choix-image');
      };
      imgs.forEach(function (i) { if (!i.complete) i.addEventListener('load', classer); });
      classer();
    });
    // Le verdict ne répète plus les choix (demande de l'utilisateur, 2026-11-08) : « il manque n réponses »,
    // « n réponses choisies à tort ».
    var pluriel = function (n, cle, un, plusieurs) { return texte(cle + (n > 1 ? 's' : ''), n > 1 ? plusieurs : un).replace('%1', n); };
    lignes.forEach(function (ligne) {
      if (!ligne.choix || !ligne.juste || ligne.etat === 'bonne') return;
      var r = [];
      if (aTort) r.push(pluriel(aTort, 'choix-a-tort', '%1 answer chosen by mistake', '%1 answers chosen by mistake'));
      if (oublies) r.push(pluriel(oublies, 'choix-manque', '%1 answer missing', '%1 answers missing'));
      if (r.length) { ligne.resume = r.join(', '); ligne.juste = null; }
    });
    lignes.forEach(function (ligne) {
      if (ligne.etat === 'mauvaise' && !ligne.choix) ligne.champs.forEach(function (champ) { champ.classList.add('nova-faux'); });
    });

    var toutes = lignes.every(function (l) { return l.etat === 'bonne'; });
    var fausse = lignes.some(function (l) { return l.etat === 'mauvaise'; });
    // Animations seulement si le verdict est entier (demande de l'utilisateur, 2026-10-05) : étoiles quand
    // tout est juste, vibration quand tout est faux ; rien dans les cas intermédiaires.
    var toutesFausses = lignes.every(function (l) { return l.etat === 'mauvaise'; });
    var boite = document.createElement('div');
    boite.className = 'nova-verdict nova-verdict-' + (toutes ? 'bonne' : fausse ? 'mauvaise' : 'partielle');
    boite.setAttribute('role', 'status');
    var corps = document.createElement('div');
    corps.className = 'nova-verdict-corps';
    boite.appendChild(corps);
    var titre = document.createElement('p');
    titre.className = 'nova-verdict-titre';
    corps.appendChild(titre);
    var libelle = function (etat) {
      return etat === 'mauvaise' ? texte('mauvaise', 'Wrong answer') : etat === 'partielle' ? texte('partielle', 'Partly correct answer')
        : etat === 'precision' ? texte('precision', 'Not precise enough') : texte('bonne', 'Correct answer');
    };
    // « …, la bonne réponse était X » : la bonne réponse de WIMS est déplacée (MathJax compris).
    var completer = function (el, ligne) {
      if (ligne.resume) el.appendChild(document.createTextNode(', ' + ligne.resume));
      if (!ligne.juste) return;
      el.appendChild(document.createTextNode(', ' + texte('bonne-etait', 'the correct answer was') + ' '));
      ligne.juste.classList.add('nova-verdict-juste');
      el.appendChild(ligne.juste);
    };
    // Réponse hors énoncé, fausse : copie de la réponse de l'élève, en rouge.
    var eleve = function (ligne) {
      if (!ligne.eleve || ligne.champs.length || ligne.etat === 'bonne' || !ligne.eleve.textContent.trim()) return;
      var p = document.createElement('p');
      p.className = 'nova-verdict-eleve';
      p.appendChild(document.createTextNode(texte('votre-reponse', 'Your answer:') + ' '));
      var copie = document.createElement('span');
      copie.className = ligne.etat === 'mauvaise' ? 'nova-faux' : '';
      while (ligne.eleve.firstChild) copie.appendChild(ligne.eleve.firstChild);
      p.appendChild(copie);
      corps.appendChild(p);
    };
    if (toutes) {
      titre.textContent = lignes.length > 1 ? texte('bonnes', 'Correct answers') : texte('bonne', 'Correct answer');
      etoiles(boite);
    } else if (lignes.length === 1) {
      titre.textContent = libelle(lignes[0].etat);
      completer(titre, lignes[0]);
      eleve(lignes[0]);
    } else if (lignes.some(function (l) { return l.etat === 'bonne'; })) {
      // Réponses justes et à revoir mêlées : deux colonnes, « Justes » | « À revoir » (maquette A, choisie par
      // l'utilisateur le 2026-10-08). Chaque ligne : [k], la réponse de l'élève, et pour une réponse à revoir
      // la bonne réponse de WIMS (déplacée, MathJax compris).
      var justes = lignes.filter(function (l) { return l.etat === 'bonne'; }).length;
      titre.textContent = texte(justes > 1 ? 'justes-sur' : 'juste-sur', justes > 1 ? '%1 correct answers out of %2' : '%1 correct answer out of %2')
        .replace('%1', justes).replace('%2', lignes.length);
      boite.className = 'nova-verdict nova-verdict-mixte';
      var colonnes = document.createElement('div');
      colonnes.className = 'nova-verdict-colonnes';
      var colonne = function (cle, nom) {
        var c = document.createElement('div');
        c.className = 'nova-verdict-colonne nova-verdict-colonne-' + cle;
        var t = document.createElement('p');
        t.className = 'nova-verdict-colonne-titre';
        t.textContent = nom;
        c.appendChild(t);
        var ul = document.createElement('ul');
        c.appendChild(ul);
        colonnes.appendChild(c);
        return ul;
      };
      var listeJustes = colonne('justes', texte('justes', 'Correct'));
      var listeRevoir = colonne('revoir', texte('a-revoir', 'To review'));
      lignes.forEach(function (ligne) {
        var li = document.createElement('li');
        if (ligne.nom) {
          var num = document.createElement('span');
          num.className = 'nova-verdict-num';
          num.textContent = /^\d+$/.test(ligne.nom) ? '[' + ligne.nom + ']' : ligne.nom + ' :';
          li.appendChild(num);
        }
        var contenu = document.createElement('span');
        li.appendChild(contenu);
        var donnee = ligne.eleve && ligne.eleve.textContent.trim() ? document.createElement('span') : null;
        if (donnee) {
          while (ligne.eleve.firstChild) donnee.appendChild(ligne.eleve.firstChild);
          if (ligne.etat === 'mauvaise') donnee.className = 'nova-faux';
          contenu.appendChild(donnee);
        }
        if (ligne.etat === 'bonne') { listeJustes.appendChild(li); return; }
        if (ligne.etat !== 'mauvaise') contenu.appendChild(document.createTextNode((donnee ? ' \u2014 ' : '') + libelle(ligne.etat)));
        if (ligne.juste) {
          contenu.appendChild(document.createTextNode((donnee || ligne.etat !== 'mauvaise' ? ' \u2192 ' : '') + texte('bonne-etait', 'the correct answer was') + ' '));
          ligne.juste.classList.add('nova-verdict-juste');
          contenu.appendChild(ligne.juste);
        } else if (ligne.resume) contenu.appendChild(document.createTextNode(' \u2192 ' + ligne.resume));
        else if (!donnee && ligne.etat === 'mauvaise') contenu.appendChild(document.createTextNode(libelle('mauvaise')));
        listeRevoir.appendChild(li);
      });
      corps.appendChild(colonnes);
    } else {
      titre.textContent = libelle(fausse ? 'mauvaise' : 'partielle');
      var liste = document.createElement('ul');
      lignes.forEach(function (ligne) {
        if (ligne.etat === 'bonne') return;
        var li = document.createElement('li');
        // Le titre dit déjà « Mauvaise réponse » : « [k] : la bonne réponse était X » suffit.
        li.textContent = ligne.nom ? ligne.nom + ' : ' : '';
        if (ligne.etat === 'mauvaise' && ligne.juste) {
          li.appendChild(document.createTextNode(texte('bonne-etait', 'the correct answer was') + ' '));
          ligne.juste.classList.add('nova-verdict-juste');
          li.appendChild(ligne.juste);
        } else {
          li.appendChild(document.createTextNode(libelle(ligne.etat)));
          completer(li, ligne);
        }
        liste.appendChild(li);
      });
      corps.appendChild(liste);
      lignes.forEach(eleve);
    }
    reponse.insertBefore(boite, reponse.firstChild);
    reponse.classList.add('nova-retour', 'nova-retour-pret');
    if (toutesFausses) vibrer();
  }

  // Verdict que Nova ne sait pas lire (tableau vide : le verdict est dans les commentaires de l'auteur, ex.
  // H4/algebra/factorcom.fr) : WIMS tel quel ; étoiles si la note de l'exercice est 10/10, vibration si 0/10
  // (span.oef_modulescore : « … une note de N sur 10 », chiffres lus quelle que soit la langue).
  function noteSeule(reponse) {
    var note = reponse.querySelector('.oef_modulescore');
    var m = note && /(\d+(?:[.,]\d+)?)\D+10(?:\D|$)/.exec(note.textContent);
    if (!m) return;
    var n = parseFloat(m[1].replace(',', '.'));
    if (n >= 10) etoiles(reponse);
    else if (n === 0) vibrer();
  }

  // Petites étoiles (CSS : .nova-etoiles, sans animation si l'élève la refuse), centrées sur la place du
  // bouton « Valider » à l'envoi (demande de l'utilisateur, 2026-10-05) : position fixe, toujours à l'écran ;
  // à défaut (envoi ancien ou inconnu), sur l'élément donné.
  function etoiles(el) {
    if (animationsCoupees()) return;
    var nuee = document.createElement('span');
    nuee.className = 'nova-etoiles';
    nuee.setAttribute('aria-hidden', 'true');
    var place = null;
    try {
      place = JSON.parse(sessionStorage.getItem('nova-valider') || 'null');
      sessionStorage.removeItem('nova-valider');
    } catch (e) { place = null; }
    if (place && Date.now() - place.quand < 120000 && place.w > 0) {
      nuee.classList.add('nova-etoiles-valider');
      nuee.style.left = Math.max(0, Math.min(place.l, innerWidth - place.w)) + 'px';
      nuee.style.top = Math.max(60, Math.min(place.t, innerHeight - place.h)) + 'px';
      nuee.style.width = place.w + 'px';
      nuee.style.height = place.h + 'px';
      el = document.body;
    }
    var couleurs = ['var(--nova-note-jaune)', 'var(--nova-accent)', 'var(--nova-note-jaune)', 'var(--nova-note-vert)'];
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.textContent = '\u2605';
      s.style.setProperty('--x', (20 + i * 60 / 11) + '%');
      s.style.setProperty('--dx', ((i - 5.5) * 9 + Math.random() * 16 - 8).toFixed(0) + 'px');
      s.style.setProperty('--h', (-70 - Math.random() * 50).toFixed(0) + 'px');
      s.style.setProperty('--d', (Math.random() * 0.35).toFixed(2) + 's');
      s.style.setProperty('--t', (11 + Math.random() * 9).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 120 - 60).toFixed(0) + 'deg');
      s.style.setProperty('--c', couleurs[i % couleurs.length]);
      nuee.appendChild(s);
    }
    if (el !== document.body) el.classList.add('nova-etoile-source');
    el.appendChild(nuee);
    setTimeout(function () { if (nuee.parentNode) nuee.parentNode.removeChild(nuee); }, 2500);
  }

  // Réponse fausse : toute la page vibre, brièvement (demande de l'utilisateur, 2026-10-05).
  function vibrer() {
    if (animationsCoupees()) return;
    var racine = document.documentElement;
    racine.classList.add('nova-vibre');
    setTimeout(function () { racine.classList.remove('nova-vibre'); }, 600);
  }

  /* Champs de réponse d'un exercice (scripts/anstype/*.input : le type n'est pas visible dans le HTML) :
   * - ni correction automatique, ni vérification d'orthographe (qui trahirait une faute dans une réponse en
   *   mots), ni majuscule automatique (WIMS n'en protège pas « units » et « sigunits ») ;
   * - pas de pavé numérique : un champ « numeric » accepte le signe moins et les fractions (2/3), absents
   *   des pavés décimal ou téléphone (iPhone surtout) ; le clavier texte reste le seul complet ;
   * - Entrée dans un champ alors qu'un autre est vide : passe au champ vide suivant au lieu d'envoyer
   *   (WIMS refuserait l'envoi) ; touche Entrée du téléphone « Suivant », puis « OK » sur le dernier ;
   * - focus sur le premier champ à l'ouverture.
   * Demande de l'utilisateur, 2026-10-06. */
  function claviersReponse() {
    var form = document.forms.replyform;
    if (!form) return;
    var champs = Array.prototype.filter.call(form.querySelectorAll('input[name^="reply"], textarea[name^="reply"]'), function (c) {
      return c.tagName === 'TEXTAREA' || !c.type || c.type === 'text';
    });
    champs.forEach(function (c) {
      c.setAttribute('autocapitalize', 'off');
      c.setAttribute('autocorrect', 'off');
      c.setAttribute('spellcheck', 'false');
      c.setAttribute('autocomplete', 'off');
    });
    var lignes = champs.filter(function (c) { return c.tagName === 'INPUT' && !c.readOnly; });
    var vide = function (c) { return !c.value.trim(); };
    var majour = function () {
      lignes.forEach(function (c) {
        var autreVide = lignes.some(function (d) { return d !== c && vide(d); });
        c.setAttribute('enterkeyhint', autreVide ? 'next' : 'go');
      });
    };
    lignes.forEach(function (c, i) {
      c.addEventListener('input', majour);
      c.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' || ev.isComposing || ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var suivants = lignes.slice(i + 1).concat(lignes.slice(0, i));
        var cible = suivants.filter(vide)[0];
        if (!cible) return;                       // tout est rempli : envoi normal
        ev.preventDefault();
        cible.focus();
      });
    });
    majour();
    // Focus sur le premier champ de réponse (demande de l'utilisateur, 2026-10-06) : champ texte ou zone de
    // texte, sans défilement (l'énoncé reste en vue), seulement si rien d'autre n'a le focus.
    var premier = champs.filter(function (c) { return !c.readOnly && !c.disabled && c.getClientRects().length; })[0];
    var actif = document.activeElement;
    if (premier && (!actif || actif === document.body || actif === document.documentElement)) {
      try { premier.focus({ preventScroll: true }); } catch (e) { premier.focus(); }
    }
  }

  /* Tuiles à déplacer des exercices (dragfill, correspond… : bibliothèque Dynapi de WIMS, DragEvent, qui
   * n'écoute que la souris) : au doigt, le téléphone faisait défiler la page au lieu de déplacer la tuile.
   * Pont tactile (demande de l'utilisateur, 2026-10-06) : un toucher qui commence sur une couche Dynapi
   * déplaçable (écouteur DragEvent.lyrListener) ne fait plus défiler ; dès que le doigt bouge, il devient
   * mousedown / mousemove / mouseup pour Dynapi. Un simple toucher reste un « clic » (tuile puis
   * destination). */
  function glisserTactile() {
    var dyn = window.DynObject, drag = window.DragEvent;
    if (!dyn || !dyn.all || !drag || !drag.lyrListener || !('ontouchstart' in window)) return;
    var deplacable = function (el) {
      for (; el && el !== document.body; el = el.parentElement) {
        var obj = el.id && dyn.all[el.id];
        if (obj && obj._listeners && obj._listeners.indexOf(drag.lyrListener) >= 0) return el;
      }
      return null;
    };
    // Dynapi remplace window.MouseEvent par sa propre classe : évènement natif par document.createEvent.
    var souris = function (type, cible, x, y) {
      var e = document.createEvent('MouseEvents');
      e.initMouseEvent(type, true, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
      (cible || document.body).dispatchEvent(e);
    };
    // Hors de l'écran, elementFromPoint ne renvoie rien : le body (Dynapi ne sait pas traiter le document).
    var sous = function (x, y) { return document.elementFromPoint(x, y) || document.body; };
    var etat = null;
    document.addEventListener('touchstart', function (ev) {
      etat = null;
      if (ev.touches.length !== 1 || !deplacable(ev.target)) return;
      var t = ev.touches[0];
      etat = { cible: ev.target, x: t.clientX, y: t.clientY, glisse: false };
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', function (ev) {
      if (!etat) return;
      ev.preventDefault();                       // dès le premier mouvement : la page ne défile pas
      var t = ev.touches[0];
      if (!etat.glisse) {
        if (Math.abs(t.clientX - etat.x) + Math.abs(t.clientY - etat.y) < 6) return;
        etat.glisse = true;
        souris('mousedown', etat.cible, etat.x, etat.y);
      }
      souris('mousemove', sous(t.clientX, t.clientY), t.clientX, t.clientY);
    }, { capture: true, passive: false });
    var finir = function (ev) {
      if (!etat) return;
      var e = etat; etat = null;
      if (!e.glisse) return;                     // simple toucher : le navigateur fait son « clic »
      if (ev.cancelable) ev.preventDefault();    // pas de clic en plus après un glissement
      var t = ev.changedTouches[0];
      souris('mouseup', sous(t.clientX, t.clientY), t.clientX, t.clientY);
    };
    document.addEventListener('touchend', finir, { capture: true, passive: false });
    document.addEventListener('touchcancel', finir, { capture: true, passive: false });
  }

  /* Clavier mathématique tactile (disposition A choisie par l'utilisateur, 2026-10-06), activé par une
   * surcharge CSS (:root { --nova-clavier-maths: oui; }, jetons.css), sur un écran tactile seulement. Il
   * remplace le clavier du téléphone (inputmode="none") dans tous les champs texte de réponse ; « ABC » rend
   * le clavier du téléphone pour le champ, un petit bouton « 123 » à côté du champ ramène au clavier Nova.
   * x² → ^2, x³ → ^3, √ → sqrt() (curseur entre les parenthèses), ×10ˣ → *10^, × → *, ÷ → /. Entrée :
   * « Suivant » vers le champ vide suivant, sinon « OK » (bouton d'envoi de WIMS, sa vérification comprise).
   * Les touches ne prennent pas le focus (pointerdown sans action par défaut) : le curseur reste dans le
   * champ. */
  function clavierMaths() {
    var form = document.forms.replyform;
    if (!form || !window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    var reglage = getComputedStyle(document.documentElement).getPropertyValue('--nova-clavier-maths').trim().toLowerCase();
    if (!/^["']?(oui|yes|on|1)["']?$/.test(reglage)) return;
    var textes = document.getElementById('nova-textes');
    var t = function (n, d) { return (textes && textes.getAttribute('data-texte-clavier' + (n ? '-' + n : ''))) || d; };
    var champs = Array.prototype.filter.call(form.querySelectorAll('input[name^="reply"]'), function (c) {
      return (!c.type || c.type === 'text') && !c.readOnly && !c.disabled;
    });
    if (!champs.length) return;
    var natifs = [];
    var svg = function (d) {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    };
    var exp = function (b, e) { return b + '<sup>' + e + '</sup>'; };
    // Disposition A, colonnes permutées (demande de l'utilisateur, 2026-10-06) : chiffres et opérations à
    // gauche, fonctions et navigation à droite, « Suivant » en bas à droite. c = classe, v = texte écrit ou
    // action, a = nom accessible.
    var touches = [
      { l: '7' }, { l: '8' }, { l: '9' }, { l: '\u00F7', c: 'f', v: '/' },
      { l: exp('x', '2'), c: 'f', v: '^2', a: t('carre', 'Squared') }, { l: exp('x', '3'), c: 'f', v: '^3', a: t('cube', 'Cubed') },
      { l: '\u221A', c: 'f', v: 'racine', a: t('racine', 'Square root') },
      { l: '4' }, { l: '5' }, { l: '6' }, { l: '\u00D7', c: 'f', v: '*' },
      { l: '(' }, { l: ')' }, { l: '\u00D710' + '<sup>x</sup>', c: 'f', v: '*10^', a: t('puissance10', 'Times ten to the power') },
      { l: '1' }, { l: '2' }, { l: '3' }, { l: '\u2212', c: 'f', v: '-' },
      { l: svg('<path d="M15 6l-6 6 6 6"/>'), c: 'nav', v: 'gauche', a: t('gauche', 'Move left') },
      { l: svg('<path d="M9 6l6 6-6 6"/>'), c: 'nav', v: 'droite', a: t('droite', 'Move right') },
      { l: svg('<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-5 6M12 9l5 6"/>'), c: 'nav', v: 'effacer', a: t('effacer', 'Delete') },
      { l: '0', c: 's2' }, { l: '.' }, { l: '+', c: 'f' },
      { l: 'ABC', c: 'abc', v: 'abc', a: t('abc', 'Phone keyboard') }, { l: '', c: 'ok s2', v: 'entree' }
    ];
    var clavier = document.createElement('div');
    clavier.className = 'nova-clavier';
    clavier.setAttribute('role', 'group');
    clavier.setAttribute('aria-label', t('', 'Math keyboard'));
    clavier.hidden = true;
    var entree = null;
    touches.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'nova-touche' + (k.c ? ' ' + k.c : '');
      b.innerHTML = '<span>' + k.l + '</span>';
      b.setAttribute('data-v', k.v || k.l);
      if (k.a) b.setAttribute('aria-label', k.a);
      if (k.v === 'entree') entree = b;
      clavier.appendChild(b);
    });
    document.body.appendChild(clavier);

    var champ = null;
    var evenement = function (c) { var e = document.createEvent('Event'); e.initEvent('input', true, true); c.dispatchEvent(e); };
    var vide = function (c) { return !c.value.trim(); };
    var suivantVide = function () {
      var i = champs.indexOf(champ);
      return champs.slice(i + 1).concat(champs.slice(0, i)).filter(vide)[0] || null;
    };
    var majEntree = function () {
      if (!entree || !champ) return;
      var suite = suivantVide();
      entree.querySelector('span').textContent = suite ? t('suivant', 'Next') : t('ok', 'OK');
    };
    var inserer = function (txt, recul) {
      var a = champ.selectionStart, b = champ.selectionEnd;
      champ.setRangeText(txt, a, b, 'end');
      if (recul) { var q = champ.selectionStart - recul; champ.setSelectionRange(q, q); }
      evenement(champ);
    };
    var agir = function (v) {
      if (!champ) return;
      var a = champ.selectionStart, b = champ.selectionEnd;
      if (v === 'gauche') { var g = a === b ? Math.max(0, a - 1) : a; champ.setSelectionRange(g, g); }
      else if (v === 'droite') { var d = a === b ? Math.min(champ.value.length, b + 1) : b; champ.setSelectionRange(d, d); }
      else if (v === 'effacer') {
        if (a !== b) champ.setRangeText('', a, b, 'end');
        else if (a > 0) champ.setRangeText('', a - 1, a, 'end');
        evenement(champ);
      }
      else if (v === 'racine') inserer('sqrt()', 1);
      else if (v === 'abc') natif(champ);
      else if (v === 'entree') {
        var suite = suivantVide();
        if (suite) { suite.focus(); return; }
        var envoi = form.querySelector('.send_answer input[type="submit"], input[type="submit"]');
        if (envoi) envoi.click(); else form.submit();
      }
      else inserer(v);
      majEntree();
    };
    // Les touches ne prennent pas le focus : le curseur reste dans le champ.
    clavier.addEventListener('pointerdown', function (ev) { if (ev.target.closest('.nova-touche')) ev.preventDefault(); });
    clavier.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    clavier.addEventListener('click', function (ev) {
      var b = ev.target.closest('.nova-touche');
      if (b) agir(b.getAttribute('data-v'));
    });

    var afficher = function (c) {
      champ = c;
      clavier.hidden = false;
      document.documentElement.classList.add('nova-clavier-ouvert');
      document.documentElement.style.setProperty('--nova-clavier-h', clavier.offsetHeight + 'px');
      majEntree();
      // Le champ reste visible au-dessus du clavier.
      var r = c.getBoundingClientRect(), bas = window.innerHeight - clavier.offsetHeight - 12;
      if (r.bottom > bas) window.scrollBy(0, r.bottom - bas);
      else if (r.top < 72) window.scrollBy(0, r.top - 72);
    };
    var cacher = function () {
      clavier.hidden = true;
      document.documentElement.classList.remove('nova-clavier-ouvert');
    };
    // « ABC » : clavier du téléphone pour ce champ ; « 123 » à côté du champ pour revenir.
    var natif = function (c) {
      if (natifs.indexOf(c) < 0) natifs.push(c);
      c.setAttribute('inputmode', 'text');
      c.classList.add('nova-champ-natif');
      cacher();
      c.blur();
      c.focus();
    };
    champs.forEach(function (c) {
      c.setAttribute('inputmode', 'none');
      // Liste de suggestions vide de WIMS (list="emptylist", contre la saisie automatique) : une flèche ▼
      // apparaît sur le champ au téléphone ; inutile ici (autocomplete déjà coupé par claviersReponse).
      c.removeAttribute('list');
      c.addEventListener('input', majEntree);
    });
    // Pastille flottante en bas à droite, quand le clavier Nova est rangé : le rouvre sur le dernier champ
    // utilisé (demande de l'utilisateur, 2026-10-06). Elle suit le haut du clavier du téléphone s'il est
    // ouvert (visualViewport).
    var dernier = champs[0];
    var pastille = document.createElement('button');
    pastille.type = 'button';
    pastille.className = 'nova-pastille-clavier';
    pastille.setAttribute('aria-label', t('123', 'Math keyboard'));
    pastille.title = t('123', 'Math keyboard');
    pastille.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>';
    pastille.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
    pastille.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    pastille.addEventListener('click', function () {
      var c = dernier;
      var n = natifs.indexOf(c);
      if (n >= 0) natifs.splice(n, 1);
      c.classList.remove('nova-champ-natif');
      c.setAttribute('inputmode', 'none');
      c.blur();
      c.focus();
      afficher(c);
    });
    document.body.appendChild(pastille);
    document.documentElement.classList.add('nova-clavier-permis');
    if (window.visualViewport) {
      var suivreClavier = function () {
        var vv = window.visualViewport;
        var bas = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty('--nova-vv-bas', bas + 'px');
      };
      window.visualViewport.addEventListener('resize', suivreClavier);
      window.visualViewport.addEventListener('scroll', suivreClavier);
    }
    // Toucher ailleurs (énoncé, figure…) range le clavier Nova et rend la page entière ; la pastille le rouvre.
    document.addEventListener('pointerdown', function (ev) {
      if (clavier.hidden || clavier.contains(ev.target) || pastille.contains(ev.target) || champs.indexOf(ev.target) >= 0) return;
      cacher();
      if (champs.indexOf(document.activeElement) >= 0) document.activeElement.blur();
    }, true);
    document.addEventListener('focusin', function (ev) {
      if (champs.indexOf(ev.target) >= 0) dernier = ev.target;
      if (champs.indexOf(ev.target) >= 0 && natifs.indexOf(ev.target) < 0) afficher(ev.target);
      else if (!clavier.contains(ev.target)) cacher();
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var actif = document.activeElement;
        if (champs.indexOf(actif) < 0 || natifs.indexOf(actif) >= 0) cacher();
      }, 0);
    });
    if (champs.indexOf(document.activeElement) >= 0) afficher(document.activeElement);
  }

  /* Images cliquables des exercices (<input type="image">, réponses « coord », droites graduées…) : le
   * navigateur envoie la position du clic en pixels AFFICHÉS, que WIMS lit comme des pixels de l'image. Nova
   * réduit les champs à la largeur de la page (max-width: 100 %) : sur un écran étroit ou zoomé, le point partait
   * ailleurs (signalé par un collègue de l'utilisateur, 2026-10-07, H2/number/OEFevalwimsnbrel.fr ; pas avec Pion3,
   * qui laisse l'image déborder). La position est ramenée à l'image d'origine avant l'envoi. Clavier (Entrée) :
   * envoi ordinaire. */
  function imagesCliquables() {
    if (!document.querySelector('.wimsbody input[type="image"]')) return;
    var tailles = {};
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody input[type="image"]'), function (i) {
      var im = new Image();
      im.onload = function () { tailles[i.src] = [im.naturalWidth, im.naturalHeight]; };
      im.src = i.src;
    });
    document.addEventListener('click', function (e) {
      var i = e.target;
      if (!i || i.tagName !== 'INPUT' || i.type !== 'image' || !i.form || !i.closest('.wimsbody') || e.detail === 0) return;
      var t = tailles[i.src];
      var r = i.getBoundingClientRect();
      var c = getComputedStyle(i);
      var gauche = r.left + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft);
      var haut = r.top + parseFloat(c.borderTopWidth) + parseFloat(c.paddingTop);
      var largeur = r.width - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth) - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
      var hauteur = r.height - parseFloat(c.borderTopWidth) - parseFloat(c.borderBottomWidth) - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
      if (!t || !largeur || !hauteur || (Math.abs(largeur - t[0]) < 0.5 && Math.abs(hauteur - t[1]) < 0.5 && Math.abs(gauche - r.left) < 0.5 && Math.abs(haut - r.top) < 0.5)) return;   // taille réelle : rien à corriger
      e.preventDefault();
      var x = Math.round((e.clientX - gauche) * t[0] / largeur);
      var y = Math.round((e.clientY - haut) * t[1] / hauteur);
      x = Math.max(0, Math.min(t[0] - 1, x));
      y = Math.max(0, Math.min(t[1] - 1, y));
      var nom = i.name ? i.name + '.' : '';
      Array.prototype.forEach.call(i.form.querySelectorAll('input.nova-clic-image'), function (h) { h.remove(); });
      [['x', x], ['y', y]].forEach(function (v) {
        var h = document.createElement('input');
        h.type = 'hidden'; h.className = 'nova-clic-image'; h.name = nom + v[0]; h.value = v[1];
        i.form.appendChild(h);
      });
      if (typeof i.form.requestSubmit === 'function') i.form.requestSubmit(); else i.form.submit();
    }, true);
  }

  /* Exercices à dominos (étiquettes faites d'un tableau, scripts/anstype/fill.after ; demandes de l'utilisateur,
   * 2026-10-08) :
   *  - une consigne au-dessus des dominos (insérée avant que Dynapi ne place ses calques sur les repères
   *    fillobj1…, après « load » : rien ne se décale) ;
   *  - une seule taille de texte pour tous les dominos, la plus grande sans débordement (mesurée une fois les
   *    formules affichées par MathJax) ;
   *  - la case où le domino tomberait, en surbrillance pendant le glissement (règle de WIMS, f_cright : coin du
   *    domino à moins des 2/3 de la case), ou la case sous le pointeur quand un domino est choisi d'un clic. */
  function dominos() {
    if (standard('dominos')) return;   // réglage « Dominos du thème standard »
    var repere = document.getElementById('fillobj1');
    var exercice = !!repere && Array.prototype.some.call(document.scripts, function (sc) { return /f_objs/.test(sc.textContent) && /wimsborder/.test(sc.textContent); });
    // Page de correction (demande de l'utilisateur, 2026-10-08) : dominos réaffichés par WIMS (.drag_label >
    // .drag_content > table, dans l'énoncé et l'analyse) et ceux de la solution de l'auteur (tableaux à une ligne de
    // deux cases, marqués ici nova-domino-solution) : même habillage, même taille commune.
    var correction = !exercice && !!document.querySelector('.drag_content > table.wimsborder');
    if (!exercice && !correction) return;
    if (correction) Array.prototype.forEach.call(document.querySelectorAll('.wimsbody table.wimsborder'), function (t) {
      var lignes = t.rows;
      if (t.closest('.drag_content') || t.querySelector('table') || lignes.length !== 1 || lignes[0].cells.length !== 2) return;
      t.classList.add('nova-domino-solution');
    });
    // Ligne de solution trop large (dominos à 205 px et « = 6 = ») : elle défile dans son cadre, la page ne s'élargit pas.
    if (correction) Array.prototype.forEach.call(document.querySelectorAll('.wimsbody table:has(table.nova-domino-solution)'), function (t) {
      if (t.querySelector('table:has(table.nova-domino-solution)') || t.parentElement.classList.contains('nova-defile-x')) return;
      var cadre = document.createElement('div');
      cadre.className = 'nova-defile-x';
      t.parentNode.insertBefore(cadre, t);
      cadre.appendChild(t);
    });
    // Placement des calques par Dynapi (fill.after) : les cases d'un même groupe sont rangées en grille à partir du
    // repère du groupe, f_cut cases par ligne, pas de 205 px (stretchH) en largeur et de 50 px (stretchV) en hauteur ;
    // les dominos, sur leur repère fillobj<n> (décalage left de -205 px). Nova les fait plus hauts (80 px, CSS) : le
    // pas vertical est agrandi d'autant, sinon des cases sur plusieurs lignes se chevaucheraient. Au téléphone
    // (demande de l'utilisateur, 2026-10-08), ils sont moins larges (175 px ; 150 px d'abord : texte trop petit) :
    // places réservées, largeur, décalages et nombre de cases par ligne (f_cut) réduits avant « load », quand Dynapi
    // place ses calques.
    if (exercice && window.DynLayer && DynLayer.prototype.setAnchor) {
      var telephone = !!(window.matchMedia && matchMedia('(max-width: 639.98px)').matches);
      var etroit = 175, haut = 80 + 8, origine = null, origineV = null;
      Array.prototype.forEach.call(document.querySelectorAll('a[id^="fill"] > img, div:has(> a[id^="fillobj"]) > img'), function (im) {
        var w = parseFloat(im.style.width);
        if (!(w > 1)) return;
        if (!origine) origine = w;
        if (telephone) im.style.width = Math.round(w * etroit / origine) + 'px';
      });
      if (!telephone) etroit = origine;
      if (telephone && origine && window.f_cut) {
        var place = (document.querySelector('.wims_question') || repere.parentNode).clientWidth || 0;
        var parLigne = Math.max(1, Math.floor(place / etroit));
        for (var ic = 0; ic < f_cut.length; ic++) if (f_cut[ic] > parLigne) f_cut[ic] = parLigne;
      }
      if (origine) {
        var ancrer = DynLayer.prototype.setAnchor;
        DynLayer.prototype.setAnchor = function (a) {
          if (a && a.stretchH === origine) {
            var b = {};
            for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) b[k] = a[k];
            if (origineV === null && typeof a.stretchV === 'number') origineV = a.stretchV;
            b.stretchH = etroit;
            if (typeof b.left === 'number') b.left = Math.round(b.left * etroit / origine);
            if (typeof b.top === 'number' && origineV) b.top = Math.round(b.top * haut / origineV);
            a = b;
          }
          return ancrer.call(this, a);
        };
      }
    }
    // Page à dominos : marquée avant « load » (le CSS agrandit dominos, cases et places réservées avant que Dynapi ne
    // calcule ses positions).
    document.documentElement.classList.add('nova-dominos');
    var textes = document.getElementById('nova-textes');
    var consigne = textes && textes.getAttribute('data-texte-consigne-dominos');
    var bloc = repere && repere.parentElement;
    if (exercice && consigne && bloc && !document.querySelector('.nova-consigne-glisser')) {
      var pc = document.createElement('p');
      pc.className = 'nova-consigne-glisser';
      pc.textContent = consigne;
      bloc.parentNode.insertBefore(pc, bloc);
    }
    // Taille commune : essais à 20 px, puis la plus grande qui tient partout, sur la face la plus large ou la plus
    // haute (bornée à 26 px).
    var essais = 0;
    var taille = function () {
      var faces = Array.prototype.slice.call(document.querySelectorAll('.wims_grabbable .fill_content > table.wimsborder :is(th, td), .drag_content > table.wimsborder :is(th, td), table.nova-domino-solution :is(th, td)'));
      var pretes = faces.length && faces.every(function (c) { return !c.querySelector('math') || c.querySelector('mjx-container'); });
      if (!pretes) { if (++essais < 40) setTimeout(taille, 200); return; }
      // Même taille pour tous les dominos affichés ensemble (cette page) ; elle peut changer d'un exercice à l'autre
      // (précision de l'utilisateur, 2026-10-08). Par un zoom commun sur les formules, et non par la taille de police :
      // MathJax recalcule l'échelle de ses formules d'après la police qui les entoure et annulait le changement (vécu :
      // largeurs inchangées de 10 à 26 px). Mesure au naturel (zoom 1), puis le plus grand zoom qui tient partout.
      var mesure = function (c) {
        // Rendu visible de MathJax (le MathML gardé pour les lecteurs d'écran fausserait la mesure), sinon le texte.
        var mj = c.querySelectorAll('mjx-container');
        if (mj.length) {
          var g = Infinity, d = -Infinity, h = Infinity, bas = -Infinity;
          Array.prototype.forEach.call(mj, function (m) { var q = m.getBoundingClientRect(); g = Math.min(g, q.left); d = Math.max(d, q.right); h = Math.min(h, q.top); bas = Math.max(bas, q.bottom); });
          return { width: d - g, height: bas - h };
        }
        var r = document.createRange(); r.selectNodeContents(c); return r.getBoundingClientRect();
      };
      var contenus = faces.map(function (c) { return c.querySelector('.wims_mathml') || c; });
      contenus.forEach(function (e) { e.style.zoom = ''; });
      var z = Infinity;
      faces.forEach(function (c) {
        var b = mesure(c), cs = getComputedStyle(c);
        var largeur = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;   // 2 px d'air de plus de chaque côté
        var hauteur = c.closest('.wims_grabbable, .drag_label, .nova-domino-solution').clientHeight - 12;  // marges et air
        if (b.width > 0) z = Math.min(z, largeur / b.width);
        if (b.height > 0) z = Math.min(z, hauteur / b.height);
      });
      if (!isFinite(z)) return;
      z = Math.max(0.5, Math.min(3, Math.floor(z * 100) / 100));   // la hauteur du domino borne déjà la taille
      contenus.forEach(function (e) { e.style.zoom = String(z); });
      document.documentElement.setAttribute('data-nova-dominos-zoom', String(z));
    };
    // MathJax retouche encore ses formules plusieurs secondes après « load » (fontes, taille relative à la police) :
    // mesures répétées toutes les 500 ms pendant 8 s, puis à chaque fin de rendu MathJax (vécu : 20 px posés d'après
    // une mesure prise trop tôt, texte qui débordait). Mesure et taille finale dans la même tâche : rien ne clignote.
    var relancer = function () { essais = 0; taille(); };
    window.addEventListener('load', function () {
      var n = 0;
      var tic = setInterval(function () { relancer(); if (++n >= 16) clearInterval(tic); }, 500);
      if (window.MathJax && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(function () { setTimeout(relancer, 150); });
    });
    if (!exercice) return;
    // Téléphone en portrait, dominos ou cases sur plusieurs lignes : fenêtre flottante qui propose le mode paysage
    // (demande de l'utilisateur, 2026-10-08). Elle part en paysage ou quand on la ferme (pas de retour de la session).
    var portrait = window.matchMedia ? matchMedia('(orientation: portrait)') : null;
    var surUneLigne = function (sel) {
      var hauts = Array.prototype.map.call(document.querySelectorAll(sel), function (e) { return Math.round(e.getBoundingClientRect().top + window.scrollY); });
      return !hauts.length || Math.max.apply(null, hauts) - Math.min.apply(null, hauts) < 4;
    };
    var fenetre = null;
    var paysage = function () {
      var ferme = false;
      try { ferme = sessionStorage.getItem('nova-paysage-ferme') === '1'; } catch (e) { /* sans stockage */ }
      var montrer = !ferme && portrait && portrait.matches && document.querySelector('.wims_droppable') &&
        !(surUneLigne('.wims_droppable') && surUneLigne('.wims_grabbable'));
      if (!montrer) { if (fenetre) fenetre.hidden = true; return; }
      if (!fenetre) {
        fenetre = document.createElement('div');
        fenetre.className = 'nova-paysage';
        fenetre.setAttribute('role', 'status');
        fenetre.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="16" rx="2"/><path d="M3 15a9 9 0 0 0 15 6"/><path d="M18 17v4h-4"/></svg><span></span><button type="button"></button>';
        fenetre.querySelector('span').textContent = (textes && textes.getAttribute('data-texte-paysage')) || 'Turn your phone sideways.';
        var bouton = fenetre.querySelector('button');
        bouton.textContent = '\u00d7';
        bouton.setAttribute('aria-label', (textes && textes.getAttribute('data-texte-fermer')) || 'Close');
        bouton.addEventListener('click', function () {
          fenetre.hidden = true;
          try { sessionStorage.setItem('nova-paysage-ferme', '1'); } catch (e) { /* cette page seulement */ }
        });
        document.body.appendChild(fenetre);
      }
      fenetre.hidden = false;
    };
    window.addEventListener('load', function () { setTimeout(paysage, 1200); });
    if (portrait && portrait.addEventListener) portrait.addEventListener('change', function () { setTimeout(paysage, 600); });
    caseVisee();
  }

  /* Tuiles à déplacer des autres exercices à cases (étiquettes qui ne sont pas des dominos : clickfill, dragfill ;
   * maquette C « poignée et creux », choisie par l'utilisateur le 2026-12-11, rattachée au réglage « dominos »).
   * html.nova-tuiles avant « load » (le CSS habille tuiles et cases, _css/composants-dominos.css) ; tuiles et cases
   * plus petites que 44 px agrandies (même taille pour toutes, fill_sx x fill_sy de fill.after) ; poignée et « Déposer
   * ici » seulement quand les tuiles sont vraiment larges (160 px et plus, demande de l'utilisateur) ; la tuile « ? »
   * qui vide une case (clickfill : une de plus que les étiquettes) marquée nova-tuile-vider. */
  function tuiles() {
    if (standard('dominos')) return;
    var script = Array.prototype.filter.call(document.scripts, function (sc) { return /f_objs/.test(sc.textContent); })[0];
    if (!script || /wimsborder/.test(script.textContent) || !document.getElementById('fillobj1')) return;
    var m = script.textContent.match(/stretchH:(\d+),stretchV:(\d+)/);
    if (!m) return;
    var sx = +m[1], sy = +m[2], racine = document.documentElement;
    racine.classList.add('nova-tuiles');
    if (sx >= 160) racine.classList.add('nova-tuiles-larges');
    // Avant « load » : petites tuiles agrandies à 44 px, et 8 px entre les cases d'un même groupe (Dynapi les colle :
    // pas de fill_sx, f_cut cases par ligne ; demande de l'utilisateur, 2026-11-11). Places réservées dans la page
    // (images transparentes dans fill<nom>, k cases de large et r de haut, et devant fillobj<n>, plus leurs cales de
    // 1 px de large), puis taille et décalages que Dynapi donne à ses calques.
    var nsx = Math.max(sx, 44), nsy = Math.max(sy, 44), ecart = 8;
    if (window.DynLayer && DynLayer.prototype.setAnchor) {
      Array.prototype.forEach.call(document.querySelectorAll('a[id^="fill"] > img, img:has(+ a[id^="fill"])'), function (im) {
        var w = parseFloat(im.style.width), h = parseFloat(im.style.height);
        var lien = /^fill/.test(im.parentElement.id || '') ? im.parentElement : im.nextElementSibling;
        var groupe = !!lien && !/^fillobj/.test(lien.id || '');
        var k = Math.round(w / sx), r = Math.floor(h / sy);
        if (k >= 1 && Math.abs(w - k * sx) < 1) im.style.width = (k * nsx + (groupe ? (k - 1) * ecart : 0)) + 'px';
        if (r >= 1) im.style.height = (h + r * (nsy - sy) + (groupe ? (r - 1) * ecart : 0)) + 'px';
      });
      var ancrer = DynLayer.prototype.setAnchor;
      DynLayer.prototype.setAnchor = function (a) {
        if (a && a.stretchH === sx && a.stretchV === sy) {
          var b = {}, groupe = !/^fillobj/.test(a.leftA || '');
          for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) b[k] = a[k];
          b.stretchH = nsx; b.stretchV = nsy;
          if (typeof b.left === 'number') {
            var col = groupe ? Math.max(0, Math.floor(b.left / sx)) : 0;
            b.left = Math.round(b.left * nsx / sx) + col * (groupe ? ecart : 0);
          }
          if (typeof b.top === 'number') {
            var lig = groupe ? Math.max(0, Math.floor(b.top / sy)) : 0;
            b.top = Math.round(b.top * nsy / sy) + lig * (groupe ? ecart : 0);
          }
          a = b;
        }
        return ancrer.call(this, a);
      };
      if (nsx !== sx || nsy !== sy) racine.classList.add('nova-tuiles-agrandies');
    }
    var textes = document.getElementById('nova-textes');
    var consigne = textes && textes.getAttribute('data-texte-consigne-tuiles');
    var bloc = document.getElementById('fillobj1').parentElement;
    if (consigne && bloc && !document.querySelector('.nova-consigne-glisser')) {
      var pc = document.createElement('p');
      pc.className = 'nova-consigne-glisser';
      pc.textContent = consigne;
      bloc.parentNode.insertBefore(pc, bloc);
    }
    // Calques créés par Dynapi au chargement : tuile « vider » et texte des grandes cases.
    var deposer = (textes && textes.getAttribute('data-texte-deposer')) || 'Drop here';
    var marquer = function () {
      var lb = window.f_lbis, ob = window.f_objs;
      if (lb && ob && lb.length === ob.length && lb[lb.length - 1]) {
        var v = document.getElementById(lb[lb.length - 1].id);
        if (v) v.classList.add('nova-tuile-vider');
      }
      if (sx >= 160) Array.prototype.forEach.call(document.querySelectorAll('.wims_droppable'), function (z) { z.setAttribute('data-nova-deposer', deposer); });
    };
    window.addEventListener('load', function () { setTimeout(marquer, 0); setTimeout(marquer, 600); });
    caseVisee();
  }

  // Case visée pendant le glissement ou quand une étiquette est choisie (dominos et tuiles).
  function caseVisee() {
    var glisse = null, rafId = 0, derniere = null;
    var marquer = function (z) {
      if (z === derniere) return;
      if (derniere) derniere.classList.remove('nova-survolee');
      if (z) z.classList.add('nova-survolee');
      derniere = z;
    };
    var choisi = function () { return document.querySelector('.wims_grabbable[style*="rgb(96, 96, 255)"]'); };
    document.addEventListener('mousedown', function (e) { var g = e.target.closest && e.target.closest('.wims_grabbable'); glisse = g || null; }, true);
    document.addEventListener('mouseup', function () { glisse = null; setTimeout(function () { marquer(null); }, 0); }, true);
    document.addEventListener('mousemove', function (e) {
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        var zones = document.querySelectorAll('.wims_droppable');
        var vise = null;
        if (glisse) {
          var g = glisse.getBoundingClientRect();
          Array.prototype.some.call(zones, function (z) {
            var r = z.getBoundingClientRect();
            if (Math.abs(g.left - r.left) <= r.width * 2 / 3 && Math.abs(g.top - r.top) <= r.height * 2 / 3) { vise = z; return true; }
            return false;
          });
        } else if (choisi()) {
          Array.prototype.some.call(zones, function (z) {
            var r = z.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { vise = z; return true; }
            return false;
          });
        }
        marquer(vise);
      });
    }, true);
  }
