import React from 'react';
import { formatarMoeda } from './formatadores.js';

export function Crediario({
  crediarios,
  setCaixaDialogo,
  liquidarVáriasComandasCrediario
}) {
  const [buscaCrediario, setBuscaCrediario] = React.useState('');
  const [expandedCliente, setExpandedCliente] = React.useState(null);
  const [expandedClientePago, setExpandedClientePago] = React.useState(null);

  const pendentes = crediarios.filter((c) => c.status === 'Pendente');
  const pagas = crediarios.filter((c) => c.status === 'Pago');

  const pendentesAgrupados = [];
  pendentes.forEach((c) => {
    const existente = pendentesAgrupados.find(
      (g) => g.cliente.toLowerCase() === c.cliente.toLowerCase()
    );
    if (existente) {
      existente.total += c.total;
      existente.comandas.push(c);
    } else {
      pendentesAgrupados.push({
        cliente: c.cliente,
        total: c.total,
        comandas: [c],
      });
    }
  });

  const pagasAgrupadas = [];
  pagas.forEach((c) => {
    const valorPago = c.pagamentos
      ? c.pagamentos.reduce((acc, p) => acc + p.valor, 0)
      : 0;

    const existente = pagasAgrupadas.find(
      (g) => g.cliente.toLowerCase() === c.cliente.toLowerCase()
    );
    if (existente) {
      existente.total += valorPago;
      existente.comandas.push({ ...c, valorPagoTotal: valorPago });
    } else {
      pagasAgrupadas.push({
        cliente: c.cliente,
        total: valorPago,
        comandas: [{ ...c, valorPagoTotal: valorPago }],
      });
    }
  });

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
      <h2>Livro Negro de Penduras (Controle de Crediário)</h2>

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
              <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente / Resumo</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '150px' }}>Ação</th>
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
                  <tr key={g.cliente} style={{ borderBottom: '1px solid #334155' }}>
                    <td
                      style={{ padding: '12px', cursor: 'pointer' }}
                      onClick={() =>
                        setExpandedCliente(
                          expandedCliente === g.cliente ? null : g.cliente
                        )
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#f97316' }}>
                            <i className="fas fa-user" style={{ marginRight: '6px' }}></i>
                            {g.cliente}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                            ({g.comandas.length} comanda{g.comandas.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '16px' }}>
                          {formatarMoeda(g.total)}
                        </div>
                      </div>

                      {expandedCliente === g.cliente && (
                        <div
                          className="detalhe-comandas-bloco"
                          style={{ marginTop: '12px', padding: '12px', background: '#0f172a', borderRadius: '8px', borderLeft: '3px solid #f97316' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <strong
                            style={{
                              fontSize: '12px',
                              display: 'block',
                              marginBottom: '8px',
                              color: '#cbd5e1',
                            }}
                          >
                            Detalhamento do Consumo:
                          </strong>
                          {g.comandas.map((c) => (
                            <div
                              key={c.idCred}
                              style={{
                                borderBottom: '1px solid #1e293b',
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
                                  color: '#94a3b8',
                                }}
                              >
                                <span>📅 {c.data}</span>
                                <span style={{ color: '#fb923c', fontWeight: 'bold' }}>
                                  {formatarMoeda(c.total)}
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
                                        color: '#cbd5e1'
                                      }}
                                    >
                                      <span>• {it.qtd}x {it.nome}</span>
                                      <span>{formatarMoeda(it.preco * it.qtd)}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <button
                        style={{
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          padding: '12px 10px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: '100%',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => abrirOpcoesPagamento(g)}
                      >
                        <i className="fas fa-hand-holding-usd"></i> Quitar Conta
                      </button>
                    </td>
                  </tr>
                ))}

              {pendentesAgrupados.filter((g) => g.cliente.toLowerCase().includes(buscaCrediario.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
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
              <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
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
                    <tr key={g.cliente} style={{ borderBottom: '1px solid #334155' }}>
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
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
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
                            style={{ marginTop: '12px', padding: '12px', background: '#0f172a', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {g.comandas.map((c) => (
                              <div
                                key={c.idCred}
                                style={{
                                  borderBottom: '1px solid #1e293b',
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
                                    color: '#94a3b8'
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
                                          color: '#cbd5e1'
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
                                      color: '#64748b',
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
                  <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                    Nenhum histórico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}