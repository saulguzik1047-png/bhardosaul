import React from 'react';
import { formatarMoeda, calcularTotal } from './formatadores.js';

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
  modoPagamento, setModoPagamento,
  mostrarMultiFormas, setMostrarMultiFormas,
  comandaRecemPaga, setComandaRecemPaga,
  confirmarPagamentoComposto,
  finalizarPagamentoDireto,
  emitirNotaFiscalSilenciosa,
  imagemAutomaticaProduto,
  addItemNaComanda,
  iniciarDivisaoItem,
  tratarRemoverSplit,
  removerItemNaComanda,
  imprimirComandaConferencia,
  cancelarComanda,
  buscaContainerRef,
  nomeSoftware
}) {
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

  let subtotal = comandaAtual ? calcularTotal(comandaAtual.itens) : 0;
  const listaCategorias = [
    'Todos',
    ...new Set([
      ...categoriasCustomizadas,
      ...produtos.map((p) => p.category),
    ]),
  ];

  let produtosFiltrados =
    categoriaAtiva === 'Todos'
      ? produtos
      : produtos.filter((p) => p.category === categoriaAtiva);

  const vendasPorProduto = relatorioProdutos.reduce((acc, rp) => {
    acc[rp.nome] = (acc[rp.nome] || 0) + (rp.qtd || 0);
    return acc;
  }, {});

  if (categoriaAtiva === 'Todos') {
    produtosFiltrados = [...produtosFiltrados].sort((a, b) => {
      return (vendasPorProduto[b.nome] || 0) - (vendasPorProduto[a.nome] || 0);
    });
  }

  const sugestoesClientes =
    busca.trim() === ''
      ? clientesCadastrados
      : clientesCadastrados.filter((c) =>
          c.nome.toLowerCase().includes(busca.toLowerCase())
        );

  const sugestoesClientesOrdenadas = [...sugestoesClientes].sort((a, b) => {
    const abertasA = comandas.filter(
      (com) => com.nome.toLowerCase() === a.nome.toLowerCase()
    ).length;
    const abertasB = comandas.filter(
      (com) => com.nome.toLowerCase() === b.nome.toLowerCase()
    ).length;
    return abertasB - abertasA;
  });

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
  const saldoRestantePagamento = subtotal - totalPagoAtualmente;

  return (
    <div className="main-container" style={{ display: 'flex', height: 'calc(100vh - 60px)', gap: '8px', padding: '8px', background: '#eaf2ff' }}>
      
      {/* COLUNA 1: COMANDAS (Largura reduzida para 180px) */}
      <div className="col" style={{ flex: '0 0 180px', maxWidth: '180px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Mesas e Comandas</h2>

        <div className="busca-container" ref={buscaContainerRef} style={{ marginBottom: '8px', position: 'relative' }}>
        <input
          type="text"
          inputMode="search"
          autoCapitalize="words"
          autoComplete="off"
          spellCheck="false"
          className="search-box"
          placeholder="🔍 Nome ou apelido..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setMostrarSugestoes(true);
          }}
          onFocus={() => setMostrarSugestoes(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setMostrarSugestoes(false);
          }}
          style={{ padding: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
        />
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
                        setMostrarSugestoes(false);
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
                    setMostrarSugestoes(false);
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
                    setMostrarSugestoes(false);
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
            const isAtiva = comandaAtivaId === c.id;
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
                <div className="comanda-header" style={{ fontSize: '13px', fontWeight: isAtiva ? 'bold' : '600', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.nome}</span>
                  <span style={{ color: isAtiva ? '#ffedd5' : '#94a3b8', fontSize: '11px' }}>#{c.id}</span>
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
      <div className="col" style={{ flex: '0 0 240px', maxWidth: '240px', display: 'flex', flexDirection: 'column' }}>
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
                      (prodOriginal.category === 'Porções' ||
                        categoriasDivisiveis.includes(prodOriginal.category));

                        return (
                          <div key={index} className="item-linha" style={{ fontSize: '12px', padding: '3px 0' }}>
                            <div className="item-qtd-nome">
                              <span className="item-qtd" style={{ fontWeight: 'bold' }}>{item.qtd}x</span>
                              <span>{item.nome}</span>
                            </div>
                            <div
                              style={{ display: 'flex', alignItems: 'center' }}
                            >
                              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>
                                {formatarMoeda(item.preco * item.qtd)}
                              </span>
  
                              {podeDividir && !item.splitGroupId && (
                                <button
                                  className="btn-remove-item"
                                  style={{
                                    color: 'var(--blue)',
                                    marginRight: '4px',
                                    padding: '1px 3px'
                                  }}
                                  onClick={() => iniciarDivisaoItem(item)}
                                  title="Dividir Porção"
                                >
                                  <i className="fas fa-divide" style={{ fontSize: '10px' }}></i>
                                </button>
                              )}
  
                              <button
                                className="btn-remove-item"
                                style={{ padding: '1px 3px' }}
                                onClick={() => {
                                  if (item.splitGroupId) {
                                    tratarRemoverSplit(item, comandaAtual);
                                  } else {
                                    removerItemNaComanda(item.idProd);
                                  }
                                }}
                              >
                                <i className="fas fa-trash" style={{ fontSize: '10px' }}></i>
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
                {comandaAtual.itens.length > 0 && (
                  <button
                    className="btn-imprimir"
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      marginBottom: '6px',
                    }}
                    onClick={imprimirComandaConferencia}
                  >
                    <i className="fas fa-print"></i> Conferência
                  </button>
                )}

                {!modoPagamento ? (
                  comandaAtual.itens.length === 0 ? (
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
                  ) : (
                    <button
                      className="btn-finalizar"
                      style={{ padding: '10px', fontSize: '13px', borderRadius: '6px', width: '100%' }}
                      onClick={() => {
                        setModoPagamento(true);
                        setBusca('');
                      }}
                    >
                      <i className="fas fa-cash-register"></i> Fechar Comanda
                    </button>
                  )
                ) : (
                  <div
                    className="botoes-pagamento"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                   {!mostrarMultiFormas ? (
                      <>
                        <button
                          className="btn-pag btn-cartao"
                          style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('cartão')}
                        >
                          💳 Cartão
                        </button>
                        <button
                          className="btn-pag btn-pix"
                          style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('pix')}
                        >
                          ⚡ Pix
                        </button>
                        <button
                          className="btn-pag btn-dinheiro"
                          style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('dinheiro')}
                        >
                          💵 Dinheiro
                        </button>
                        <button
                          className="btn-pag btn-creadiario"
                          style={{ padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                          onClick={() => finalizarPagamentoDireto('fiado')}
                        >
                          📙 Fiado
                        </button>
                        <button
                          className="btn-pag btn-mais-pgto"
                          onClick={() => setMostrarMultiFormas(true)}
                          style={{ background: '#64748b', padding: '14px 10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px' }}
                        >
                          ➕ Multi-Formas
                        </button>
                        <button
                          className="btn-cancelar-pag"
                          onClick={() => setModoPagamento(false)}
                          style={{
                            padding: '12px 10px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '8px',
                            fontWeight: 'bold'
                          }}
                        >
                          <i className="fas fa-arrow-left"></i> Voltar
                        </button>
                      </>
                    ) : (
                      <React.Fragment>
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
                      </React.Fragment>
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
        <div className="categorias-container" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {listaCategorias.map((cat) => (
            <button
              key={cat}
              className={`btn-categoria ${
                categoriaAtiva === cat ? 'active' : ''
              }`}
              onClick={() => setCategoriaAtiva(cat)}
              style={{
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: '800',
                borderRadius: '8px',
                border: categoriaAtiva === cat ? '1px solid #f97316' : '1px solid #cbd5e1',
                background: categoriaAtiva === cat ? '#f97316' : '#ffffff',
                color: categoriaAtiva === cat ? '#ffffff' : '#334155',
                boxShadow: categoriaAtiva === cat ? '0 4px 10px rgba(249, 115, 22, 0.28)' : '0 2px 4px rgba(0,0,0,0.08)',
                transform: 'scale(1.02)',
                letterSpacing: '0.2px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid-produtos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '12px 12px', alignContent: 'start', overflowY: 'auto', flexGrow: '1' }}>
          {produtosFiltrados.map((p) => (
            <div
              key={p.id}
              className="card-prod"
              onClick={() => addItemNaComanda(p)}
              style={{ position: 'relative', minHeight: '155px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', borderRadius: '10px', cursor: 'pointer', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}
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
                style={{ width: '74px', height: '74px', objectFit: 'cover', borderRadius: '10px' }}
              />
              
              <span className="prod-nome" style={{ fontSize: '12px', textAlign: 'center', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>{p.nome}</span>
              
              <span className="prod-preco" style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>{formatarMoeda(p.preco)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}