import { redirect } from "next/navigation";
import Link from "next/link";
import { Armazon } from "@/components/Armazon";
import { conversaciones, hoy, misExtras, planes, sesion } from "@/lib/datos";
import { ROLES } from "@/lib/extras-info";

export const dynamic = "force-dynamic";

export default async function LayoutDespacho({ children }: { children: React.ReactNode }) {
  const s = await sesion();
  if (!s) redirect("/entrar");
  if (s === "sin-despacho") redirect("/alta");
  const [extras, ps, h, convs] = await Promise.all([misExtras(), planes(), hoy(), conversaciones()]);
  const plan = ps.find((p) => p.id === s.despacho.plan_id);
  return (
    <Armazon
      nombre={s.nombre ?? s.email}
      despacho={s.despacho.nombre}
      rolTexto={ROLES[s.rol] ?? s.rol}
      plan={plan?.nombre ?? s.despacho.plan_id}
      extrasActivos={extras.filter((e) => e.activo).map((e) => e.extra_id)}
      porRevisar={h.porRevisar}
      noLeidos={convs.reduce((t, c) => t + c.no_leidos, 0)}
      demo={s.demo}
    >
      {!s.despacho.art28_aceptado_en && (
        <div className="aviso warn" role="alert">
          <span><b>Falta aceptar el contrato de encargo del tratamiento (art. 28 RGPD).</b> {s.rol === "admin" ? "Acéptalo para trabajar con datos reales de tus clientes." : "Pídeselo a la persona titular del despacho."}</span>
          {s.rol === "admin" && <Link className="btn ghost sm" href="/ajustes#art28">Revisarlo y aceptarlo</Link>}
        </div>
      )}
      {s.despacho.estado === "cancelado" && <div className="aviso err" role="alert">Este despacho está dado de baja. Escríbenos si quieres volver.</div>}
      {children}
    </Armazon>
  );
}
