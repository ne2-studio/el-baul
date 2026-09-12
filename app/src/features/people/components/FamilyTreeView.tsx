import React, { useMemo, useRef } from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { Button } from '@/design-system/components/actions/Button';
import { Persona, PersonaRelationship } from '@/types';
import { buildFamilyTree, buildPersonaFamilyTree, FamilyTreeNode } from '@/utils/familyTree';

interface FamilyTreeViewProps {
  personas: Persona[];
  relationships: PersonaRelationship[];
  onSelectPersona: (persona: Persona) => void;
  /**
   * Si se pasa, el árbol se recorta a la familia inmediata de esta persona (ella misma, sus
   * padres, sus hermanos y sus hijos — nunca abuelos, nietos, ni el resto de familias del
   * baúl) en vez de mostrar todo el árbol — usado por la pestaña "Familia" de la propia ficha
   * de una persona (ver PersonaFamiliaTabContainer y buildPersonaFamilyTree).
   */
  focusPersonaId?: string;
  /**
   * "Volver a Mosaico" en el empty state — solo tiene sentido en el árbol de todo el baúl (ver
   * spec, en V1 no se edita desde aquí). Se omite cuando se usa focusPersonaId: la ficha de una
   * persona no tiene una vista "Mosaico" a la que volver.
   */
  onBackToMosaico?: () => void;
}

// Tamaño de cada nodo y separación entre generaciones/hermanos — ver buildFamilyTree
// (utils/familyTree.ts) para cómo se calculan generation/slot a partir de las relaciones.
const NODE_WIDTH = 112;
const NODE_HEIGHT = 152;
const COL_GAP = 28;
const ROW_GAP = 56;
const COL_WIDTH = NODE_WIDTH + COL_GAP;
const ROW_HEIGHT = NODE_HEIGHT + ROW_GAP;
// Margen mínimo entre el lienzo del árbol y el marco del visor — sin esto, las tarjetas de la
// primera/última fila o columna quedan pegadas al borde (ver feedback: "las tarjetas no tienen
// margen"). Nota: no basta con darle padding al div del lienzo, porque los hijos con position
// absolute se posicionan respecto al padding box, no al content box — por eso el margen se suma
// directamente a cada coordenada en nodeCenter en vez de vía CSS padding.
const CANVAS_MARGIN = 32;
// Cuánto se mueve el puntero antes de considerar que es un arrastre (pan) y no un tap sobre
// un nodo — evita que arrastrar el árbol dispare accidentalmente la navegación a una ficha.
const DRAG_THRESHOLD_PX = 6;

function nodeCenter(node: FamilyTreeNode) {
  return {
    x: node.slot * COL_WIDTH + NODE_WIDTH / 2 + CANVAS_MARGIN,
    y: node.generation * ROW_HEIGHT + CANVAS_MARGIN,
  };
}

