-- Arreglo: al guardar un asunto fallaba con «record "new" has no field "codigo"».
-- PL/pgSQL no cortocircuita el AND, así que new.codigo (que solo existe en clientes)
-- se evaluaba también en asuntos. Ahora se comprueba en un if aparte.
create or replace function public.proteger_campos()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if public.llamada_interna() then return new; end if;
  if new.despacho_id is distinct from old.despacho_id or new.origen is distinct from old.origen or new.id_externo is distinct from old.id_externo then
    raise exception 'Este campo no se puede cambiar.';
  end if;
  if tg_table_name = 'clientes' then
    if new.codigo is distinct from old.codigo then
      raise exception 'El código de verificación lo genera Bufetea.';
    end if;
  end if;
  return new;
end $function$;
