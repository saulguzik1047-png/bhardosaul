import React from 'react';

export const Auditoria = ({ logsAuditoria }) => {
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
                <td>{JSON.stringify(log.detalhes)}</td>
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