DROP FUNCTION IF EXISTS public.ajustar_estoque_produto(bigint, double precision);

CREATE TABLE IF NOT EXISTS public.ajustes_estoque_operacoes (
  operacao_id uuid PRIMARY KEY,
  produto_id bigint NOT NULL,
  variacao double precision NOT NULL,
  estoque_resultante double precision,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ajustes_estoque_operacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ajustes_estoque_operacoes FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.ajustar_estoque_produto(
  produto_id bigint,
  variacao double precision,
  operacao_id uuid DEFAULT NULL
)
RETURNS TABLE (id bigint, estoque double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  estoque_atualizado double precision;
BEGIN
  IF $3 IS NOT NULL THEN
    INSERT INTO public.ajustes_estoque_operacoes (
      operacao_id,
      produto_id,
      variacao
    )
    VALUES ($3, $1, $2)
    ON CONFLICT (operacao_id) DO NOTHING;

    IF NOT FOUND THEN
      RETURN QUERY
      SELECT operacao.produto_id, COALESCE(produto.estoque, operacao.estoque_resultante)
      FROM public.ajustes_estoque_operacoes AS operacao
      LEFT JOIN public.produtos AS produto ON produto.id = operacao.produto_id
      WHERE operacao.operacao_id = $3;
      RETURN;
    END IF;
  END IF;

  UPDATE public.produtos AS produto
  SET estoque = GREATEST(0, COALESCE(produto.estoque, 0) + $2)
  WHERE produto.id = $1
  RETURNING produto.estoque INTO estoque_atualizado;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado: %', $1;
  END IF;

  IF $3 IS NOT NULL THEN
    UPDATE public.ajustes_estoque_operacoes
    SET estoque_resultante = estoque_atualizado
    WHERE ajustes_estoque_operacoes.operacao_id = $3;
  END IF;

  RETURN QUERY SELECT $1, estoque_atualizado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_estoque_produto(bigint, double precision, uuid) TO anon, authenticated;
