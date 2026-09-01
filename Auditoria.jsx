import React from 'react';

export const Auditoria = ({ logsAuditoria }) => {
  const formatarDetalhes = (detalhes) => {
    if (!detalhes || typeof detalhes !== 'object') return '-';

    const rotulos = {
      id_comanda: 'Comanda',
      id_cred: 'Débito',
      nome_cliente: 'Cliente',
      cliente: 'Cliente',
      produto: 'Produto',
      quantidade: 'Quantidade',
      valor: 'Valor',
      data_lancamento: 'Data do lançamento',
    };

    return (
      <div style={{ display: 'grid', gap: '3px', minWidth: '190px' }}>
        {Object.entries(detalhes).map(([chave, valor]) => (
          <div key={chave} style={{ display: 'flex', gap: '6px', fontSize: '12px', lineHeight: 1.35 }}>
            <strong style={{ color: 'var(--ios-label-secondary)', whiteSpace: 'nowrap' }}>
              {rotulos[chave] || chave.replace(/_/g, ' ')}:
            </strong>
            <span style={{ color: 'var(--ios-label)', overflowWrap: 'anywhere' }}>
              {typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="single-container">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Auditoria</h2>
        <span style={{ color: 'var(--ios-label-secondary)', fontSize: '13px' }}>Histórico de cancelamentos, ajustes e exclusões.</span>
      </div>
      <div className="wrapper-tabela-scroll" style={{ background: 'var(--ios-fill)', borderRadius: '8px', padding: '4px' }}>
        <table className="tabela-padrao">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Operador</th>
              <th>Motivo</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logsAuditoria.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.data).toLocaleString()}</td>
                <td>{log.tipo}</td>
                <td>{log.operador}</td>
                <td>{log.motivo}</td>
                <td>{formatarDetalhes(log.detalhes)}</td>
              </tr>
            ))}
            {logsAuditoria.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--ios-label-tertiary)' }}>
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};