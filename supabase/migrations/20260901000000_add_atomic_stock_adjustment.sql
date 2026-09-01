CREATE OR REPLACE FUNCTION ajustar_estoque_produto(
  produto_id bigint,
  variacao float8
)
RETURNS TABLE (id bigint, estoque float8)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE produtos
  SET estoque = GREATEST(0, COALESCE(produtos.estoque, 0) + variacao)
  WHERE produtos.id = produto_id
  RETURNING produtos.id::bigint, produtos.estoque::float8;
END;
$$;

GRANT EXECUTE ON FUNCTION ajustar_estoque_produto(bigint, float8) TO anon, authenticated;