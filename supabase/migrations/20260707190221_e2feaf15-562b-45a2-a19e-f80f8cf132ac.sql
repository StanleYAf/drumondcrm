CREATE OR REPLACE FUNCTION public.get_dados_publicos_cliente(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente public.clientes%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_cliente FROM public.clientes WHERE public_token = _token AND ativo = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'cliente', jsonb_build_object(
      'id', v_cliente.id,
      'nome', v_cliente.nome,
      'responsavel', v_cliente.responsavel,
      'logo_url', v_cliente.logo_url
    ),
    'indicadores', COALESCE((
      SELECT jsonb_agg(to_jsonb(i.*) ORDER BY i.ano, i.mes)
      FROM public.indicadores_manutencao i
      WHERE i.cliente_id = v_cliente.id
    ), '[]'::jsonb),
    'tecnicos', COALESCE((
      SELECT jsonb_agg(to_jsonb(t.*))
      FROM public.tecnicos_manutencao t
      WHERE t.cliente_id = v_cliente.id
    ), '[]'::jsonb),
    'ordens_servico', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'estado', o.estado,
        'tipo_servico', o.tipo_servico,
        'localizacao', o.localizacao,
        'numero_serie', o.numero_serie,
        'tag', o.tag,
        'tipo_equipamento', o.tipo_equipamento,
        'mes', o.mes,
        'ano', o.ano
      ))
      FROM public.ordens_servico o
      WHERE o.cliente_id = v_cliente.id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;