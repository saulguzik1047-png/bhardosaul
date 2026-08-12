import React from 'react';
import { formatarMoeda } from './formatadores.js';

export function Financeiro({
  vendas,
  produtos,
  despesas,
  setDespesas,
  nomeSoftware,
  dispararMensagem
}) {
  const [filtroRelatorioInicio, setFiltroRelatorioInicio] = React.useState('');
  const [filtroRelatorioFim, setFiltroRelatorioFim] = React.useState('');
  const [filtroPendenteInicio, setFiltroPendenteInicio] = React.useState('');
  const [filtroPendenteFim, setFiltroPendenteFim] = React.useState('');
  const [filtroPagoInicio, setFiltroPagoInicio] = React.useState('');
  const [filtroPagoFim, setFiltroPagoFim] = React.useState('');
  const [dataBaixaManual, setDataBaixaManual] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [despesaEmBaixa, setDespesaEmBaixa] = React.useState(null);
  const [novaDespesaDesc, setNovaDespesaDesc] = React.useState('');
  const [novaDespesaValor, setNovaDespesaValor] = React.useState('');
  const [novaDespesaVenc, setNovaDespesaVenc] = React.useState(new Date().toISOString().split('T')[0]);
  const [filtroPagamento, setFiltroPagamento] = React.useState('Todos');

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

  function lancarDespesa(e) {
    e.preventDefault();
    const v = parseMoedaBR(novaDespesaValor);
    if (!novaDespesaDesc.trim() || isNaN(v) || v <= 0) {
      dispararMensagem('Erro', 'Preencha corretamente todos os dados da despesa!');
      return;
    }
    setDespesas(prev => [
      ...prev,
      {
        id: Date.now(),
        descricao: novaDespesaDesc.trim(),
        valor: v,
        vencimento: novaDespesaVenc,
        status: 'Pendente',
        formaPagamento: '-',
      },
    ]);
    setNovaDespesaDesc('');
    setNovaDespesaValor('');
  }

  function baixarDespesaManual(id, forma, dataForcada) {
    const dataFinal = dataForcada ? dataForcada : new Date().toISOString().split('T')[0];
    setDespesas((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'Paga',
              formaPagamento: forma,
              dataPagamento: dataFinal,
            }
          : d
      )
    );
    dispararMensagem(
      'Despesa',
      `Despesa baixada manualmente como Paga via [${forma}] na data ${dataFinal.split('-').reverse().join('/')}!`
    );
    setDespesaEmBaixa(null);
  }

  const parseDataDMBY = (dataStr) => {
    if (!dataStr) return new Date(0);
    const partes = dataStr.split(',')[0].split('/');
    return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
  };

  const inicioDate = filtroRelatorioInicio ? new Date(`${filtroRelatorioInicio}T00:00:00`) : null;
  const fimDate = filtroRelatorioFim ? new Date(`${filtroRelatorioFim}T23:59:59`) : null;

  const formasPagamento = React.useMemo(() => {
    const set = new Set(['DINHEIRO', 'PIX', 'CARTAO', 'FIADO']);
    vendas.forEach((v) => {
      if (v.pagamento) {
        v.pagamento.split(/\s*\|\s*/).forEach((f) => {
          const val = f.trim().toUpperCase();
          if (val) set.add(val);
        });
      }
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [vendas]);

  const vendasFiltradas = vendas.filter((v) => {
    const vDate = parseDataDMBY(v.data);
    if (inicioDate && vDate < inicioDate) return false;
    if (fimDate && vDate > fimDate) return false;
    if (filtroPagamento !== 'Todos' && v.pagamento) {
      const formas = v.pagamento.split(/\s*\|\s*/).map((f) => f.trim().toUpperCase());
      if (!formas.includes(filtroPagamento)) return false;
    }
    if (filtroPagamento !== 'Todos' && !v.pagamento) return false;
    return true;
  });

  let totalVendidoRelatorio = 0;
  let totalCustoRelatorio = 0;

  vendasFiltradas.forEach((v) => {
    totalVendidoRelatorio += v.total;
    if (v.itensConsumidos) {
      v.itensConsumidos.forEach((item) => {
        const prodOriginal = produtos.find((p) => p.nome === item.nome);
        const custo = prodOriginal ? prodOriginal.precoCusto : 0;
        totalCustoRelatorio += custo * item.qtd;
      });
    }
  });

  const totalLucroRelatorio = totalVendidoRelatorio - totalCustoRelatorio;

  const imprimirRelatorioFinanceiro = () => {
    const periodo =
      filtroRelatorioInicio || filtroRelatorioFim
        ? `De ${filtroRelatorioInicio ? filtroRelatorioInicio.split('-').reverse().join('/') : 'Início'} até ${filtroRelatorioFim ? filtroRelatorioFim.split('-').reverse().join('/') : 'Hoje'}`
        : 'Todo o Período';
    const pagStr = filtroPagamento !== 'Todos' ? `\nForma de Pagamento: ${filtroPagamento}` : '';

    dispararMensagem(
      `RELATÓRIO DE DESEMPENHO`,
      `Módulo Financeiro: ${nomeSoftware}\nPeríodo: ${periodo}${pagStr}\n----------------------------------------\nTotal de Vendas: ${vendasFiltradas.length}\nFaturamento Bruto: ${formatarMoeda(totalVendidoRelatorio)}\nCusto Total Estimado: ${formatarMoeda(totalCustoRelatorio)}\nLucro Líquido: ${formatarMoeda(totalLucroRelatorio)}\n----------------------------------------\n* DOCUMENTO GERENCIAL INTERNO *`
    );
  };

  const filtrarPendente = (d) => {
    if (!d.vencimento) return true;
    if (filtroPendenteInicio && d.vencimento < filtroPendenteInicio) return false;
    if (filtroPendenteFim && d.vencimento > filtroPendenteFim) return false;
    return true;
  };

  const filtrarPago = (d) => {
    if (!d.vencimento) return true;
    if (filtroPagoInicio && d.vencimento < filtroPagoInicio) return false;
    if (filtroPagoFim && d.vencimento > filtroPagoFim) return false;
    return true;
  };

  const despesasPendentes = [...despesas]
    .filter((d) => d.status === 'Pendente' && filtrarPendente(d))
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
  const despesasPagas = [...despesas]
    .filter((d) => d.status === 'Paga' && filtrarPago(d))
    .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));

  return (
    <div className="single-container">
      <h2>Fluxo de Caixa & Indicadores Financeiros</h2>

      <div className="financeiro-top-row">
        <div className="card-panel">
          <h3>+ Lançar Saída de Caixa (Contas a Vencer)</h3>
          <form onSubmit={lancarDespesa} className="form-fin-bloco">
            <input
              type="text"
              placeholder="Descrição da Conta / Boleto / Despesa"
              value={novaDespesaDesc}
              onChange={(e) => setNovaDespesaDesc(e.target.value)}
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={novaDespesaValor}
              onChange={(e) => setNovaDespesaValor(formatarMoedaInput(e.target.value))}
            />
            <input
              type="date"
              value={novaDespesaVenc}
              onChange={(e) => setNovaDespesaVenc(e.target.value)}
            />
            <button
              type="submit"
              className="btn-add-fin"
              style={{ background: '#e74c3c' }}
            >
              Lançar Despesa (Pendente)
            </button>
          </form>
        </div>

        <div
          className="img-dashboard-container"
          style={{ flex: 1, minWidth: '300px' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '15px',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--ios-label-secondary)',
                }}
              >
                Periodo:
              </span>
              <input
                type="date"
                value={filtroRelatorioInicio}
                onChange={(e) => setFiltroRelatorioInicio(e.target.value)}
                style={{
                  padding: '6px 10px',
                  background: '#f1f5f9',
                  border: '1px solid var(--ios-separator)',
                  color: 'var(--ios-label)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--ios-label-secondary)' }}>ate</span>
              <input
                type="date"
                value={filtroRelatorioFim}
                onChange={(e) => setFiltroRelatorioFim(e.target.value)}
                style={{
                  padding: '6px 10px',
                  background: '#f1f5f9',
                  border: '1px solid var(--ios-separator)',
                  color: 'var(--ios-label)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {(filtroRelatorioInicio || filtroRelatorioFim) && (
                <button
                  onClick={() => { setFiltroRelatorioInicio(''); setFiltroRelatorioFim(''); }}
                  style={{
                    background: '#718096', color: 'white', border: 'none',
                    padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: '600',
                  }}
                >
                  Limpar
                </button>
              )}
              <button
                onClick={imprimirRelatorioFinanceiro}
                style={{
                  background: 'var(--ios-blue)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: '600',
                  marginLeft: 'auto',
                }}
              >
                <i className="fas fa-print"></i> Imprimir
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--ios-label-secondary)',
                }}
              >
                Pagamento:
              </span>
              {formasPagamento.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroPagamento(f)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: filtroPagamento === f ? '2px solid var(--ios-blue)' : '1px solid var(--ios-separator)',
                    background: filtroPagamento === f ? 'var(--ios-blue)' : '#f1f5f9',
                    color: filtroPagamento === f ? 'white' : 'var(--ios-label)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div
            className="img-dash-row-top"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
            }}
          >
            <div
              className="img-dash-card"
              style={{ minHeight: '110px', padding: '10px' }}
            >
              <div className="img-dash-header" style={{ gap: '6px' }}>
                <div
                  className="img-dash-icon totalv"
                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                >
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="img-dash-title" style={{ fontSize: '10px' }}>
                  Vendido
                </div>
              </div>
              <div
                className="img-dash-value totalv"
                style={{ fontSize: '16px' }}
              >
                {formatarMoeda(totalVendidoRelatorio)}
              </div>
            </div>

            <div
              className="img-dash-card"
              style={{ minHeight: '110px', padding: '10px' }}
            >
              <div className="img-dash-header" style={{ gap: '6px' }}>
                <div
                  className="img-dash-icon"
                  style={{
                    background: '#7f1d1d',
                    color: '#f87171',
                    width: '32px',
                    height: '32px',
                    fontSize: '14px',
                  }}
                >
                  <i className="fas fa-boxes"></i>
                </div>
                <div className="img-dash-title" style={{ fontSize: '10px' }}>
                  Custo
                </div>
              </div>
              <div
                className="img-dash-value"
                style={{ color: '#f87171', fontSize: '16px' }}
              >
                {formatarMoeda(totalCustoRelatorio)}
              </div>
            </div>

            <div
              className="img-dash-card"
              style={{ minHeight: '110px', padding: '10px' }}
            >
              <div className="img-dash-header" style={{ gap: '6px' }}>
                <div
                  className="img-dash-icon"
                  style={{
                    background: '#1e3a8a',
                    color: '#60a5fa',
                    width: '32px',
                    height: '32px',
                    fontSize: '14px',
                  }}
                >
                  <i className="fas fa-hand-holding-usd"></i>
                </div>
                <div className="img-dash-title" style={{ fontSize: '10px' }}>
                  Lucro
                </div>
              </div>
              <div
                className="img-dash-value"
                style={{ color: '#60a5fa', fontSize: '16px' }}
              >
                {formatarMoeda(totalLucroRelatorio)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-financeiro-tabelas">
        <div className="card-panel">
          <h3>📕 Contas a Pagar (Pendentes)</h3>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid var(--ios-separator)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-dark)',
              }}
            >
              Vencimento:
            </span>
            <input
              type="date"
              value={filtroPendenteInicio}
              onChange={(e) => setFiltroPendenteInicio(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--ios-separator)',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px' }}>até</span>
            <input
              type="date"
              value={filtroPendenteFim}
              onChange={(e) => setFiltroPendenteFim(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--ios-separator)',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            {(filtroPendenteInicio || filtroPendenteFim) && (
              <button
                onClick={() => {
                  setFiltroPendenteInicio('');
                  setFiltroPendenteFim('');
                }}
                style={{
                  background: '#718096',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div className="wrapper-tabela-scroll">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesasPendentes.map((d) => (
                  <tr key={d.id}>
                    <td>{d.descricao}</td>
                    <td>{d.vencimento.split('-').reverse().join('/')}</td>
                    <td style={{ color: 'red', fontWeight: 'bold' }}>
                      {formatarMoeda(d.valor)}
                    </td>
                    <td>
                      {despesaEmBaixa && despesaEmBaixa.id === d.id ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <input
                            type="date"
                            value={dataBaixaManual}
                            onChange={(e) =>
                              setDataBaixaManual(e.target.value)
                            }
                            style={{
                              padding: '4px',
                              border: '1px solid var(--orange)',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() =>
                                baixarDespesaManual(
                                  d.id,
                                  despesaEmBaixa.forma,
                                  dataBaixaManual
                                )
                              }
                              style={{
                                background: 'var(--green)',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: '600',
                              }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDespesaEmBaixa(null)}
                              style={{
                                background: '#718096',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Voltar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setDataBaixaManual(
                                new Date().toISOString().split('T')[0]
                              );
                              setDespesaEmBaixa({
                                id: d.id,
                                forma: e.target.value,
                              });
                            }
                          }}
                          className="input-tabela"
                          style={{ width: 'auto', padding: '4px' }}
                        >
                          <option value="" disabled>
                            Dar Baixa...
                          </option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão">Cartão</option>
                          <option value="Boleto">Boleto</option>
                          <option value="PIX">PIX</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {despesasPendentes.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        textAlign: 'center',
                        color: '#888',
                        fontStyle: 'italic',
                      }}
                    >
                      Nenhuma conta pendente no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-panel">
          <h3>✅ Histórico de Contas Pagas</h3>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid var(--ios-separator)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-dark)',
              }}
            >
              Vencimento:
            </span>
            <input
              type="date"
              value={filtroPagoInicio}
              onChange={(e) => setFiltroPagoInicio(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--ios-separator)',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px' }}>até</span>
            <input
              type="date"
              value={filtroPagoFim}
              onChange={(e) => setFiltroPagoFim(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--ios-separator)',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            {(filtroPagoInicio || filtroPagoFim) && (
              <button
                onClick={() => {
                  setFiltroPagoInicio('');
                  setFiltroPagoFim('');
                }}
                style={{
                  background: '#718096',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div className="wrapper-tabela-scroll">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Pago em</th>
                  <th>Valor</th>
                  <th>Forma</th>
                </tr>
              </thead>
              <tbody>
                {despesasPagas.map((d) => (
                  <tr key={d.id}>
                    <td>{d.descricao}</td>
                    <td>{d.vencimento.split('-').reverse().join('/')}</td>
                    <td>
                      <span
                        style={{ color: 'var(--blue)', fontWeight: '500' }}
                      >
                        {d.dataPagamento
                          ? d.dataPagamento.split('-').reverse().join('/')
                          : 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: 'green', fontWeight: 'bold' }}>
                      {formatarMoeda(d.valor)}
                    </td>
                    <td>
                      <span className="status-pago">{d.formaPagamento}</span>
                    </td>
                  </tr>
                ))}
                {despesasPagas.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: 'center',
                        color: '#888',
                        fontStyle: 'italic',
                      }}
                    >
                      Nenhuma conta paga no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}