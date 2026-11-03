/* =====================================================================
   loja.js — monta a vitrine a partir do produtos.json

   COMO USAR EM QUALQUER PÁGINA
   1. Declare uma grade com os filtros que quiser em data-tags:

        <section class="pg-grid" data-tags="destaque"></section>
        <section class="pg-grid" data-tags="pokemon deck"></section>   (precisa ter AS DUAS tags)
        <section class="pg-grid" data-tags="esgotado"></section>
        <section class="pg-grid" data-tags=""></section>               (todos os produtos)

      Opcionais:  data-limite="6"   mostra no máximo 6 produtos
                  data-incluir-esgotados   inclui os esgotados na grade

   2. No final do <body>, uma única linha:

        <script src="/loja.js"></script>

   A modal de compra é criada sozinha — não precisa de HTML nem de
   <script> da modal na página.
   ===================================================================== */
(function () {
  'use strict';

  // ---------- CONFIGURAÇÃO ----------
  var ARQUIVO_PRODUTOS = '/produtos.json';

  // Usado quando um produto não tem link de WhatsApp na planilha.
  // Formato internacional, só números (55 + DDD + número).
  var WHATSAPP_PADRAO = '5561984129637';

  // Parâmetros de rastreio colocados nos links de compra (deixe {} para desligar).
  // Links do WhatsApp (wa.me) ficam de fora: não servem para rastrear e mexer neles
  // pode alterar o texto da mensagem.
  var UTM = { utm_source: 'site_nateil', utm_medium: 'hub_links' };

  // Canais de compra, na ordem em que aparecem na modal.
  // "chave" é o nome dentro de "links" no produtos.json.
  var CANAIS = [
    { chave: 'tiktok',   rotulo: 'Comprar no TikTok Shop', classe: 'modal-buy' },
    { chave: 'olx',      rotulo: 'Comprar na OLX',         classe: 'modal-buy' },
    { chave: 'mypcards', rotulo: 'Comprar no MyPCards',    classe: 'modal-buy' },
    { chave: 'whats',    rotulo: 'Comprar pelo WhatsApp',  classe: 'modal-buy-outline' }
  ];

  // ---------- UTILIDADES ----------
  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  // "assets/x.png" -> "/assets/x.png" (funciona em qualquer subpasta)
  function caminho(src) {
    if (!src) return '';
    if (/^(https?:)?\/\//.test(src) || src.charAt(0) === '/') return src;
    return '/' + src;
  }

  function tagsDe(produto) {
    return (produto.categoria || []).map(function (t) {
      return String(t).trim().toLowerCase();
    });
  }

  function estaEsgotado(produto) {
    return tagsDe(produto).indexOf('esgotado') !== -1;
  }

  function linkWhatsPadrao(produto) {
    return 'https://wa.me/' + WHATSAPP_PADRAO +
      '?text=' + encodeURIComponent('Quero comprar ' + produto.titulo);
  }

  // só aceita links http/https (bloqueia coisas como "javascript:" vindas da planilha)
  function linkSeguro(url) {
    return /^https?:\/\//i.test(String(url || '').trim()) ? String(url).trim() : '';
  }

  function comUtm(url) {
    if (!url) return '';
    try {
      var u = new URL(url);
      if (u.hostname === 'wa.me') return url;
      Object.keys(UTM).forEach(function (k) { u.searchParams.set(k, UTM[k]); });
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  // Links finais do produto (planilha primeiro, WhatsApp padrão como reserva)
  function linksDe(produto) {
    var l = produto.links || {};
    return {
      tiktok: comUtm(linkSeguro(l.tiktok)),
      olx: comUtm(linkSeguro(l.olx)),
      mypcards: comUtm(linkSeguro(l.mypcards)),
      whats: linkSeguro(l.whats) || linkWhatsPadrao(produto)
    };
  }

  // ---------- MODAL ----------
  var modal = null;

  function criarModal() {
    // remove modal antiga que ainda esteja escrita no HTML da página
    var antiga = document.getElementById('productModal');
    if (antiga) antiga.remove();

    var overlay = el('div', 'modal-overlay');
    overlay.id = 'productModal';

    var caixa = el('div', 'modal');
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-labelledby', 'modalTitle');

    var fechar = el('button', 'modal-close', '×');
    fechar.type = 'button';
    fechar.setAttribute('aria-label', 'Fechar');

    var esquerda = el('div', 'modal-left');
    var img = el('img');
    esquerda.appendChild(img);

    var direita = el('div', 'modal-right');
    var titulo = el('h2');
    titulo.id = 'modalTitle';
    var subtitulo = el('p', 'modal-subtitle');
    var precos = el('div', 'modal-price');
    var preco = el('p', 'preco');
    var pix = el('p', 'pix');
    var parcelado = el('p', 'parcelado');
    precos.appendChild(preco);
    precos.appendChild(pix);
    precos.appendChild(parcelado);

    direita.appendChild(titulo);
    direita.appendChild(subtitulo);
    direita.appendChild(precos);

    var botoes = {};
    CANAIS.forEach(function (c) {
      var a = el('a', c.classe, c.rotulo);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.href = '#';
      botoes[c.chave] = a;
      direita.appendChild(a);
    });

    caixa.appendChild(fechar);
    caixa.appendChild(esquerda);
    caixa.appendChild(direita);
    overlay.appendChild(caixa);
    document.body.appendChild(overlay);

    modal = {
      overlay: overlay, caixa: caixa, fechar: fechar, img: img,
      titulo: titulo, subtitulo: subtitulo,
      preco: preco, pix: pix, parcelado: parcelado,
      botoes: botoes, ultimoFoco: null
    };

    fechar.addEventListener('click', fecharModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) fecharModal();
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { fecharModal(); return; }
      if (e.key === 'Tab') prenderFoco(e);
    });
  }

  // mantém o Tab dentro da modal enquanto ela está aberta
  function prenderFoco(e) {
    var itens = Array.prototype.filter.call(
      modal.caixa.querySelectorAll('a[href], button'),
      function (n) { return n.style.display !== 'none'; }
    );
    if (!itens.length) return;
    var primeiro = itens[0], ultimo = itens[itens.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  }

  function abrirModal(produto, origem) {
    var links = linksDe(produto);

    modal.img.src = caminho(produto.imagem);
    modal.img.alt = produto.titulo || '';
    modal.titulo.textContent = produto.titulo || '';
    modal.subtitulo.textContent = produto.subtitulo || '';
    modal.preco.textContent = produto.preco || '';
    modal.pix.textContent = produto.pix ? produto.pix + ' no Pix' : '';
    modal.parcelado.textContent = produto.parcelado || '';

    CANAIS.forEach(function (c) {
      var a = modal.botoes[c.chave];
      if (links[c.chave]) {
        a.href = links[c.chave];
        a.style.display = '';
      } else {
        a.style.display = 'none';
      }
    });

    modal.ultimoFoco = origem || null;
    modal.overlay.classList.add('open');
    document.body.classList.add('modal-aberto');
    modal.fechar.focus();
  }

  function fecharModal() {
    modal.overlay.classList.remove('open');
    document.body.classList.remove('modal-aberto');
    if (modal.ultimoFoco && modal.ultimoFoco.focus) modal.ultimoFoco.focus();
  }

  // ---------- CARDS ----------
  function criarCard(produto) {
    var esgotado = estaEsgotado(produto);
    var card = el('article', 'pg-card' + (esgotado ? ' esgotado' : ''));

    var caixaImg = el('div', 'pg-card-img');
    var img = el('img');
    img.src = caminho(produto.imagem);
    img.alt = produto.titulo || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    // se a foto ainda não foi enviada para assets/, mostra um aviso em vez de ícone quebrado
    img.addEventListener('error', function () {
      caixaImg.classList.add('sem-foto');
      img.remove();
      caixaImg.appendChild(el('span', 'pg-card-sem-foto', 'Foto em breve'));
    });
    caixaImg.appendChild(img);

    var corpo = el('div', 'pg-card-body');
    var texto = el('div', 'pg-card-text');
    texto.appendChild(el('h3', null, produto.titulo));
    if (produto.subtitulo) texto.appendChild(el('p', null, produto.subtitulo));
    if (produto.preco && !esgotado) texto.appendChild(el('p', 'pg-card-price', produto.preco));
    corpo.appendChild(texto);

    if (esgotado) {
      corpo.appendChild(el('span', 'pg-soldout', 'Esgotado'));
    } else {
      var botao = el('button', 'pg-buy');
      botao.type = 'button';
      botao.appendChild(el('span', null, 'Comprar'));
      var seta = el('img');
      seta.src = '/assets/seta.svg';
      seta.alt = '';
      botao.appendChild(seta);
      corpo.appendChild(botao);

      // o card inteiro abre a modal (o botão está dentro dele)
      card.addEventListener('click', function () { abrirModal(produto, botao); });
    }

    card.appendChild(caixaImg);
    card.appendChild(corpo);
    return card;
  }

  // ---------- SEÇÕES ----------
  function filtrar(produtos, grade) {
    var pedidas = (grade.getAttribute('data-tags') || '')
      .toLowerCase().split(/[\s,]+/).filter(Boolean);
    var querEsgotados = pedidas.indexOf('esgotado') !== -1 ||
      grade.hasAttribute('data-incluir-esgotados');

    var lista = produtos.filter(function (p) {
      var tags = tagsDe(p);
      if (!querEsgotados && tags.indexOf('esgotado') !== -1) return false;
      return pedidas.every(function (t) { return tags.indexOf(t) !== -1; });
    });

    var limite = parseInt(grade.getAttribute('data-limite'), 10);
    return limite > 0 ? lista.slice(0, limite) : lista;
  }

  function montarSecoes(produtos) {
    var grades = document.querySelectorAll('[data-tags]');
    Array.prototype.forEach.call(grades, function (grade) {
      var itens = filtrar(produtos, grade);
      grade.textContent = '';

      // seção vazia some inteira (título incluído)
      var secao = grade.closest('.hs-section');
      if (secao) secao.style.display = itens.length ? '' : 'none';

      itens.forEach(function (p) { grade.appendChild(criarCard(p)); });
    });
  }

  function mostrarErro() {
    var grades = document.querySelectorAll('[data-tags]');
    Array.prototype.forEach.call(grades, function (grade) {
      grade.textContent = '';
      grade.appendChild(el('p', 'pg-card-sem-foto',
        'Não foi possível carregar os produtos agora. Tente recarregar a página.'));
    });
  }

  // ---------- INÍCIO ----------
  function iniciar() {
    criarModal();
    fetch(ARQUIVO_PRODUTOS)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(montarSecoes)
      .catch(function (erro) {
        console.error('Erro ao carregar o catálogo:', erro);
        mostrarErro();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
