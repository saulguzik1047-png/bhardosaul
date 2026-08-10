import React, { useState } from 'react';
import { formatarMoeda } from './formatadores.js';
import LeitorNotaCamera from './LeitorNotaCamera.jsx';
import { supabaseClient } from './supabase.js';

export const Estoque = ({
  produtos,
  setProdutos,
  categoriasCustomizadas,
  setCategoriasCustomizadas,
  categoriasDivisiveis,
  setCategoriasDivisiveis,
  dispararMensagem,
  setCaixaDialogo,
  excluirProdutoDoEstoque,
  imprimirPainelRelatorio,
  processarNotaComIA,
  imagemAutomaticaProduto
}) => {
  const [idProdutoSelecionadoEdicao, setIdProdutoSelecionadoEdicao] = useState(null);
  const [novoProdNome, setNovoProdNome] = useState('');
  const [novoProdCategoria, setNovoProdCategoria] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [novoProdEstoqueMin, setNovoProdEstoqueMin] = useState('');
  const [novoProdImagem, setNovoProdImagem] = useState('');
  const [tipoProduto, setTipoProduto] = useState('padrao');
  const [novoProdEstoque, setNovoProdEstoque] = useState('');
  const [fatorConversao, setFatorConversao] = useState('');
  const [apelidos, setApelidos] = useState([]);
  const [novoApelido, setNovoApelido] = useState('');
  const [mostrarLeitorCamera, setMostrarLeitorCamera] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  const listaCategorias = [
    ...new Set([...categoriasCustomizadas, ...produtos.map((p) => p.category)])
  ];

  const custo = parseFloat(precoCusto) || 0;
  const venda = parseFloat(precoVenda) || 0;
  let margemCalculada = '% Lucro: 0.00%';
  let corMargem = '#8e8e93';

  if (custo > 0 && venda > custo) {
    const m = ((venda - custo) / custo) * 100;
    margemCalculada = `% Lucro: ${m.toFixed(2)}%`;
    corMargem = '#34c759';
  } else if (custo > 0 && venda < custo) {
    margemCalculada = 'Prejuízo!';
    corMargem = '#ff3b30';
  }

  const prodAtual = produtos.find(p => p.id === idProdutoSelecionadoEdicao);
  const qtdAtualDisplay = prodAtual ? prodAtual.estoque : 0;

  const totalItensEstoque = produtos.reduce((acc, p) => acc + p.estoque, 0);
  const custoTotalEstoque = produtos.reduce((acc, p) => acc + (p.estoque * p.precoCusto), 0);
  const vendaTotalEstoque = produtos.reduce((acc, p) => acc + (p.estoque * p.preco), 0);
  const lucroProjetadoTotal = vendaTotalEstoque - custoTotalEstoque;
  const produtosFiltrados = filtroCategoria === 'Todos' ? produtos : produtos.filter(p => p.category === filtroCategoria);

  const carregarProdutoParaEdicao = (produtoIdentificador) => {
    const prod = typeof produtoIdentificador === 'number'
      ? produtos.find(p => p.id === produtoIdentificador)
      : produtos.find(p => p.nome === produtoIdentificador);

    if (prod) {
      setIdProdutoSelecionadoEdicao(prod.id);
      setNovoProdNome(prod.nome);
      setNovoProdCategoria(prod.category);
      setPrecoCusto(prod.precoCusto);
      setPrecoVenda(prod.preco);
      setNovoProdEstoqueMin(prod.estoqueMinimo);
      setNovoProdImagem(prod.imagem || '');
      setFatorConversao(prod.fatorConversao > 1 ? prod.fatorConversao : '');
      setTipoProduto(prod.fatorConversao > 1 ? 'garrafa' : 'padrao');
      setApelidos(prod.apelidos || []);
      setNovoApelido('');
    }
  };

  const handleSalvar = async () => {
    if (!novoProdNome.trim()) {
      dispararMensagem('Erro', 'O nome do produto é obrigatório!');
      return;
    }

    const custoFinal = parseFloat(precoCusto) || 0;
    const vendaFinal = parseFloat(precoVenda) || 0;
    const minFinal = parseFloat(novoProdEstoqueMin) || 0;
    const fatorFinal = parseFloat(fatorConversao) || 1;

    if (idProdutoSelecionadoEdicao) {
      const prodAtualizado = {
        nome: novoProdNome,
        category: novoProdCategoria,
        precoCusto: custoFinal,
        preco: vendaFinal,
        estoqueMinimo: minFinal,
        imagem: novoProdImagem,
        fatorConversao: fatorFinal,
        apelidos: apelidos
      };
      setProdutos(prev => prev.map(p => p.id === idProdutoSelecionadoEdicao ? { ...p, ...prodAtualizado } : p));
      try {
        await supabaseClient?.from('produtos').upsert({
          id: idProdutoSelecionadoEdicao, nome: prodAtualizado.nome, category: prodAtualizado.category,
          preco: prodAtualizado.preco, preco_custo: prodAtualizado.precoCusto,
          estoque: (produtos.find(p => p.id === idProdutoSelecionadoEdicao)?.estoque || 0),
          estoque_minimo: prodAtualizado.estoqueMinimo, imagem: prodAtualizado.imagem,
          fator_conversao: prodAtualizado.fatorConversao, apelidos: prodAtualizado.apelidos
        });
      } catch (err) { console.warn('Nuvem offline:', err); }
      dispararMensagem('Sucesso', 'Produto atualizado com sucesso!');
    } else {
      const novoProduto = {
        id: Date.now(),
        nome: novoProdNome,
        category: novoProdCategoria,
        precoCusto: custoFinal,
        preco: vendaFinal,
        estoque: 0,
        estoqueMinimo: minFinal,
        imagem: novoProdImagem,
        fatorConversao: fatorFinal,
        apelidos: apelidos,
        dataUltimaCompra: new Date().toISOString().split('T')[0]
      };
      setProdutos(prev => [...prev, novoProduto]);
      setIdProdutoSelecionadoEdicao(novoProduto.id);
      try {
        await supabaseClient?.from('produtos').upsert({
          id: novoProduto.id, nome: novoProduto.nome, category: novoProduto.category,
          preco: novoProduto.preco, preco_custo: novoProduto.precoCusto,
          estoque: novoProduto.estoque, estoque_minimo: novoProduto.estoqueMinimo,
          imagem: novoProduto.imagem, fator_conversao: novoProduto.fatorConversao,
          apelidos: novoProduto.apelidos, data_ultima_compra: novoProduto.dataUltimaCompra
        });
      } catch (err) { console.warn('Nuvem offline:', err); }
      dispararMensagem('Sucesso', 'Novo produto cadastrado!');
    }
  };

  const handleAddEstoque = async () => {
    if (!idProdutoSelecionadoEdicao) {
      dispararMensagem('Aviso', 'Salve o produto primeiro antes de dar entrada no estoque.');
      return;
    }
    const qtdEntrada = parseFloat(novoProdEstoque) || 0;
    if (qtdEntrada <= 0) return;

    let qtdFinalAdicionar = 0;
    const fator = parseFloat(fatorConversao) || 1;

    if (tipoProduto === 'caixa' || tipoProduto === 'garrafa' || tipoProduto === 'peso') {
      qtdFinalAdicionar = qtdEntrada * fator;
    } else {
      qtdFinalAdicionar = qtdEntrada;
    }

    const prodAtual = produtos.find(p => p.id === idProdutoSelecionadoEdicao);
    const novoEstoque = (prodAtual?.estoque || 0) + qtdFinalAdicionar;

    setProdutos(prev => prev.map(p => p.id === idProdutoSelecionadoEdicao ? {
      ...p, estoque: novoEstoque
    } : p));

    try {
      await supabaseClient?.from('produtos').update({ estoque: novoEstoque }).eq('id', idProdutoSelecionadoEdicao);
    } catch (err) { console.warn('Nuvem offline:', err); }

    dispararMensagem('Estoque', `Foram adicionadas ${qtdFinalAdicionar} unidades ao estoque de ${novoProdNome}.`);
    setNovoProdEstoque('');
    setFatorConversao('');
  };

  const handleLimpar = () => {
    setIdProdutoSelecionadoEdicao(null);
    setNovoProdNome('');
    setPrecoCusto('');
    setPrecoVenda('');
    setNovoProdEstoqueMin('');
    setNovoProdImagem('');
    setNovoProdEstoque('');
    setFatorConversao('');
    setTipoProduto('padrao');
    setApelidos([]);
    setNovoApelido('');
  };

  // iOS-style shared constants
  const iosBlue = '#007aff';
  const iosGreen = '#34c759';
  const iosRed = '#ff3b30';
  const iosOrange = '#ff9500';
  const iosPurple = '#af52de';
  const iosTeal = '#5ac8fa';
  const iosIndigo = '#5856d6';
  const labelColor = '#8e8e93';
  const textPrimary = '#1c1c1e';
  const textSecondary = '#3c3c43';
  const fillBg = 'rgba(120, 120, 128, 0.12)';
  const fillBgHover = 'rgba(120, 120, 128, 0.16)';
  const separator = 'rgba(60, 60, 67, 0.12)';
  const radiusMd = '14px';
  const radiusSm = '10px';
  const transition = '0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: 'none', borderRadius: radiusSm,
    background: fillBg, color: textPrimary, fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', transition,
    fontFamily: 'inherit'
  };
  const labelStyle = {
    fontSize: '13px', color: labelColor, fontWeight: '600',
    marginBottom: '6px', display: 'block'
  };
  const btnBase = {
    border: 'none', padding: '10px 20px', borderRadius: radiusSm,
    fontWeight: '600', cursor: 'pointer', fontSize: '15px', color: 'white',
    transition, fontFamily: 'inherit'
  };

  return (
    <div className="single-container" style={{ background: '#f2f2f7', padding: '20px', minHeight: 'calc(100vh - 56px)', color: textPrimary }}>

      {/* TOP BUTTONS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleLimpar} style={{ ...btnBase, background: iosBlue }}>
          <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Novo Produto
        </button>

        <button
          onClick={() => setCaixaDialogo({
            titulo: 'Nova Categoria',
            mensagem: 'Digite o nome da nova categoria:',
            tipo: 'prompt_categoria',
            onConfirm: (nomeCat, divisivel) => {
              if(nomeCat) {
                setCategoriasCustomizadas([...categoriasCustomizadas, nomeCat]);
                if(divisivel) setCategoriasDivisiveis([...categoriasDivisiveis, nomeCat]);
              }
            }
          })}
          style={{ ...btnBase, background: iosPurple }}
        >
          <i className="fas fa-folder-plus" style={{ marginRight: '6px' }}></i>Criar Categoria
        </button>

        <button
          onClick={() => {
            if (!idProdutoSelecionadoEdicao) {
              dispararMensagem('Atenção', 'Selecione um produto primeiro para editar a categoria.');
              return;
            }
            setCaixaDialogo({
              titulo: 'Editar Categoria',
              mensagem: 'Digite a nova categoria para o produto selecionado:',
              tipo: 'prompt_categoria',
              onConfirm: (nomeCat, divisivel) => {
                if (!nomeCat) return;
                setNovoProdCategoria(nomeCat);
                if (!categoriasCustomizadas.includes(nomeCat)) {
                  setCategoriasCustomizadas([...categoriasCustomizadas, nomeCat]);
                }
                if (divisivel && !categoriasDivisiveis.includes(nomeCat)) {
                  setCategoriasDivisiveis([...categoriasDivisiveis, nomeCat]);
                }
                dispararMensagem('Categoria Atualizada', `Categoria alterada para ${nomeCat}.`);
              }
            });
          }}
          style={{ ...btnBase, background: '#ff9500' }}
        >
          <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>Editar Categoria
        </button>

        <button onClick={() => idProdutoSelecionadoEdicao ? excluirProdutoDoEstoque(idProdutoSelecionadoEdicao, novoProdNome) : null} style={{ ...btnBase, background: iosRed }}>
          <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>Excluir
        </button>

        <button onClick={handleSalvar} style={{ ...btnBase, background: iosGreen }}>
          <i className="fas fa-check" style={{ marginRight: '6px' }}></i>Salvar
        </button>

        <button
          onClick={() => setMostrarLeitorCamera(!mostrarLeitorCamera)}
          style={{ ...btnBase, background: iosIndigo, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="fas fa-camera"></i> {mostrarLeitorCamera ? 'Fechar Câmera' : 'Abrir Câmera (OCR)'}
        </button>

        <input type="file" id="uploadNotaIA" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={processarNotaComIA} />
        <button
          onClick={() => document.getElementById('uploadNotaIA').click()}
          style={{ ...btnBase, background: iosTeal, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="fas fa-file-invoice"></i> Importar Nota
        </button>
      </div>

      {/* CAMERA DRAWER */}
      {mostrarLeitorCamera && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderRadius: radiusMd, padding: '20px', marginBottom: '20px',
          border: '0.5px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}>
          <LeitorNotaCamera />
        </div>
      )}

      {/* EDIT PANEL */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        borderRadius: '18px', padding: '24px',
        border: '0.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)'
      }}>
        <h3 style={{
          color: textPrimary, marginTop: 0, marginBottom: '20px',
          fontSize: '20px', fontWeight: '600', letterSpacing: '-0.4px',
          borderBottom: '0.5px solid ' + separator, paddingBottom: '14px'
        }}>
          {idProdutoSelecionadoEdicao ? 'Edição de Produto' : 'Cadastrando Novo Produto'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: '24px' }}>

          {/* COL 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Procurar Produto</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '11px', color: labelColor, fontSize: '14px' }}></i>
                <input
                  type="text"
                  list="lista-produtos-edit"
                  placeholder="Procurar produto para editar..."
                  onChange={(e) => carregarProdutoParaEdicao(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
                <datalist id="lista-produtos-edit">
                  {produtos.map(p => <option key={p.id} value={p.nome} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Categoria</label>
              <select value={novoProdCategoria} onChange={(e) => setNovoProdCategoria(e.target.value)} style={inputStyle}>
                {listaCategorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Preço de Venda (R$)</label>
              <input type="number" step="0.05" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Quantidade Mínima (Alerta)</label>
              <input type="number" value={novoProdEstoqueMin} onChange={(e) => setNovoProdEstoqueMin(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Quantidade Atual em Estoque</label>
              <input type="number" value={qtdAtualDisplay} disabled style={{ ...inputStyle, color: labelColor, cursor: 'not-allowed' }} />
            </div>
          </div>

          {/* COL 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nome do Produto</label>
              <input type="text" value={novoProdNome} onChange={(e) => setNovoProdNome(e.target.value)} placeholder="Ex: Brahma Lata" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Preço de Custo (R$)</label>
              <input type="number" step="0.01" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Margem de Lucro</label>
              <div style={{
                width: '100%', padding: '11px 14px', border: 'none', borderRadius: radiusSm,
                background: fillBg, color: corMargem, fontSize: '15px', fontWeight: '700',
                boxSizing: 'border-box'
              }}>
                {margemCalculada}
              </div>
            </div>

            {/* STOCK ENTRY */}
            <div style={{
              background: fillBg, padding: '14px', borderRadius: radiusMd, border: 'none'
            }}>
              <label style={{
                fontSize: '13px', color: iosOrange, fontWeight: '600',
                marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>Entrada de Mercadoria</span>
                <select value={tipoProduto} onChange={(e) => setTipoProduto(e.target.value)} style={{
                  background: 'transparent', border: 'none', color: labelColor,
                  fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                }}>
                  <option value="padrao">Unidade</option>
                  <option value="caixa">Caixa</option>
                  <option value="garrafa">Garrafa (Doses)</option>
                </select>
              </label>

              {(tipoProduto === 'caixa' || tipoProduto === 'garrafa') && (
                <input
                  type="number"
                  placeholder={tipoProduto === 'caixa' ? "Unidades por Caixa (Ex: 24)" : "Doses por Garrafa (Ex: 20)"}
                  value={fatorConversao}
                  onChange={(e) => setFatorConversao(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '8px', fontSize: '14px' }}
                />
              )}

              <div style={{ display: 'flex' }}>
                <input type="number" placeholder="Add estoque..." value={novoProdEstoque} onChange={(e) => setNovoProdEstoque(e.target.value)} style={{
                  flex: 1, padding: '11px 14px', border: 'none', borderRadius: '10px 0 0 10px',
                  background: 'rgba(255,255,255,0.7)', color: textPrimary, fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                }} />
                <button onClick={handleAddEstoque} style={{
                  background: iosOrange, color: 'white', border: 'none',
                  padding: '0 18px', borderRadius: '0 10px 10px 0', fontWeight: '600',
                  cursor: 'pointer', fontSize: '15px', transition, fontFamily: 'inherit'
                }}>
                  Add
                </button>
              </div>
            </div>

            {/* APELIDOS (ALIASES) */}
            <div style={{
              background: fillBg, padding: '14px', borderRadius: radiusMd, border: 'none'
            }}>
              <label style={{
                fontSize: '13px', color: iosBlue, fontWeight: '600',
                marginBottom: '8px', display: 'block'
              }}>
                Apelidos do Produto (nomes alternativos na nota)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: apelidos.length > 0 ? '8px' : '0' }}>
                {apelidos.map((ap, idx) => (
                  <span key={idx} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(0,122,255,0.12)', color: iosBlue,
                    padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '500'
                  }}>
                    {ap}
                    <button onClick={() => setApelidos(prev => prev.filter((_, i) => i !== idx))} style={{
                      background: 'none', border: 'none', color: iosRed, cursor: 'pointer',
                      fontSize: '14px', fontWeight: '700', padding: '0 2px', lineHeight: 1
                    }}>&times;</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex' }}>
                <input
                  type="text"
                  placeholder="Ex: aperitivo underberg..."
                  value={novoApelido}
                  onChange={(e) => setNovoApelido(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && novoApelido.trim()) {
                      e.preventDefault();
                      setApelidos(prev => [...prev, novoApelido.trim()]);
                      setNovoApelido('');
                    }
                  }}
                  style={{
                    flex: 1, padding: '11px 14px', border: 'none', borderRadius: '10px 0 0 10px',
                    background: 'rgba(255,255,255,0.7)', color: textPrimary, fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
                <button onClick={() => {
                  if (novoApelido.trim()) {
                    setApelidos(prev => [...prev, novoApelido.trim()]);
                    setNovoApelido('');
                  }
                }} style={{
                  background: iosBlue, color: 'white', border: 'none',
                  padding: '0 14px', borderRadius: '0 10px 10px 0', fontWeight: '600',
                  cursor: 'pointer', fontSize: '14px', transition, fontFamily: 'inherit'
                }}>
                  +
                </button>
              </div>
            </div>
          </div>

          {/* COL 3: IMAGE PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <label style={labelStyle}>Preview da Imagem</label>
            <div style={{
              width: '120px', height: '120px', background: fillBg,
              border: '2px dashed rgba(120,120,128,0.32)', borderRadius: radiusMd,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {novoProdImagem ? (
                <img src={novoProdImagem} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <i className="fas fa-image" style={{ fontSize: '30px', color: 'rgba(120,120,128,0.3)' }}></i>
              )}
            </div>
            <input
              type="text"
              value={novoProdImagem}
              onChange={(e) => setNovoProdImagem(e.target.value)}
              placeholder="Cole o link da imagem..."
              style={{ ...inputStyle, fontSize: '13px', textAlign: 'center' }}
            />
          </div>
        </div>
      </div>

      {/* REPORT SECTION */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        borderRadius: '18px', marginTop: '20px',
        border: '0.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px 14px 24px', borderBottom: '0.5px solid ' + separator,
          flexWrap: 'wrap', gap: '10px'
        }}>
          <h3 style={{ color: textPrimary, margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '-0.4px' }}>
            Relatório de Estoque
          </h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={{
                background: fillBg, color: textPrimary, border: 'none',
                padding: '8px 14px', borderRadius: radiusSm, fontSize: '14px',
                outline: 'none', cursor: 'pointer', fontFamily: 'inherit', transition
              }}
            >
              <option value="Todos">Todas as Categorias</option>
              {listaCategorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <button onClick={() => imprimirPainelRelatorio(produtosFiltrados, filtroCategoria)} style={{
              background: 'transparent', color: iosBlue, border: 'none',
              padding: '8px 14px', borderRadius: radiusSm, fontSize: '14px',
              cursor: 'pointer', fontWeight: '500', fontFamily: 'inherit', transition
            }}>
              <i className="fas fa-print"></i> Imprimir
            </button>
          </div>
        </div>

        <div className="wrapper-tabela-scroll" style={{ padding: '0 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ color: labelColor, fontSize: '12px', borderBottom: '0.5px solid ' + separator }}>
                <th style={{ padding: '12px' }}>Img</th>
                <th>Produto / Min.</th>
                <th>Categoria</th>
                <th>Custo</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map(p => (
                <tr key={p.id} style={{ borderBottom: '0.5px solid ' + separator, fontSize: '14px' }}>
                  <td style={{ padding: '10px' }}>
                    <img src={p.imagem || imagemAutomaticaProduto(p.nome, p.category)} alt={p.nome} width="40" height="40" style={{ borderRadius: '10px', objectFit: 'cover' }} />
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', color: textPrimary }}>{p.nome}</strong>
                    <small style={{ color: labelColor }}>Mínimo: {p.estoqueMinimo}</small>
                  </td>
                  <td style={{ color: textSecondary }}>{p.category}</td>
                  <td style={{ color: iosRed }}>{formatarMoeda(p.precoCusto)}</td>
                  <td style={{ color: iosGreen, fontWeight: 'bold' }}>{formatarMoeda(p.preco)}</td>
                  <td style={{
                    color: p.estoque <= p.estoqueMinimo ? iosRed : iosBlue,
                    fontWeight: 'bold', fontSize: '16px'
                  }}>
                    {p.estoque}
                  </td>
                  <td style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => carregarProdutoParaEdicao(p.id)} style={{
                      background: 'rgba(52, 199, 89, 0.12)', color: iosGreen, border: 'none',
                      padding: '8px 14px', borderRadius: radiusSm, cursor: 'pointer',
                      transition, fontSize: '14px', minWidth: '120px'
                    }}>
                      <i className="fas fa-edit"></i> Editar Categoria
                    </button>
                    <button onClick={() => excluirProdutoDoEstoque(p.id, p.nome)} style={{
                      background: 'rgba(255, 59, 48, 0.1)', color: iosRed, border: 'none',
                      padding: '8px 12px', borderRadius: radiusSm, cursor: 'pointer',
                      transition, fontSize: '14px'
                    }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {produtosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '24px', color: labelColor }}>Nenhum produto encontrado nesta categoria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER SUMMARY */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
          background: fillBg, padding: '16px 24px 16px 24px',
          borderTop: '0.5px solid ' + separator, fontSize: '14px', alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <i className="fas fa-boxes" style={{ color: labelColor }}></i>
            <span style={{ color: labelColor }}>Total de Itens:</span>
            <strong style={{ color: textPrimary, fontSize: '15px' }}>{totalItensEstoque} un.</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <i className="fas fa-arrow-down" style={{ color: iosRed }}></i>
            <span style={{ color: labelColor }}>Custo Parado:</span>
            <strong style={{ color: iosRed, fontSize: '15px' }}>{formatarMoeda(custoTotalEstoque)}</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <i className="fas fa-arrow-up" style={{ color: iosGreen }}></i>
            <span style={{ color: labelColor }}>Venda Estimada:</span>
            <strong style={{ color: iosGreen, fontSize: '15px' }}>{formatarMoeda(vendaTotalEstoque)}</strong>
          </div>

          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            background: 'rgba(255,255,255,0.7)', padding: '8px 14px', borderRadius: radiusSm
          }}>
            <i className="fas fa-chart-line" style={{ color: iosBlue }}></i>
            <span style={{ color: labelColor }}>Lucro Projetado:</span>
            <strong style={{ color: iosBlue, fontSize: '15px' }}>{formatarMoeda(lucroProjetadoTotal)}</strong>
          </div>
        </div>

      </div>
    </div>
  );
};
