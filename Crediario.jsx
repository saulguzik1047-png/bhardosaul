import React from 'react';
import { formatarMoeda } from './formatadores.js';

export function Crediario({
  crediarios,
  setCaixaDialogo,
  liquidarVáriasComandasCrediario,
  adicionarLancamentoCrediario,
  clientesCadastrados = [],
  imprimirRelatorioDiarioFiados,
  imprimirRelatorioPendenciaGeralFiados,
  imprimirExtratoDebitosCliente,
  excluirDebitoCrediario,
}) {
  const [buscaCrediario, setBuscaCrediario] = React.useState('');
  const [expandedCliente, setExpandedCliente] = React.useState(null);
  const [expandedClientePago, setExpandedClientePago] = React.useState(null);
  const [modalLancamento, setModalLancamento] = React.useState(null);

  const parseMoedaBR = (valor) => {
    const somenteNumeros = String(valor || '').replace(/[^\d]/g, '');
    return somenteNumeros ? Number(somenteNumeros) / 100 : 0;
  };

  const abrirLancamento = (cliente = '') => {
    setModalLancamento({ cliente, valor: '', descricao: '' });
  };

  const confirmarLancamento = () => {
    const valor = parseMoedaBR(modalLancamento.valor);
    if (!modalLancamento.cliente.trim() || valor <= 0) return;
    adicionarLancamentoCrediario(modalLancamento.cliente, valor, modalLancamento.descricao);
    setModalLancamento(null);
  };

  // registros antigos/da nuvem podem vir sem status ou com grafia diferente
  const statusNormalizado = (c) => {
    const bruto = String(c?.status || '').trim().toLowerCase();
    if (bruto === 'pago' || bruto === 'quitado') return 'Pago';
    if (bruto === 'pendente' || bruto === 'aberto') return 'Pendente';
    return Number(c?.total || 0) > 0 ? 'Pendente' : 'Pago';
  };

  const nomeDoCliente = (c) => String(c?.cliente || '').trim() || 'Sem nome';

  const listaCrediarios = Array.isArray(crediarios) ? crediarios : [];
  const pendentes = listaCrediarios.filter((c) => statusNormalizado(c) === 'Pendente');
  const pagas = listaCrediarios.filter((c) => statusNormalizado(c) === 'Pago');

  const pendentesAgrupados = [];
  pendentes.forEach((c) => {
    const cliente = nomeDoCliente(c);
    const existente = pendentesAgrupados.find(
      (g) => g.cliente.toLowerCase() === cliente.toLowerCase()
    );
    if (existente) {
      existente.total += Number(c.total || 0);
      existente.comandas.push(c);
    } else {
      pendentesAgrupados.push({
        cliente,
        total: Number(c.total || 0),
        comandas: [c],
      });
    }
  });

  const pagasAgrupadas = [];
  pagas.forEach((c) => {
    const cliente = nomeDoCliente(c);
    const valorPago = Array.isArray(c.pagamentos)
      ? c.pagamentos.reduce((acc, p) => acc + Number(p?.valor || 0), 0)
      : 0;

    const existente = pagasAgrupadas.find(
      (g) => g.cliente.toLowerCase() === cliente.toLowerCase()
    );
    if (existente) {
      existente.total += valorPago;
      existente.comandas.push({ ...c, valorPagoTotal: valorPago });
    } else {
      pagasAgrupadas.push({
        cliente,
        total: valorPago,
        comandas: [{ ...c, valorPagoTotal: valorPago }],
      });
    }
  });

  pendentesAgrupados.sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
  pagasAgrupadas.sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));

  const abrirOpcoesPagamento = (grupo) => {
    setCaixaDialogo({
      titulo: `💳 Quitar Conta: ${grupo.cliente}`,
      mensagem: `Saldo Devedor: ${formatarMoeda(grupo.total)}\n\nComo o cliente deseja pagar?`,
      tipo: 'motivos_botoes',
      botoes: ['💵 Dinheiro', '⚡ Pix', '💳 Cartão', '🌓 Pagamento Parcial'],
      cancelTxt: 'Cancelar',
      onSelect: (opcao) => {
        let metodo = '';
        if (opcao.includes('Dinheiro')) metodo = 'Dinheiro';
        else if (opcao.includes('Pix')) metodo = 'Pix';
        else if (opcao.includes('Cartão')) metodo = 'Cartão';
        else if (opcao.includes('Parcial')) metodo = 'Parcial';
        
        setTimeout(() => {
          liquidarVáriasComandasCrediario(grupo.comandas, grupo.cliente, metodo);
        }, 600);
      }
    });
  };

  return (
    <div className="single-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Fiados</h2>
          <span style={{ color: '#6b7280', fontSize: '13px' }}>Débitos pendentes, pagamentos e histórico dos clientes.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => abrirLancamento()}
            style={{ background: '#d97706', color: 'white', border: 'none', padding: '11px 14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
          >
            <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i>Adicionar Débito
          </button>
          <details>
            <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '13px', fontWeight: 'bold', padding: '10px' }}>
              <i className="fas fa-print" style={{ marginRight: '6px' }}></i>Relatórios
            </summary>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => imprimirRelatorioDiarioFiados && imprimirRelatorioDiarioFiados()} style={{ background: '#1f2937', color: 'white', border: 'none', padding: '9px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '7px', cursor: 'pointer' }}>
                Ticket Diário
              </button>
              <button type="button" onClick={() => imprimirRelatorioPendenciaGeralFiados && imprimirRelatorioPendenciaGeralFiados()} style={{ background: '#334155', color: 'white', border: 'none', padding: '9px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '7px', cursor: 'pointer' }}>
                Pendência Geral
              </button>
            </div>
          </details>
        </div>
      </div>

      <input
        type="text"
        className="search-box"
        placeholder="🔍 Buscar cliente no crediário..."
        value={buscaCrediario}
        onChange={(e) => setBuscaCrediario(e.target.value)}
      />

      <div className="grid-financeiro-tabelas">
        <div className="card-panel">
          <h3>📕 Penduras Devidas (Agrupadas por Cliente)</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: 'rgba(120,120,128,0.12)', color: '#5c5c66', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total devido</th>
              </tr>
            </thead>
            <tbody>
              {pendentesAgrupados
                .filter((g) =>
                  g.cliente
                    .toLowerCase()
                    .includes(buscaCrediario.toLowerCase())
                )
                .map((g) => (
                  <tr key={g.cliente} style={{ borderBottom: '1px solid rgba(60,60,67,0.12)', cursor: 'pointer' }} onClick={() => setExpandedCliente(expandedCliente === g.cliente ? null : g.cliente)}>
                    <td
                      colSpan="2"
                      style={{ padding: '12px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#d97706' }}>
                            <i className="fas fa-user" style={{ marginRight: '6px' }}></i>
                            {g.cliente}
                          </strong>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {formatarMoeda(g.total)}
                          <i className={`fas fa-chevron-${expandedCliente === g.cliente ? 'up' : 'down'}`} style={{ color: '#6b7280', fontSize: '12px' }}></i>
                        </div>
                      </div>

                      {expandedCliente === g.cliente && (
                        <div
                          className="detalhe-comandas-bloco"
                          style={{ marginTop: '12px', padding: '12px', background: 'rgba(120,120,128,0.12)', borderRadius: '8px', borderLeft: '3px solid #d97706' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <strong
                            style={{
                              fontSize: '12px',
                              display: 'block',
                              marginBottom: '8px',
                              color: '#374151',
                            }}
                          >
                            Detalhamento do Consumo:
                          </strong>
                          {g.comandas.map((c) => (
                            <div
                              key={c.idCred}
                              style={{
                                borderBottom: '1px solid rgba(60,60,67,0.12)',
                                paddingBottom: '8px',
                                marginBottom: '8px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontWeight: '600',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                }}
                              >
                                <span>📅 {c.data}</span>
                                <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                                  {formatarMoeda(c.total)}
                                </span>
                              </div>
                              <button
                                type="button"
                                title="Excluir este débito"
                                onClick={() => excluirDebitoCrediario && excluirDebitoCrediario(c)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '5px 0',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                }}
                              >
                                <i className="fas fa-trash-alt" style={{ marginRight: '5px' }}></i>Excluir débito
                              </button>
                              <div className="caixa-produtos-consumidos" style={{ marginTop: '4px' }}>
                                {c.itensConsumidos &&
                                  c.itensConsumidos.map((it, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '11px',
                                        color: '#374151'
                                      }}
                                    >
                                      <span>• {it.qtd}x {it.nome}</span>
                                      <span>{formatarMoeda(it.preco * it.qtd)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                            <button type="button" onClick={() => abrirOpcoesPagamento(g)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                              <i className="fas fa-hand-holding-usd" style={{ marginRight: '5px' }}></i>Quitar Conta
                            </button>
                            <button type="button" onClick={() => abrirLancamento(g.cliente)} style={{ background: '#d97706', color: 'white', border: 'none', padding: '10px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                              <i className="fas fa-plus" style={{ marginRight: '5px' }}></i>Adicionar Saldo
                            </button>
                            <button type="button" onClick={() => imprimirExtratoDebitosCliente && imprimirExtratoDebitosCliente(g.cliente, g.comandas)} style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                              <i className="fas fa-print" style={{ marginRight: '5px' }}></i>Imprimir Débitos
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

              {pendentesAgrupados.filter((g) => g.cliente.toLowerCase().includes(buscaCrediario.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '13px' }}>
                    Nenhuma conta pendente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-panel">
          <h3>✅ Penduras Pagas (Agrupadas por Cliente)</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: 'rgba(120,120,128,0.12)', color: '#5c5c66', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente / Histórico</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagasAgrupadas
                .filter((g) =>
                  g.cliente
                    .toLowerCase()
                    .includes(buscaCrediario.toLowerCase())
                )
                .map((g) => {
                  const metodosUsados = Array.from(
                    new Set(
                      g.comandas.flatMap(
                        (c) => c.pagamentos?.map((p) => p.metodo) || []
                      )
                    )
                  )
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr key={g.cliente} style={{ borderBottom: '1px solid rgba(60,60,67,0.12)' }}>
                      <td
                        style={{ padding: '12px', cursor: 'pointer' }}
                        onClick={() =>
                          setExpandedClientePago(
                            expandedClientePago === g.cliente
                              ? null
                              : g.cliente
                          )
                        }
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#22c55e' }}>
                              <i className="fas fa-user-check" style={{ marginRight: '6px' }}></i>
                              {g.cliente}
                            </strong>
                            {metodosUsados && (
                              <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '8px', background: 'rgba(120,120,128,0.16)', padding: '2px 6px', borderRadius: '4px' }}>
                                <i className="fas fa-money-check-alt"></i> {metodosUsados}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '16px' }}>
                            {formatarMoeda(g.total)}
                          </div>
                        </div>

                        {expandedClientePago === g.cliente && (
                          <div
                            className="detalhe-comandas-bloco"
                            style={{ marginTop: '12px', padding: '12px', background: 'rgba(120,120,128,0.12)', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {g.comandas.map((c) => (
                              <div
                                key={c.idCred}
                                style={{
                                  borderBottom: '1px solid rgba(60,60,67,0.12)',
                                  paddingBottom: '8px',
                                  marginBottom: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#6b7280'
                                  }}
                                >
                                  <span>📅 {c.data}</span>
                                  <span style={{ color: '#22c55e' }}>
                                    {formatarMoeda(c.valorPagoTotal)}
                                  </span>
                                </div>
                                <div className="caixa-produtos-consumidos" style={{ marginTop: '4px' }}>
                                  {c.itensConsumidos &&
                                    c.itensConsumidos.map((it, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          fontSize: '11px',
                                          color: '#374151'
                                        }}
                                      >
                                        <span>• {it.qtd}x {it.nome}</span>
                                      </div>
                                    ))}
                                </div>
                                {c.pagamentos?.map((p, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: '10px',
                                      color: '#6b7280',
                                      marginTop: '4px'
                                    }}
                                  >
                                    <i className="fas fa-check"></i> Pago via: {p.metodo} (
                                    {formatarMoeda(p.valor)}) -{' '}
                                    {p.data?.split(',')[0]}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          QUITADO
                        </span>
                      </td>
                    </tr>
                  );
                })}
                
              {pagasAgrupadas.filter((g) => g.cliente.toLowerCase().includes(buscaCrediario.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '13px' }}>
                    Nenhum histórico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalLancamento && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box" style={{ maxWidth: '460px' }}>
            <div className="custom-dialog-title" style={{ color: '#f59e0b' }}>
              <i className="fas fa-plus-circle"></i>
              <span>Adicionar Saldo Devedor</span>
            </div>
            <div className="custom-dialog-message" style={{ marginBottom: '15px' }}>
              Lance um valor avulso na conta do cliente (dinheiro retirado, taxa, ajuste).
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                className="dark-input-field"
                list="clientes-crediario"
                placeholder="Nome do cliente..."
                style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                value={modalLancamento.cliente}
                onChange={(e) => setModalLancamento((prev) => ({ ...prev, cliente: e.target.value }))}
                autoFocus
              />
              <datalist id="clientes-crediario">
                {[...clientesCadastrados]
                  .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
                  .map((c) => <option key={c.nome} value={c.nome} />)}
              </datalist>

              <input
                type="text"
                inputMode="decimal"
                className="dark-input-field"
                placeholder="R$ 0,00"
                style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                value={modalLancamento.valor}
                onChange={(e) => {
                  const numero = parseMoedaBR(e.target.value);
                  setModalLancamento((prev) => ({ ...prev, valor: numero ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '' }));
                }}
              />

              <input
                type="text"
                className="dark-input-field"
                placeholder="Descrição (ex: Saldo devedor em dinheiro)"
                style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                value={modalLancamento.descricao}
                onChange={(e) => setModalLancamento((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="custom-dialog-buttons">
              <button type="button" className="btn-dialog-cancel" onClick={() => setModalLancamento(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-dialog-confirm"
                style={{ background: '#d97706' }}
                disabled={!modalLancamento.cliente.trim() || parseMoedaBR(modalLancamento.valor) <= 0}
                onClick={confirmarLancamento}
              >
                Adicionar Saldo Devedor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}