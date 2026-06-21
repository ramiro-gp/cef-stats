import { createPortal } from 'react-dom'
import { APP_NAME } from '../config/appBrand'
import { appVersion } from '../config/appVersion'

const sections = [
  { title: '¿Qué es Fulbo Stats?', paragraphs: ['Fulbo Stats te ayuda a registrar lo que pasa en tus partidos de fútbol amateur: resultados, goles, asistencias, equipos, comentarios y reconocimientos.', 'La idea es simple: cada jugador carga sus números y la app arma el historial, las comparaciones y los rankings.'] },
  { title: 'Personal, TODOS y grupos', paragraphs: ['Personal (sin grupo) sirve para guardar partidos que no pertenecen a ningún grupo. TODOS reúne tus datos personales y los de todos tus grupos. Si elegís un grupo puntual, ves solamente lo relacionado con ese grupo.', 'La opción elegida arriba cambia lo que muestran Inicio, Partidos y Rankings. Tu tarjeta de Perfil siempre muestra tus totales completos.'] },
  { title: 'Cómo cargar tus números', paragraphs: ['Entrá en Cargar, elegí dónde querés guardar el partido y marcá Gané, Empaté o Perdí. Después agregá tus goles, asistencias, tipo de partido y formato.', 'Si el partido ya existe en la app, podés vincular la carga para que quede conectada con su detalle y resultado.'] },
  { title: 'Partidos e invitaciones', paragraphs: ['Podés crear un partido con grupo o Sin grupo, elegir fecha, horario, formato y nombres de equipos. Compartí el link o código para sumar participantes sin agregarlos automáticamente a un grupo.', 'Dentro del partido podés elegir equipo, ver el resultado, votar MVP, comentar en FOROBARDO y cargar tus números.'] },
  { title: 'Cómo leer los códigos', paragraphs: ['Los códigos nuevos tienen ocho caracteres en dos bloques, por ejemplo H63K-81HY. Podés dictarlos como “H63K, guion, 81HY”.', 'No importa si los escribís en mayúsculas o minúsculas. También podés ingresarlos sin el guion o pegar directamente el link de invitación.'] },
  { title: 'Equipos CLARO y OSCURO', paragraphs: ['Los equipos se llaman CLARO y OSCURO por defecto, pero quien crea el partido puede personalizar esos nombres.', 'El creador también puede asignar o cambiar de equipo a los participantes. Los partidos anteriores siguen usando sus nombres originales.'] },
  { title: 'FOROBARDO y MVP', paragraphs: ['FOROBARDO es el espacio de comentarios de cada partido. Sólo quienes participan pueden verlo y comentar. Cada persona puede editar o borrar su propio comentario.', 'En MVP, cada participante tiene un voto y puede cambiarlo. El resultado muestra quién recibió más votos o si hubo empate.'] },
  { title: 'Rankings y Estadísticas', paragraphs: ['Ranking muestra una tabla para comparar goles, asistencias, partidos, promedios y progreso. Estadísticas muestra esas comparaciones con gráficos.', 'Podés elegir Amistoso o Torneo y filtrar por F5, F6, F7, F8 o F11. Siempre se tiene en cuenta lo que elegiste arriba.'] },
  { title: 'Perfil y tarjeta compartible', paragraphs: ['Perfil reúne tu historial, tus récords y tus totales completos. Desde ahí podés editar cargas, vincularlas a partidos y cambiar tus datos.', 'Compartir mi tarjeta crea una imagen con avatar, nombre, goles, asistencias, partidos y récords para compartir o guardar. No se sube a la base de datos.'] },
  { title: 'Instalar Fulbo Stats', paragraphs: ['Podés instalar Fulbo Stats desde el navegador y abrirla como cualquier otra app. En Android, Chrome muestra Instalar app; en iPhone usá Compartir y Agregar a pantalla de inicio; en Windows buscá el ícono de instalación de Chrome o Edge.', 'La app guarda sus archivos básicos para abrir más rápido, pero tus partidos y estadísticas se sincronizan online con tu cuenta. No es una app completamente offline.'] },
  { title: 'Reglas para cuidar los datos', paragraphs: ['Cargá una sola vez cada partido. Si ya existe un partido, vinculá o editá la carga anterior en lugar de crear otra.', 'Usá el resultado real, revisá goles y asistencias antes de guardar y elegí el grupo correcto. En partidos compartidos, acordá con los demás quién corrige el resultado o los equipos.'] },
]

const questions = [
  ['¿Puedo usar la app sin grupo?', 'Sí. Elegí Personal (sin grupo) para tus cargas y partidos mezclados.'],
  ['¿TODOS es un grupo?', 'No. Es una vista que reúne tus grupos y tus datos personales.'],
  ['¿Puedo entrar a un partido sin entrar al grupo?', 'Sí. El link o código te suma como participante del partido.'],
  ['¿Quién puede ver un partido?', 'Sus participantes y las personas autorizadas por el grupo anfitrión, según corresponda.'],
  ['¿Funciona sin internet?', 'Podés abrir la app instalada, pero necesitás conexión para consultar y guardar los datos de tu cuenta.'],
  ['¿Cómo guardo esta guía?', 'Tocá Imprimir / guardar PDF y elegí Guardar como PDF en las opciones de impresión.'],
]

export function UserGuideSheet({ onClose }: { onClose: () => void }) {
  return createPortal(<div className="guide-dialog fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Guía de uso y reglas">
    <button type="button" aria-label="Cerrar guía" onClick={onClose} className="no-print absolute inset-0 bg-black/70" />
    <article className="user-guide-print-root relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-white/10 dark:bg-[#0d1814] dark:text-white sm:rounded-[28px] sm:p-8">
      <header className="border-b border-slate-200 pb-5 dark:border-white/10"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">{APP_NAME} · {appVersion}</p><h1 className="mt-2 text-3xl font-black">Guía de uso y reglas</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Lo esencial para cargar, compartir y comparar sin mezclar los tantos.</p></div><button type="button" onClick={onClose} className="no-print grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-white/5">×</button></div><button type="button" onClick={() => window.print()} className="no-print mt-5 min-h-12 w-full rounded-xl bg-emerald-500 px-4 font-extrabold text-ink sm:w-auto">Imprimir / guardar PDF</button></header>
      <div className="mt-6 space-y-7">{sections.map(section => <section key={section.title} className="guide-section"><h2 className="text-lg font-black text-emerald-600 dark:text-emerald-400">{section.title}</h2><div className="mt-2 space-y-2">{section.paragraphs.map(paragraph => <p key={paragraph} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{paragraph}</p>)}</div></section>)}</div>
      <section className="guide-section mt-8 border-t border-slate-200 pt-6 dark:border-white/10"><h2 className="text-lg font-black">Preguntas frecuentes</h2><div className="mt-4 space-y-4">{questions.map(([question, answer]) => <div key={question}><h3 className="text-sm font-extrabold">{question}</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{answer}</p></div>)}</div></section>
      <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400 dark:border-white/10">Desarrollado por <a href="https://ramirogp.me" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400">Ramiro GP</a></footer>
    </article>
  </div>, document.body)
}
