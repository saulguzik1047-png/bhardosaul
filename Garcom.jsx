import React, { useState } from 'react';
import { formatarMoeda, calcularTotal } from './formatadores.js';

export function Garcom({
  comandas,
  comandaAtivaId,
  setComandaAtivaId,
  produtos,
  categoriasCustomizadas,
  categoriasDivisiveis,
  imagemAutomaticaProduto,
  addItemNaComanda,
  iniciarDivisaoItem,
  usuarioLogado,
  logoutSistema,
}) {
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [comandaSelecionada, setComandaSelecionada] = useState(null);

  const iosBlue = '#007aff';
  const iosGreen = '#34c759';
  const iosRed = '#ff3b30';
  const iosOrange = '#ff9500';
  const iosPurple = '#af52de';
  const iosTeal = '#5ac8fa';
  const labelColor = '#8e8e93';
  const textPrimary = '#1c1c1e';
  const textSecondary = '#3c3c43';
  const fillBg = 'rgba(120, 120, 128, 0.12)';
  const fillBgHover = 'rgba(120, 120, 128, 0.16)';
  const separator = 'rgba(60, 60, 67, 0.12)';
  const radiusMd = '14px';
  const radiusSm = '10px';
  const radiusLg = '18px';
  const transition = '0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  const comandaAtual = comandas.find((c) => c.id === comandaAtivaId) || null;

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

  if (busca.trim() !== '') {
    produtosFiltrados = produtosFiltrados.filter((p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase())
    );
  }

  const selecionarComanda = (comanda) => {
    setComandaAtivaId(comanda.id);
    setComandaSelecionada(comanda.id);
    setCategoriaAtiva('Todos');
    setBusca('');
  };

  const voltarLista = () => {
    setComandaSelecionada(null);
    setComandaAtivaId(null);
  };

  const handleAddItem = (produto) => {
    addItemNaComanda(produto);
  };

  const handleDividir = (item) => {
    iniciarDivisaoItem(item);
  };

  const totalComanda = comandaAtual ? calcularTotal(comandaAtual.itens) : 0;

  // --- LISTA DE COMANDAS ---
  if (!comandaSelecionada) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 56px)', background: '#f2f2f7',
        padding: '20px 16px', display: 'flex', flexDirection: 'column',
        maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: textPrimary, letterSpacing: '-0.6px' }}>
              Mesas Abertas
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: labelColor }}>
              Toque em uma comanda para atender
            </p>
          </div>
          <button onClick={logoutSistema} style={{
            background: 'rgba(255, 59, 48, 0.1)', color: iosRed, border: 'none',
            padding: '10px 16px', borderRadius: radiusSm, fontSize: '15px',
            fontWeight: '600', cursor: 'pointer', transition, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <i className="fas fa-sign-out-alt"></i> Sair
          </button>
        </div>

        {comandas.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px', color: labelColor
          }}>
            <i className="fas fa-utensils" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '17px', fontWeight: '500' }}>Nenhuma comanda aberta no momento.</p>
            <p style={{ fontSize: '14px' }}>Aguarde o operador abrir uma mesa.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
            {comandas.map((c) => {
              const total = calcularTotal(c.itens);
              const qtdItens = c.itens.reduce((acc, i) => acc + i.qtd, 0);
              return (
                <button
                  key={c.id}
                  onClick={() => selecionarComanda(c)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.72)',
                    backdropFilter: 'blur(20px) saturate(1.6)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                    border: '0.5px solid rgba(255,255,255,0.6)',
                    borderRadius: radiusMd, padding: '16px 18px',
                    cursor: 'pointer', transition, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                    fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: fillBg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '20px', color: iosBlue, flexShrink: 0
                    }}>
                      <i className="fas fa-concierge-bell"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: '600', color: textPrimary }}>
                        {c.nome}
                      </div>
                      <div style={{ fontSize: '14px', color: labelColor, marginTop: '2px' }}>
                        {qtdItens} {qtdItens === 1 ? 'item' : 'itens'} · Mesa #{c.id}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: textPrimary }}>
                      {formatarMoeda(total)}
                    </div>
                    <div style={{
                      fontSize: '12px', fontWeight: '600', color: iosGreen,
                      background: 'rgba(52, 199, 89, 0.12)', padding: '2px 8px',
                      borderRadius: '6px', marginTop: '4px', display: 'inline-block'
                    }}>
                      Aberta
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- CARDÁPIO + CONSUMO ---
  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)', background: '#f2f2f7',
      display: 'flex', flexDirection: 'column', maxWidth: '500px',
      margin: '0 auto', boxSizing: 'border-box'
    }}>
      {/* HEADER DA COMANDA */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        padding: '14px 16px', borderBottom: '0.5px solid ' + separator,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <button onClick={voltarLista} style={{
          background: 'transparent', border: 'none', color: iosBlue,
          fontSize: '17px', fontWeight: '500', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit',
          padding: '6px 8px', borderRadius: radiusSm, transition
        }}>
          <i className="fas fa-chevron-left"></i> Mesas
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '17px', fontWeight: '600', color: textPrimary }}>
            {comandaAtual ? comandaAtual.nome : ''}
          </div>
          <div style={{ fontSize: '13px', color: labelColor }}>
            {comandaAtual ? `Mesa #${comandaAtual.id}` : ''}
          </div>
        </div>
        <div style={{ width: '70px' }}></div>
      </div>

      {/* CONSUMO ATUAL */}
      {comandaAtual && comandaAtual.itens.length > 0 && (
        <div style={{
          margin: '12px 16px', padding: '14px 16px',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderRadius: radiusMd, border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexShrink: 0
        }}>
          <div style={{
            fontSize: '13px', fontWeight: '600', color: labelColor,
            textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px'
          }}>
            Consumo Atual
          </div>
          {comandaAtual.itens.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: idx < comandaAtual.itens.length - 1 ? '0.5px solid ' + separator : 'none',
              fontSize: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: '700', color: iosBlue, flexShrink: 0 }}>{item.qtd}x</span>
                <span style={{
                  color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', flex: 1
                }}>
                  {item.nome}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontWeight: '600', color: textPrimary }}>
                  {formatarMoeda(item.preco * item.qtd)}
                </span>
                {item.splitGroupId ? (
                  <span style={{
                    fontSize: '11px', fontWeight: '600', color: iosPurple,
                    background: 'rgba(175, 82, 222, 0.12)', padding: '2px 7px',
                    borderRadius: '6px', flexShrink: 0
                  }}>
                    Dividido
                  </span>
                ) : (
                  (item.qtd > 0 && (
                    produtos.find((p) => p.id === item.idProd &&
                      (p.category === 'Porções' || categoriasDivisiveis.includes(p.category))
                    )
                  )) ? (
                    <button onClick={() => handleDividir(item)} style={{
                      background: 'rgba(175, 82, 222, 0.1)', color: iosPurple, border: 'none',
                      padding: '5px 10px', borderRadius: '8px', fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer', transition, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0
                    }}>
                      <i className="fas fa-divide"></i> Dividir
                    </button>
                  ) : null
                )}
              </div>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid ' + separator
          }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: labelColor }}>Total</span>
            <span style={{ fontSize: '22px', fontWeight: '700', color: textPrimary, letterSpacing: '-0.4px' }}>
              {formatarMoeda(totalComanda)}
            </span>
          </div>
        </div>
      )}

      {/* BUSCA + CATEGORIAS */}
      <div style={{ padding: '0 16px 10px 16px', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <i className="fas fa-search" style={{
            position: 'absolute', left: '12px', top: '11px',
            color: labelColor, fontSize: '14px'
          }}></i>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 36px', border: 'none',
              borderRadius: radiusMd, background: fillBg, color: textPrimary,
              fontSize: '16px', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', transition
            }}
          />
        </div>
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {listaCategorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              style={{
                background: categoriaAtiva === cat ? iosBlue : fillBg,
                color: categoriaAtiva === cat ? 'white' : textSecondary,
                border: 'none', padding: '8px 16px', borderRadius: '20px',
                fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                transition, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE PRODUTOS */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px 16px 16px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {produtosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: labelColor }}>
            <i className="fas fa-search" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '15px' }}>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'
          }}>
            {produtosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddItem(p)}
                disabled={p.estoque <= 0}
                style={{
                  background: 'rgba(255, 255, 255, 0.72)',
                  backdropFilter: 'blur(20px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                  border: '0.5px solid rgba(255,255,255,0.6)',
                  borderRadius: radiusMd, padding: '10px',
                  cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                  transition, fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  opacity: p.estoque <= 0 ? 0.4 : 1,
                }}
              >
                <img
                  src={p.imagem || imagemAutomaticaProduto(p.nome, p.category)}
                  alt={p.nome}
                  style={{
                    width: '100%', height: '80px', objectFit: 'cover',
                    borderRadius: radiusSm, background: fillBg
                  }}
                />
                <div style={{
                  fontSize: '14px', fontWeight: '600', color: textPrimary,
                  lineHeight: '1.25', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                }}>
                  {p.nome}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: iosGreen }}>
                    {formatarMoeda(p.preco)}
                  </span>
                  {p.estoque <= 0 ? (
                    <span style={{ fontSize: '12px', color: iosRed, fontWeight: '600' }}>Esgotado</span>
                  ) : (
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: iosBlue, color: 'white', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                      fontWeight: '700', flexShrink: 0
                    }}>
                      +
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
