// Arquivo: formatadores.js
// Aqui ficam apenas funções puras de formatação visual e cálculos.

export const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const calcularTotal = (itens) => {
  if (!itens || !Array.isArray(itens)) return 0;
  return itens.reduce(
    (acc, item) => acc + (item.preco || 0) * (item.qtd || 0),
    0
  );
};