// v1 del árbol genealógico: solo consulta y navegación — ver el "Alcance V1" de la spec para
// por qué no hay edición, drag & drop ni parejas/matrimonios aquí. Es una proyección pura de
// personas + relaciones (buildFamilyTree), nunca una segunda fuente de verdad.
export function FamilyTreeView({ personas, relationships, onSelectPersona, focusPersonaId, onBackToMosaico }: FamilyTreeViewProps) {
  const tree = useMemo(
    () => (focusPersonaId ? buildPersonaFamilyTree(personas, relationships, focusPersonaId) : buildFamilyTree(personas, relationships)),
    [personas, relationships, focusPersonaId]
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number; moved: boolean } | null>(null);
  // Un arrastre que acaba de terminar no debe además disparar el click del nodo bajo el
  // puntero — se comprueba en el momento del click, cuando `drag.current` ya se ha limpiado en
  // handlePointerUp, así que el estado "¿hubo arrastre?" vive en un ref aparte.
  const justDragged = useRef(false);

  if (tree.nodes.length === 0) {
    return focusPersonaId ? (
      <EmptyState
        icon={<Icon icon={icons.users} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Todavía no hay relaciones familiares"
        subtitle='Añade padres, madres, hijos o hijas desde "Editar relaciones"'
      />
    ) : (
      <EmptyState
        icon={<Icon icon={icons.users} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Construye la historia de tu familia"
        subtitle={
          <>
            Añade relaciones entre las personas de tu familia para empezar a ver aquí vuestro árbol genealógico.
            <span className="flex justify-center mt-4">
              <Button variant="secondary" onClick={onBackToMosaico}>Volver a Mosaico</Button>
            </span>
          </>
        }
      />
    );
  }

  // Espacio justo para el contenido: el tamaño de una tarjeta más (slotCount/generationCount -
  // 1) separaciones completas entre columnas/filas, más el margen del lienzo a cada lado. Antes
  // se reservaba una columna/fila de más (slotCount * COL_WIDTH en vez de (slotCount-1) *
  // COL_WIDTH + NODE_WIDTH), lo que no se notaba mientras el árbol quedaba pegado arriba a la
  // izquierda, pero descentraba visiblemente el árbol al centrarlo en el visor.
  const canvasWidth = (tree.slotCount - 1) * COL_WIDTH + NODE_WIDTH + CANVAS_MARGIN * 2;
  const canvasHeight = (tree.generationCount - 1) * ROW_HEIGHT + NODE_HEIGHT + CANVAS_MARGIN * 2;

  // Arrastre con ratón para paisajes anchos en escritorio (el scroll táctil nativo ya cubre
  // móvil/tablet por sí solo, y el trackpad/rueda también funciona sin esto). Solo se activa
  // para puntero tipo "mouse" para no interferir con el scroll táctil nativo.
  //
  // Deliberadamente NO usa la Pointer Capture API (setPointerCapture): capturar el puntero en
  // este contenedor hace que el navegador retargetee el "click" posterior al propio contenedor
  // capturador en vez de al elemento bajo el cursor — así que un simple click sobre una tarjeta
  // dejaba de navegar a su ficha. En su lugar, mientras dura el arrastre se escucha
  // pointermove/pointerup en window, que seguimos recibiendo aunque el puntero salga de los
  // límites del contenedor a mitad de gesto, sin ese efecto secundario sobre el click.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !scrollRef.current) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
      moved: false,
    };

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      if (!drag.current || !scrollRef.current) return;
      const dx = moveEvent.clientX - drag.current.startX;
      const dy = moveEvent.clientY - drag.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) drag.current.moved = true;
      scrollRef.current.scrollLeft = drag.current.scrollLeft - dx;
      scrollRef.current.scrollTop = drag.current.scrollTop - dy;
    };
    const handleWindowPointerUp = () => {
      justDragged.current = drag.current?.moved ?? false;
      drag.current = null;
      window.removeEventListener('pointermove', handleWindowPointerMove);
    };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp, { once: true });
  };

  const handleSelect = (persona: Persona) => {
    if (justDragged.current) return;
    onSelectPersona(persona);
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-2xl border border-border bg-secondary/30 cursor-grab active:cursor-grabbing"
      style={{ height: '70vh', touchAction: 'pan-x pan-y' }}
      onPointerDown={handlePointerDown}
    >
      {/* min-w-full/min-h-full + flex centrado: si el árbol es más pequeño que el visor queda
          centrado en el medio; si es más grande, este wrapper crece con el contenido y el
          overflow-auto del contenedor padre se encarga del scroll con el árbol ya centrado. */}
      <div className="min-w-full min-h-full flex items-center justify-center">
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden
          >
            {tree.edges.map((edge) => {
              const parentNode = tree.nodes.find((n) => n.persona.id === edge.parentId);
              const childNode = tree.nodes.find((n) => n.persona.id === edge.childId);
              if (!parentNode || !childNode) return null;
              const from = nodeCenter(parentNode);
              const to = nodeCenter(childNode);
              const midY = from.y + NODE_HEIGHT + ROW_GAP / 2;
              // from.x/to.x ya son el centro horizontal de cada tarjeta (ver nodeCenter) — el
              // trazo entra y sale por el punto medio del borde inferior/superior, nunca por
              // una esquina.
              return (
                <path
                  key={`${edge.parentId}>${edge.childId}`}
                  d={`M ${from.x} ${from.y + NODE_HEIGHT} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={2}
                />
              );
            })}
          </svg>

          {tree.nodes.map((node) => {
            const { x, y } = nodeCenter(node);
            return (
              <div
                key={node.persona.id}
                className="absolute"
                style={{ left: x - NODE_WIDTH / 2, top: y, width: NODE_WIDTH }}
              >
                <FamilyTreeNodeCard persona={node.persona} onClick={() => handleSelect(node.persona)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FamilyTreeNodeCardProps {
  persona: Persona;
  onClick: () => void;
}

// Mismo lenguaje visual que PersonaCard (Mosaico): foto a sangre ocupando todo el ancho de la
// tarjeta, nombre debajo — solo que a una escala menor, y sin "Madre de Pedro" ni ningún otro
// texto genealógico redundante, porque la propia estructura del árbol ya comunica la relación
// (ver spec, sección "Nodos").
function FamilyTreeNodeCard({ persona, onClick }: FamilyTreeNodeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
    >
      <div className="aspect-square w-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
        ) : persona.isCustodio ? (
          <Icon icon={icons.crown} className="w-8 h-8 text-primary opacity-60" strokeWidth={1.5} aria-hidden />
        ) : (
          <Icon icon={icons.user} className="w-8 h-8 text-muted-foreground opacity-40" strokeWidth={1.5} aria-hidden />
        )}
      </div>
      <p className="text-xs font-medium text-foreground text-center truncate w-full px-1.5 py-2">{persona.nickname}</p>
    </button>
  );
}
