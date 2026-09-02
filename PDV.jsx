import React from 'react';
import ReactDOM from 'react-dom';
import { formatarMoeda, calcularTotal, listarCategoriasProdutos, normalizarCategoria } from './formatadores.js';

export function PDV({
  comandaAtual,
  comandas,
  comandaAtivaId,
  setComandaAtivaId,
  produtos,
  categoriasCustomizadas,
  categoriasDivisiveis,
  categoriaAtiva,
  setCategoriaAtiva,
  relatorioProdutos,
  vendas,
  busca,
  setBusca,
  mostrarSugestoes,
  setMostrarSugestoes,
  clientesCadastrados,
  abrirComandaPorNomePronto,
  valDinheiro, setValDinheiro,
  valPix, setValPix,
  valCartao, setValCartao,
  valCrediario, setValCrediario,
  desconto,
  abrirDescontoComanda,
  modoPagamento, setModoPagamento,
  mostrarMultiFormas, setMostrarMultiFormas,
  comandaRecemPaga, setComandaRecemPaga,
  confirmarPagamentoComposto,
  finalizarPagamentoDireto,
  emitirNotaFiscalSilenciosa,
  imagemAutomaticaProduto,
  addItemNaComanda,
  editarObservacaoItem,
  iniciarDivisaoItem,
  tratarRemoverSplit,
  removerItemNaComanda,
  diminuirQtdItemNaComanda,
  iniciarPagamentoParcial,
  imprimirComandaConferencia,
  cancelarComanda,
  buscaContainerRef,
  nomeSoftware
}) {
  const mesmoComandaId = (a, b) => String(a ?? '') === String(b ?? '');
  const normalizarNomeProduto = (nome) => String(nome || '')
    .replace(/\s*\(Dividido entre:.*\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const [tecladoComandaAberto, setTecladoComandaAberto] = React.useState(false);

  const parseMoedaBR = (valor) => {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    const texto = String(valor || '').trim();
    if (!texto) return 0;

    const somenteNumeros = texto.replace(/[^\d]/g, '');
    if (!somenteNumeros) return 0;

    return Number(somenteNumeros) / 100;
  };

  const formatarMoedaInput = (valor) => {
    const numero = typeof valor === 'number' ? valor : parseMoedaBR(valor);
    if (!numero) return '';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleChangeMoedaInput = (setter) => (e) => {
    setter(formatarMoedaInput(e.target.value));
  };

  const adicionarTeclaComanda = (tecla) => {
    setBusca((valorAtual) => `${valorAtual}${tecla}`.replace(/\s+/g, ' ').slice(0, 40));
    setMostrarSugestoes(true);
  };

  const apagarTeclaComanda = () => {
    setBusca((valorAtual) => valorAtual.slice(0, -1));
    setMostrarSugestoes(true);
  };

  const fecharTecladoComanda = () => {
    setTecladoComandaAberto(false);
    setMostrarSugestoes(false);
  };

  const confirmarComandaPeloTeclado = () => {
    if (ehNomeInedito) {
      abrirComandaPorNomePronto(busca);
      setComandaRecemPaga(null);
      fecharTecladoComanda();
    }
  };

  let subtotal = comandaAtual ? calcularTotal(comandaAtual.itens) : 0;
  const descontoAplicado = Math.min(Number(desconto) || 0, subtotal);
  const totalComDesconto = Math.max(0, subtotal - descontoAplicado);
  const listaCategorias = listarCategoriasProdutos(categoriasCustomizadas, produtos);

  let produtosFiltrados =
    categoriaAtiva === 'Todos'
      ? produtos
      : produtos.filter((p) => normalizarCategoria(p.category) === normalizarCategoria(categoriaAtiva));

  const vendasPorProduto = {};

  (vendas || []).forEach((venda) => {
    const itens = Array.isArray(venda?.itensConsumidos) ? venda.itensConsumidos : [];
    itens.forEach((item) => {
      const chave = normalizarNomeProduto(item?.nome);
      if (!chave) return;
      const qtd = Number(item?.qtd || 0);
      vendasPorProduto[chave] = (vendasPorProduto[chave] || 0) + (Number.isFinite(qtd) ? qtd : 0);
    });
  });

  (relatorioProdutos || []).forEach((rp) => {
    const chave = normalizarNomeProduto(rp?.nome);
    if (!chave) return;
    const qtd = Number(rp?.qtd || 0);
    vendasPorProduto[chave] = (vendasPorProduto[chave] || 0) + (Number.isFinite(qtd) ? qtd : 0);
  });

  if (categoriaAtiva === 'Todos') {
    produtosFiltrados = [...produtosFiltrados].sort((a, b) => {
      const totalB = vendasPorProduto[normalizarNomeProduto(b.nome)] || 0;
      const totalA = vendasPorProduto[normalizarNomeProduto(a.nome)] || 0;
      if (totalB !== totalA) return totalB - totalA;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }

  const sugestoesClientes =
    busca.trim() === ''
      ? clientesCadastrados
      : clientesCadastrados.filter((c) =>
          c.nome.toLowerCase().includes(busca.toLowerCase())
        );

  const sugestoesClientesOrdenadas = [...sugestoesClientes].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );

  const ehNomeInedito =
    busca.trim().split(' ').length >= 2 &&
    busca.trim().split(' ')[1].length >= 2 &&
    !clientesCadastrados.some(
      (c) => c.nome.toLowerCase() === busca.trim().toLowerCase()
    );

  /* CALCULO DO SALDO MULTI-PAGAMENTO */
  const totalPagoAtualmente =
    parseMoedaBR(valDinheiro) +
    parseMoedaBR(valPix) +
    parseMoedaBR(valCartao) +
    parseMoedaBR(valCrediario);
  const saldoRestantePagamento = totalComDesconto - totalPagoAtualmente;

  return (
    <div className="main-container" style={{ display: 'flex', height: 'calc(100vh - 60px)', gap: '8px', padding: '8px', background: '#eaf2ff' }}>
      
      {/* COLUNA 1: COMANDAS (Largura reduzida para 150px) */}
      <div className="col" style={{ flex: '0 0 150px', maxWidth: '150px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Mesas e Comandas</h2>

        <div className="busca-container" ref={buscaContainerRef} style={{ marginBottom: '8px', position: 'relative' }}>
        <input
          type="text"
          inputMode="search"
          autoCapitalize="words"
          autoComplete="off"
          spellCheck="false"
          className="search-box"
          readOnly
          placeholder="🔍 Nome ou apelido..."
          value={busca}
          onFocus={() => {
            setTecladoComandaAberto(true);
            setMostrarSugestoes(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') fecharTecladoComanda();
          }}
          style={{ padding: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
        />
        {tecladoComandaAberto && (
          <div
            role="group"
            aria-label="Teclado para criar comanda"
            style={{
              position: 'fixed',
              top: '50%',
              right: '16px',
              left: 'auto',
              transform: 'translateY(-50%)',
              width: 'min(720px, calc(100vw - 220px))',
              padding: '16px',
              boxSizing: 'border-box',
              background: '#dbeafe',
              border: '2px solid #60a5fa',
              borderRadius: '16px',
              boxShadow: '0 18px 45px rgba(15, 42, 95, 0.35)',
              zIndex: 10001
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ color: '#0f2a5f', fontSize: '18px' }}>Criar comanda</strong>
              <button type="button" onClick={fecharTecladoComanda} style={{ minWidth: '54px', minHeight: '44px', border: '1px solid #f87171', borderRadius: '8px', background: '#fff1f2', color: '#be123c', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Fechar</button>
            </div>
            {['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((linha) => (
              <div key={linha} style={{ display: 'grid', gridTemplateColumns: `repeat(${linha.length}, minmax(0, 1fr))`, gap: '6px', marginBottom: '6px' }}>
                {[...linha].map((tecla) => (
                  <button
                    key={tecla}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adicionarTeclaComanda(tecla)}
                    style={{ minWidth: 0, minHeight: '80px', padding: 0, border: '2px solid #93c5fd', borderRadius: '10px', background: '#ffffff', color: '#0f2a5f', fontSize: '28px', fontWeight: '700', cursor: 'pointer', touchAction: 'manipulation' }}
                  >
                    {tecla}
                  </button>
                ))}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr', gap: '6px' }}>
              <button type="button" onClick={() => adicionarTeclaComanda(' ')} style={{ minHeight: '68px', padding: 0, border: '2px solid #93c5fd', borderRadius: '10px', background: '#ffffff', color: '#0f2a5f', fontSize: '20px', fontWeight: '700', cursor: 'pointer' }}>Espaço</button>
              <button type="button" onClick={apagarTeclaComanda} style={{ minHeight: '68px', padding: 0, border: '2px solid #fca5a5', borderRadius: '10px', background: '#fff1f2', color: '#be123c', fontSize: '28px', fontWeight: '700', cursor: 'pointer' }}>⌫</button>
              <button type="button" onClick={() => { setBusca(''); setMostrarSugestoes(true); }} style={{ minHeight: '68px', padding: 0, border: '2px solid #cbd5e1', borderRadius: '10px', background: '#f8fafc', color: '#334155', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Limpar</button>
              <button type="button" onClick={confirmarComandaPeloTeclado} disabled={!ehNomeInedito} style={{ minHeight: '68px', padding: 0, border: '2px solid #60a5fa', borderRadius: '10px', background: ehNomeInedito ? '#007aff' : '#bfdbfe', color: '#ffffff', fontSize: '20px', fontWeight: '700', cursor: ehNomeInedito ? 'pointer' : 'not-allowed' }}>Enter</button>
            </div>
          </div>
        )}
        {mostrarSugestoes && (
          <div
            className="sugestoes-box"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: '#ffffff',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              width: '100%',
              zIndex: 9999,
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
              padding: '10px',
              maxHeight: '500px',
              overflowY: 'auto',
            }}
          >
              <div
                style={{
                  fontSize: '11px',
                  color: '#ea580c',
                  fontWeight: 'bold',
                  padding: '4px 6px 6px 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {busca.trim() === ''
                  ? '⭐ Top Frequentes:'
                  : '🔍 Resultados:'}
              </div>

              {busca.trim() === '' &&
                [...comandas]
                  .sort((a, b) => {
                    const totalA = comandas.filter(
                      (com) => com.nome.toLowerCase() === a.nome.toLowerCase()
                    ).length;
                    const totalB = comandas.filter(
                      (com) => com.nome.toLowerCase() === b.nome.toLowerCase()
                    ).length;
                    return totalB - totalA;
                  })
                  .slice(0, 30)
                  .map((c, i) => (
                    <div
                      key={i}
                      className="sugestao-item"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        marginBottom: '6px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 'normal',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                      }}
                      onClick={() => {
                        setComandaAtivaId(c.id);
                        setModoPagamento(false);
                        setComandaRecemPaga(null);
                        fecharTecladoComanda();
                      }}
                    >
                      <span>
                        👤 <span style={{ fontWeight: '600', color: '#0f172a' }}>{c.nome}</span> <span style={{ color: '#94a3b8', fontSize: '11px' }}>(#{c.id})</span>
                      </span>
                      <span
                        className="sugestao-ativa"
                        style={{
                          fontSize: '10px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '600',
                        }}
                      >
                        Aberta
                      </span>
                    </div>
                  ))}

              {sugestoesClientesOrdenadas.map((c, i) => (
                <div
                  key={i}
                  className="sugestao-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginBottom: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 'normal',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  }}
                  onClick={() => {
                    abrirComandaPorNomePronto(c.nome);
                    setComandaRecemPaga(null);
                    fecharTecladoComanda();
                  }}
                >
                  <span>👤 <span style={{ fontWeight: '600', color: '#0f172a' }}>{c.nome}</span></span>
                  <span
                    className="sugestao-tag"
                    style={{
                      fontSize: '10px',
                      background: '#f1f5f9',
                      color: '#3b82f6',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: '600',
                    }}
                  >
                    Cadastrado
                  </span>
                </div>
              ))}

              {ehNomeInedito && busca.trim() !== '' && (
                <div
                  className="sugestao-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginBottom: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 'normal',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  }}
                  onClick={() => {
                    abrirComandaPorNomePronto(busca);
                    setComandaRecemPaga(null);
                    fecharTecladoComanda();
                  }}
                >
                  <span>
                    ➕ Criar: <strong style={{ color: '#0f172a' }}>{busca}</strong>
                  </span>
                  <span
                    className="sugestao-nova"
                    style={{
                      fontSize: '10px',
                      background: '#dcfce7',
                      color: '#16a34a',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: '600',
                    }}
                  >
                    + Nova
                  </span>
                </div>
              )}
            </div>
        )}
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {comandas.map((c) => {
            const totalComanda = calcularTotal(c.itens);
            const isAtiva = mesmoComandaId(comandaAtivaId, c.id);
            return (
              <div
                key={c.id}
                className={`comanda-card ${isAtiva ? 'active' : ''}`}
                onClick={() => {
                  setComandaAtivaId(c.id);
                  setModoPagamento(false);
                  setMostrarMultiFormas(false);
                  setComandaRecemPaga(null);
                }}
                style={{ 
                  padding: '10px 12px', 
                  marginBottom: '8px',
                  background: isAtiva ? '#f97316' : '#ffffff',
                  border: isAtiva ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isAtiva ? '#ffffff' : '#334155',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div className="comanda-header" style={{ fontSize: '13px', fontWeight: isAtiva ? 'bold' : '600', marginBottom: '6px' }}>
                  <div>{c.nome}</div>
                  <div style={{ color: isAtiva ? '#ffedd5' : '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                    #{String(c.id).slice(-4)}
                  </div>
                </div>
                <div className="comanda-footer" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: isAtiva ? '#ea580c' : '#fee2e2',
                    color: isAtiva ? 'white' : '#dc2626',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '9px'
                  }}>Ativa</span>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: isAtiva ? '#ffffff' : '#10b981' }}>
                    {formatarMoeda(totalComanda)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUNA 2: CONSUMO */}
      <div className="col" style={{ flex: '0 0 280px', maxWidth: '280px', display: 'flex', flexDirection: 'column' }}>
        <div
          className="consumo-box"
          style={{
            display: 'flex', flexDirection: 'column', height: '100%', padding: '6px',
            justifyContent:
              !comandaAtual && comandaRecemPaga ? 'center' : 'flex-start',
          }}
        >
          {comandaAtual ? (
            <>
              <div className="consumo-header" style={{ marginBottom: '6px' }}>
                <h3 style={{ fontSize: '13px', margin: 0 }}>Consumo: {comandaAtual.nome}</h3>
                <small style={{ fontSize: '10px' }}>ID: #{comandaAtual.id}</small>
              </div>

              <div 
                className="consumo-items" 
                style={{ 
                  flexGrow: 1, 
                  overflowY: 'auto', 
                  maxHeight: 'none',
                  marginBottom: '6px'
                }}
              >
                {comandaAtual.itens.length === 0 ? (
                  <p
                    style={{
                      color: '#888',
                      textAlign: 'center',
                      fontSize: '11px',
                      marginTop: '10px',
                    }}
                  >
                    Nenhum item lançado.
                  </p>
                ) : (
                  comandaAtual.itens.map((item, index) => {
                    const prodOriginal = produtos.find(
                      (p) => p.id === item.idProd
                    );
                    const podeDividir =
                      prodOriginal &&
                      (normalizarCategoria(prodOriginal.category) === 'porções' ||
                        categoriasDivisiveis.some((cat) => normalizarCategoria(cat) === normalizarCategoria(prodOriginal.category)));

                        return (
                          <div key={index} className="item-linha" style={{ fontSize: '12px', padding: '6px 0', flexDirection: 'column', alignItems: 'stretch' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="item-qtd-nome">
                                <span className="item-qtd" style={{ fontWeight: 'bold' }}>{item.qtd}x</span>
                                <span>{item.nome}</span>
                              </div>
                              <span style={{ fontWeight: 'bold' }}>
                                {formatarMoeda(item.preco * item.qtd)}
                              </span>
                            </div>
                            {item.obs && (
                              <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#dc2626', marginTop: '2px' }}>
                                Obs: {item.obs}
                              </div>
                            )}
                            <div
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', marginTop: '4px' }}
                            >
                              {!item.splitGroupId && (
                                <button
                                  className="btn-remove-item"
                                  style={{
                                    color: item.obs ? '#eab308' : '#94a3b8',
                                    marginRight: '2px',
                                    padding: '3px 7px'
                                  }}
                                  onClick={() => editarObservacaoItem(item, index)}
                                  title="Adicionar observação (ex: sem salada)"
                                >
                                  <i className="fas fa-pencil" style={{ fontSize: '13px' }}></i>
                                </button>
                              )}

                              {!item.splitGroupId && item.qtd > 1 && (
                                <button
                                  className="btn-remove-item"
                                  style={{
                                    color: 'var(--blue)',
                                    marginRight: '2px',
                                    padding: '3px 7px',
                                    fontWeight: 'bold'
                                  }}
                                  onClick={() => diminuirQtdItemNaComanda(item)}
                                  title="Remover 1 unidade"
                                >
                                  <i className="fas fa-minus" style={{ fontSize: '13px' }}></i>
                                </button>
                              )}

                              {podeDividir && !item.splitGroupId && (
                                <button
                                  className="btn-remove-item"
                                  style={{
                                    color: 'var(--blue)',
                                    marginRight: '2px',
                                    padding: '3px 6px'
                                  }}
                                  onClick={() => iniciarDivisaoItem(item)}
                                  title="Dividir Porção"
                                >
                                  <i className="fas fa-divide" style={{ fontSize: '13px' }}></i>
                                </button>
                              )}
  
                              <button
                                className="btn-remove-item"
                                style={{ padding: '3px 6px' }}
                                onClick={() => {
                                  if (item.splitGroupId) {
                                    tratarRemoverSplit(item, comandaAtual);
                                  } else {
                                    removerItemNaComanda(item.idProd);
                                  }
                                }}
                              >
                                <i className="fas fa-trash" style={{ fontSize: '13px' }}></i>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
  
                  <div className="consumo-resumo" style={{ marginTop: 'auto', paddingTop: '4px' }}>
                    <div className="linha-total" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                      <span>Total:</span>
                      <span>{formatarMoeda(subtotal)}</span>
                    </div>
                    {descontoAplicado > 0 && (
                      <div className="linha-total" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#dc2626' }}>
                        <span>Desconto:</span>
                        <span>-{formatarMoeda(descontoAplicado)}</span>
                      </div>
                    )}
                    {descontoAplicado > 0 && (
                      <div className="linha-total" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: '#16a34a' }}>
                        <span>A pagar:</span>
                        <span>{formatarMoeda(totalComDesconto)}</span>
                      </div>
                    )}
                {comandaAtual.itens.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '6px', width: '80%', margin: '0 auto 6px' }}>
                    {comandaAtual.itens.length > 0 && (
                      <button
                        className="btn-imprimir"
                        style={{
                          aspectRatio: '1 / 1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        onClick={imprimirComandaConferencia}
                      >
                        <i className="fas fa-print" style={{ fontSize: '16px', marginBottom: '4px' }}></i>
                        Conferência
                      </button>
                    )}

                    {!modoPagamento && comandaAtual.itens.length > 0 && (
                      <>
                        <button
                          className="btn-finalizar"
                          style={{
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                          }}
                          onClick={() => {
                            setModoPagamento(true);
                            setBusca('');
                          }}
                        >
                          <i className="fas fa-cash-register" style={{ fontSize: '16px', marginBottom: '4px' }}></i>
                          Fechar Comanda
                        </button>
                        <button
                          className="btn-finalizar"
                          style={{
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#0f766e',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                          }}
                          onClick={iniciarPagamentoParcial}
                        >
                          <i className="fas fa-hand-holding-usd" style={{ fontSize: '16px', marginBottom: '4px' }}></i>
                          Pagamento Parcial
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!modoPagamento ? (
                  comandaAtual.itens.length === 0 && (
                    <button
                      className="btn-finalizar"
                      style={{
                        background: '#e74c3c',
                        width: '100%',
                        margin: '0 auto',
                        padding: '10px',
                        fontSize: '13px',
                        borderRadius: '6px'
                      }}
                      onClick={() => cancelarComanda(comandaAtual)}
                    >
                      <i className="fas fa-trash-alt"></i> Excluir Comanda
                    </button>
                  )
                ) : (
                  <div
                    className="botoes-pagamento"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                    }}
                  >
                   {!mostrarMultiFormas ? (
                      <>
                        <button
                          className="btn-pag btn-cartao"
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('cartão')}
                        >
                          💳 Cartão
                        </button>
                        <button
                          className="btn-pag btn-pix"
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('pix')}
                        >
                          ⚡ Pix
                        </button>
                        <button
                          className="btn-pag btn-dinheiro"
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('dinheiro')}
                        >
                          💵 Dinheiro
                        </button>
                        <button
                          className="btn-pag btn-creadiario"
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('fiado')}
                        >
                          📙 Fiado
                        </button>
                        <button
                          className="btn-pag btn-mais-pgto"
                          onClick={() => setMostrarMultiFormas(true)}
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', background: '#64748b', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                        >
                          ➕ Multi-Formas
                        </button>
                        <button
                          className="btn-pag btn-desconto"
                          onClick={abrirDescontoComanda}
                          style={{ aspectRatio: '1 / 1', flexDirection: 'column', background: '#eab308', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                        >
                          🏷️ Desconto
                        </button>
                        <button
                          className="btn-cancelar-pag"
                          onClick={() => setModoPagamento(false)}
                          style={{
                            gridColumn: '1 / -1',
                            padding: '12px 10px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '4px',
                            fontWeight: 'bold'
                          }}
                        >
                          <i className="fas fa-arrow-left"></i> Voltar
                        </button>
                      </>
                    ) : (
                      ReactDOM.createPortal(
                      <React.Fragment>
                        <div
                          onClick={() => setMostrarMultiFormas(false)}
                          style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.45)',
                            zIndex: 10001,
                          }}
                        />
                        <div
                          role="dialog"
                          aria-label="Multi-formas de pagamento"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 'min(360px, calc(100vw - 32px))',
                            maxHeight: 'calc(100vh - 32px)',
                            overflowY: 'auto',
                            background: '#ffffff',
                            border: '2px solid #60a5fa',
                            borderRadius: '14px',
                            boxShadow: '0 18px 45px rgba(15, 42, 95, 0.35)',
                            padding: '16px',
                            zIndex: 10002,
                          }}
                        >
                        <div className="grid-multi-pagamento">
                          <div className="linha-multi-pagamento" style={{fontSize: '12px', fontWeight: 'bold'}}>
                            <label>💵 R$:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={valDinheiro}
                              onChange={handleChangeMoedaInput(setValDinheiro)}
                              style={{padding: '8px', borderRadius: '6px'}}
                            />
                          </div>
                          <div className="linha-multi-pagamento" style={{fontSize: '12px', fontWeight: 'bold'}}>
                            <label>⚡ Pix:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={valPix}
                              onChange={handleChangeMoedaInput(setValPix)}
                              style={{padding: '8px', borderRadius: '6px'}}
                            />
                          </div>
                          <div className="linha-multi-pagamento" style={{fontSize: '12px', fontWeight: 'bold'}}>
                            <label>💳 Cart:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={valCartao}
                              onChange={handleChangeMoedaInput(setValCartao)}
                              style={{padding: '8px', borderRadius: '6px'}}
                            />
                          </div>
                          <div className="linha-multi-pagamento" style={{fontSize: '12px', fontWeight: 'bold'}}>
                            <label>📙 Fiad:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={valCrediario}
                              onChange={handleChangeMoedaInput(setValCrediario)}
                              style={{padding: '8px', borderRadius: '6px'}}
                            />
                          </div>
                          <div
                            className="info-composto-valores"
                            style={{
                              fontSize: '11px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              borderTop: '1px solid #ddd',
                              paddingTop: '8px',
                              marginTop: '6px',
                              color: '#555',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Total a Pagar:</span>
                              <strong style={{fontSize: '13px'}}>{formatarMoeda(totalComDesconto)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Total Pago:</span>
                              <strong style={{fontSize: '13px'}}>{formatarMoeda(totalPagoAtualmente)}</strong>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                color: saldoRestantePagamento < 0 ? 'red' : saldoRestantePagamento === 0 ? 'green' : '#555',
                              }}
                            >
                              <span>Falta Receber:</span>
                              <strong style={{fontSize: '13px'}}>{formatarMoeda(saldoRestantePagamento)}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="botoes-pagamento" style={{marginTop: '10px'}}>
                          <button
                            className="btn-pag btn-dinheiro"
                            onClick={confirmarPagamentoComposto}
                            disabled={Math.abs(saldoRestantePagamento) > 0.01}
                            style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          >
                            <i className="fas fa-check-circle"></i> Confirmar
                          </button>
                          <button
                            className="btn-cancelar-pag"
                            onClick={() => setMostrarMultiFormas(false)}
                            style={{ padding: '12px 10px', fontSize: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '4px' }}
                          >
                            Voltar
                          </button>
                        </div>
                        </div>
                      </React.Fragment>,
                      document.body
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                margin: comandaRecemPaga ? '0' : 'auto',
                textAlign: 'center',
                width: '100%',
              }}
            >
              {comandaRecemPaga ? (
                <div
                  style={{
                    padding: '15px',
                    background: '#e8f5e9',
                    border: '2px solid #27ae60',
                    borderRadius: '12px',
                    maxWidth: '320px',
                    margin: '0 auto',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  }}
                >
                  <i
                    className="fas fa-check-circle"
                    style={{
                      fontSize: '32px',
                      color: '#27ae60',
                      marginBottom: '8px',
                    }}
                  ></i>
                  <h4
                    style={{
                      margin: '0 0 6px 0',
                      color: '#2e7d32',
                      fontSize: '16px',
                    }}
                  >
                    Conta Quitada!
                  </h4>
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#555',
                      margin: '0 0 10px 0',
                    }}
                  >
                    Comanda de <strong>{comandaRecemPaga.nome}</strong>{' '}
                    processada.
                  </p>
                  <div
                    style={{
                      borderTop: '1px solid #c8e6c9',
                      paddingTop: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'block',
                        marginBottom: '8px',
                        color: '#2c3e50',
                      }}
                    >
                      Deseja emitir Nota Fiscal (NFC-e)?
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-imprimir"
                        style={{
                          background: '#27ae60',
                          margin: 0,
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px'
                        }}
                        onClick={() =>
                          emitirNotaFiscalSilenciosa(comandaRecemPaga)
                        }
                      >
                        <i className="fas fa-file-invoice"></i> Emitir
                      </button>
                      <button
                        className="btn-imprimir"
                        style={{
                          background: '#e74c3c',
                          margin: 0,
                          flex: 1,
                          padding: '8px',
                          fontSize: '11px'
                        }}
                        onClick={() => setComandaRecemPaga(null)}
                      >
                        <i className="fas fa-times-circle"></i> Concluir
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#888', fontSize: '12px' }}>
                  Selecione ou crie uma comanda ao lado.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* FIM DA COLUNA 2 */}

      <div className="col" style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>
          Cardápio Express{' '}
          {categoriaAtiva === 'Todos' && (
            <span style={{ fontSize: '11px', color: 'var(--orange)' }}>
              (Mais Consumidos)
            </span>
          )}
        </h2>
        <div className="categorias-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64.1px, 1fr))', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {listaCategorias.map((cat) => (
            <button
              key={cat}
              className={`btn-categoria ${
                categoriaAtiva === cat ? 'active' : ''
              }`}
              onClick={() => setCategoriaAtiva(cat)}
              style={{
                minWidth: 0,
                minHeight: '60.7px',
                padding: '7px 6px',
                fontSize: cat.length > 16 ? '8.5px' : cat.length > 12 ? '9.5px' : cat.length > 8 ? '11px' : '13px',
                lineHeight: '1.1',
                fontWeight: '500',
                fontFamily: '"Arial Narrow", "Roboto Condensed", sans-serif',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: categoriaAtiva === cat ? '1px solid #f97316' : '1px solid #b8cbe3',
                background: categoriaAtiva === cat ? '#f97316' : '#edf4fc',
                color: '#007aff',
                boxShadow: categoriaAtiva === cat ? '0 5px 12px rgba(249, 115, 22, 0.28)' : '0 5px 10px rgba(62, 110, 170, 0.22), 0 2px 3px rgba(62, 110, 170, 0.12)',
                letterSpacing: '0.1px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid-produtos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: '8px', alignContent: 'start', overflowY: 'auto', flexGrow: '1' }}>
          {produtosFiltrados.map((p) => (
            <div
              key={p.id}
              className="card-prod"
              onClick={() => addItemNaComanda(p)}
              style={{ position: 'relative', minHeight: '116px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 0, borderRadius: '10px', cursor: 'pointer', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', boxSizing: 'border-box' }}
            >
              {p.estoque <= p.estoqueMinimo && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    fontSize: '9px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    border: '1px solid #fecaca'
                  }}
                >
                  {p.estoque}
                </span>
              )}

              <img
                src={p.imagem || imagemAutomaticaProduto(p.nome, p.category)}
                alt={p.nome}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = imagemAutomaticaProduto(p.nome, p.category);
                }}
                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }}
              />
              
              <span className="prod-nome" style={{ fontSize: '10px', lineHeight: '1.15', textAlign: 'center', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%', height: '23px', padding: '0 2px', boxSizing: 'border-box' }}>{p.nome}</span>
              
              <span className="prod-preco" style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold' }}>{formatarMoeda(p.preco)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}