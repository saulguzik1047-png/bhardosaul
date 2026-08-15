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

export const normalizarCategoria = (categoria) =>
  String(categoria || '').trim().toLocaleLowerCase('pt-BR');

export const listarCategoriasProdutos = (categoriasCustomizadas, produtos) => {
  const categorias = [...(categoriasCustomizadas || []), ...(produtos || []).map((produto) => produto.category)];
  const categoriasUnicas = new Map();

  categorias.forEach((categoria) => {
    const nome = String(categoria || '').trim();
    const chave = normalizarCategoria(nome);
    if (nome && chave !== 'geral' && !categoriasUnicas.has(chave)) {
      categoriasUnicas.set(chave, nome);
    }
  });

  return ['Todos', ...categoriasUnicas.values()];
};