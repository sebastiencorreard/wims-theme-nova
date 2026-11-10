/* Nova : flyers a imprimer du lien des eleves (page Liens de connexion, nova.js liensConnexion ; 2026-11-10, utilisateur).
 * PDF ecrit a la main, sans bibliotheque : une page A4 de flyers a decouper (traits de coupe en pointilles), chacun avec
 * le QR code du lien (vectoriel, dessine une fois en XObject) et trois lignes de texte en Helvetica (police de base des
 * lecteurs PDF, codage WinAnsi : un caractere hors windows-1252 devient "?"). Largeurs des caracteres : metriques de
 * Nimbus Sans (= Helvetica), octets 32 a 255. Le QR code vient de js/qrcode.js (qrcode-generator, MIT).
 * Fichier en ASCII : WIMS sert ses fichiers en windows-1252. */
(function () {
  'use strict';
  var LARG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,278,556,278,222,556,333,1000,556,556,333,1000,667,333,1000,278,611,278,278,222,222,333,333,350,556,1000,333,1000,500,333,944,278,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,278,278,333,556,537,278,333,278,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
  var LARG_GRAS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,278,556,278,278,556,500,1000,556,556,333,1000,667,333,1000,278,611,278,278,278,278,500,500,350,556,1000,333,1000,556,333,944,278,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,278,278,333,611,556,278,333,278,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
  // Unicode -> octet windows-1252 pour la plage 0x80-0x9F (le reste de latin-1 est identique).
  var CP = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138,
    8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152,
    8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159, 8239: 160, 8201: 32, 8202: 32 };
  function octets(s) {
    var r = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 32 && c < 127) r.push(c);
      else if (c >= 160 && c < 256) r.push(c);
      else if (CP[c]) r.push(CP[c]);
      else if (c === 9 || c === 10) r.push(32);
      else r.push(63);
    }
    return r;
  }
  function largeur(o, taille, gras) {
    var t = gras ? LARG_GRAS : LARG, l = 0;
    for (var i = 0; i < o.length; i++) l += t[o[i] - 32] || 556;
    return l * taille / 1000;
  }
  function chaine(o) {
    var s = '(';
    for (var i = 0; i < o.length; i++) {
      var c = o[i];
      if (c === 40 || c === 41 || c === 92) s += '\\';
      s += String.fromCharCode(c);
    }
    return s + ')';
  }
  // Coupe un texte en lignes de largeur <= max (un mot trop long est coupe a la lettre).
  function couper(texte, taille, gras, max) {
    var mots = String(texte).trim().split(/\s+/), lignes = [], cour = '';
    mots.forEach(function (m) {
      var essai = cour ? cour + ' ' + m : m;
      if (largeur(octets(essai), taille, gras) <= max) { cour = essai; return; }
      if (cour) lignes.push(cour);
      cour = m;
      while (largeur(octets(cour), taille, gras) > max && cour.length > 1) {
        var k = cour.length - 1;
        while (k > 1 && largeur(octets(cour.slice(0, k)), taille, gras) > max) k--;
        lignes.push(cour.slice(0, k));
        cour = cour.slice(k);
      }
    });
    if (cour) lignes.push(cour);
    return lignes;
  }
  var MM = 72 / 25.4;
  function n(x) { return (Math.round(x * 100) / 100).toString(); }
  // Formats : grand = 2 x 4 flyers (95 x 69 mm), petit = 3 x 7 (63 x 40 mm). Marge de page 10 mm.
  var FORMATS = {
    grand: { col: 2, lig: 4, qr: 42, marge: 5, ecart: 4, t1: 9, nom: 17, nomMin: 10, t3: 9 },
    petit: { col: 3, lig: 7, qr: 29, marge: 3, ecart: 2.5, t1: 7, nom: 12, nomMin: 7, t3: 7 },
    // 5 x 6 (38 x 46 mm), QR code au-dessus, une seule ligne centree dessous (WIMS - <classe> ; 2026-11-10, utilisateur).
    mini: { col: 5, lig: 6, qr: 30, marge: 2.5, ecart: 2, t1: 7, nom: 11, nomMin: 6, t3: 7, vertical: true }
  };
  // o : { qrcode (fonction de js/qrcode.js), lien, nom, ligne1, ligne3, format: 'grand'|'petit' } -> Uint8Array (PDF).
  window.novaFlyersPdf = function (o) {
    var f = FORMATS[o.format] || FORMATS.grand;
    var q = o.qrcode(0, 'M');
    q.addData(o.lien);
    q.make();
    var nm = q.getModuleCount(), bord = 2, cote = nm + 2 * bord;
    var dessin = [];
    for (var r = 0; r < nm; r++) for (var c = 0; c < nm; c++) if (q.isDark(r, c)) dessin.push((c + bord) + ' ' + (cote - bord - r - 1) + ' 1 1 re');
    var formeQr = '0 g\n' + dessin.join('\n') + '\nf\n';
    var PW = 595.28, PH = 841.89, M = 10 * MM;
    var cw = (PW - 2 * M) / f.col, ch = (PH - 2 * M) / f.lig;
    var qs = f.qr * MM, pad = f.marge * MM, gap = f.ecart * MM;
    var tx = f.vertical ? pad : pad + qs + gap, tw = cw - tx - pad;
    // Bloc de texte commun a tous les flyers (positions relatives a la cellule).
    var nomTaille = f.nom, nomLignes = couper(o.nom, nomTaille, true, tw);
    while (nomLignes.length > (f.vertical ? 1 : 2) && nomTaille > f.nomMin) { nomTaille -= 0.5; nomLignes = couper(o.nom, nomTaille, true, tw); }
    var l1 = couper(o.ligne1 || '', f.t1, false, tw), l3 = couper(o.ligne3 || '', f.t3, false, tw);
    var blocs = [];
    l1.forEach(function (t) { blocs.push({ t: t, s: f.t1, g: false, gris: true }); });
    var debutNom = blocs.length;
    nomLignes.forEach(function (t) { blocs.push({ t: t, s: nomTaille, g: true }); });
    l3.forEach(function (t) { blocs.push({ t: t, s: f.t3, g: false }); });
    var hauteur = 0;
    blocs.forEach(function (b, i) { b.h = b.s * 1.22 + ((i === debutNom || i === debutNom + nomLignes.length) && i > 0 ? b.s * 0.35 : 0); hauteur += b.h; });
    var cs = [];
    // Traits de coupe : grille en pointilles gris clair.
    cs.push('q 0.6 G 0.5 w [3 3] 0 d');
    for (var i = 0; i <= f.col; i++) cs.push(n(M + i * cw) + ' ' + n(M) + ' m ' + n(M + i * cw) + ' ' + n(PH - M) + ' l S');
    for (var j = 0; j <= f.lig; j++) cs.push(n(M) + ' ' + n(M + j * ch) + ' m ' + n(PW - M) + ' ' + n(M + j * ch) + ' l S');
    cs.push('Q');
    for (var li = 0; li < f.lig; li++) for (var co = 0; co < f.col; co++) {
      var x = M + co * cw, y = PH - M - (li + 1) * ch;
      var e = qs / cote;
      var total = f.vertical ? qs + gap + hauteur : 0;
      var qy = f.vertical ? y + (ch + total) / 2 - qs : y + (ch - qs) / 2;
      cs.push('q ' + n(e) + ' 0 0 ' + n(e) + ' ' + n(f.vertical ? x + (cw - qs) / 2 : x + pad) + ' ' + n(qy) + ' cm /Qr Do Q');
      var yy = f.vertical ? qy - gap : y + ch / 2 + hauteur / 2;
      blocs.forEach(function (b) {
        yy -= b.h;
        var bx = f.vertical ? x + (cw - largeur(octets(b.t), b.s, b.g)) / 2 : x + tx;
        cs.push('BT /' + (b.g ? 'F2' : 'F1') + ' ' + n(b.s) + ' Tf ' + (b.gris ? '0.3' : '0') + ' g ' + n(bx) + ' ' + n(yy + b.s * 0.22) + ' Td ' + chaine(octets(b.t)) + ' Tj ET');
      });
    }
    var contenu = cs.join('\n') + '\n';
    var titre = chaine(octets(o.titre || o.nom));
    var objets = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Qr 7 0 R >> >> >>',
      '<< /Length ' + contenu.length + ' >>\nstream\n' + contenu + 'endstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /XObject /Subtype /Form /BBox [0 0 ' + cote + ' ' + cote + '] /Length ' + formeQr.length + ' >>\nstream\n' + formeQr + 'endstream',
      '<< /Title ' + titre + ' /Producer (Nova, theme WIMS) >>'
    ];
    var pdf = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n', pos = [];
    objets.forEach(function (ob, k) { pos.push(pdf.length); pdf += (k + 1) + ' 0 obj\n' + ob + '\nendobj\n'; });
    var xref = pdf.length;
    pdf += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n';
    pos.forEach(function (p) { pdf += ('0000000000' + p).slice(-10) + ' 00000 n \n'; });
    pdf += 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root 1 0 R /Info 8 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    var u = new Uint8Array(pdf.length);
    for (var b = 0; b < pdf.length; b++) u[b] = pdf.charCodeAt(b) & 255;
    return u;
  };
})();
