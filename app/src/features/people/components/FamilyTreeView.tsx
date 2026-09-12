import React, { useMemo, useRef } from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { Button } from '@/design-system/components/actions/Button';
import { Persona, PersonaRelationship } from '@/types';
import { buildFamilyTree, FamilyTreeNode } from '@/utils/familyTree';

interface FamilyTreeViewProps {
  personas: Persona[];
  relationships: PersonaRelationship[];
  onSelectPersona: (persona: Persona) => void;
  /** "Volver a Mosaico" en el empty state — ver spec, en V1 no se edita desde aquí. */
  onBackToMosaico: () => void;
}

// Tamaño de cada nodo y separación entre generaciones/hermanos — ver buildFamilyTree
// (utils/familyTree.ts) para cómo se calculan generation/slot a partir de las relaciones.
const NODE_WIDTH = 96;
const NODE_HEIGHT = 104;
const COL_GAP = 28;
const ROW_GAP = 56;
const COL_WIDTH = NODE_WIDTH + COL_GAP;
const ROW_HEIGHT = NODE_HEIGHT + ROW_GAP;
// Cuánto se mueve el puntero antes de considerar que es un arrastre (pan) y no un tap sobre
// un nodo — evita que arrastrar el árbol dispare accidentalmente la navegación a una ficha.
const DRAG_THRESHOLD_PX = 6;

function nodeCenter(node: FamilyTreeNode) {
  return {
    x: node.slot * COL_WIDTH + NODE_WIDTH / 2,
    y: node.generation * ROW_HEIGHT,
  };
}

// v1 del árbol genealógico: solo consulta y navegación — ver el "Alcance V1" de la spec para
// por qué no hay edición, drag & drop ni parejas/matrimonios aquí. Es una proyección pura de
// personas + relaciones (buildFamilyTree), nunca una segunda fuente de verdad.
export function FamilyTreeView({ personas, relationships, onSelectPersona, onBackToMosaico }: FamilyTreeViewProps) {
  const tree = useMemo(() => buildFamilyTree(personas, relationships), [personas, relationships]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number; moved: boolean } | null>(null);
  // Un arrastre que acaba de terminar no debe además disparar el click del nodo bajo el
  // puntero — se comprueba en el momento del click, cuando `drag.current` ya se ha limpiado en
  // handlePointerUp, así que el estado "¿hubo arrastre?" vive en un ref aparte.
  const justDragged = useRef(false);

  if (tree.nodes.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={icons.users} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Construye la historia de tu familia"
        subtitle={
          <>
            Añade relaciones entre las personas de tu familia para empezar a ver aquí vuestro árbol genealógico.
            <span className="block mt-4">
              <Button variant="secondary" onClick={onBackToMosaico}>Volver a Mosaico</Button>
            </span>
          </>
        }
      />
    );
  }

  const canvasWidth = tree.slotCount * COL_WIDTH;
  const canvasHeight = tree.generationCount * ROW_HEIGHT + NODE_HEIGHT;

  // Arrastre con ratón para paisajes anchos en escritorio (el scroll táctil nativo ya cubre
  // móvil/tablet por sí solo, y el trackpad/rueda también funciona sin esto). Solo se activa
  // para puntero tipo "mouse" para no interferir con el scroll táctil nativo.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !scrollRef.current) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
      moved: false,
    };
    // setPointerCapture no existe en jsdom (tests) y no es universal en todos los navegadores —
    // el pan sigue funcionando sin ella, solo se pierde el arrastre si el puntero sale del
    // contenedor a mitad de gesto, un caso menor.
    scrollRef.current.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !scrollRef.current) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) drag.current.moved = true;
    scrollRef.current.scrollLeft = drag.current.scrollLeft - dx;
    scrollRef.current.scrollTop = drag.current.scrollTop - dy;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scrollRef.current?.hasPointerCapture?.(event.pointerId)) scrollRef.current.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  const handleSelect = (persona: Persona) => {
    if (justDragged.current) return;
    onSelectPersona(persona);
  };

  const handlePointerUpWithDragFlag = (event: React.PointerEvent<HTMLDivElement>) => {
    justDragged.current = drag.current?.moved ?? false;
    handlePointerUp(event);
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-2xl border border-border bg-secondary/30 cursor-grab active:cursor-grabbing"
      style={{ height: '70vh', touchAction: 'pan-x pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpWithDragFlag}
      onPointerLeave={handlePointerUpWithDragFlag}
    >
      <div className="relative" style={{ width: canvasWidth, height: canvasHeight, padding: `${NODE_HEIGHT / 2}px ${NODE_WIDTH / 2}px` }}>
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
            const offset = NODE_WIDTH / 2;
            return (
              <path
                key={`${edge.parentId}>${edge.childId}`}
                d={`M ${from.x + offset} ${from.y + NODE_HEIGHT} L ${from.x + offset} ${midY} L ${to.x + offset} ${midY} L ${to.x + offset} ${to.y}`}
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
  );
}

interface FamilyTreeNodeCardProps {
  persona: Persona;
  onClick: () => void;
}

// Solo avatar + nombre, sin "Madre de Pedro" ni ningún otro texto genealógico redundante — la
// propia estructura del árbol ya comunica la relación (ver spec, sección "Nodos").
function FamilyTreeNodeCard({ persona, onClick }: FamilyTreeNodeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
        ) : persona.isCustodio ? (
          <Icon icon={icons.crown} className="w-6 h-6 text-primary opacity-60" strokeWidth={1.5} aria-hidden />
        ) : (
          <Icon icon={icons.user} className="w-6 h-6 text-muted-foreground opacity-40" strokeWidth={1.5} aria-hidden />
        )}
      </div>
      <p className="text-xs font-medium text-foreground text-center truncate w-full">{persona.nickname}</p>
    </button>
  );
}
