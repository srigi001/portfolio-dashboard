import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Edit2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * Props:
 * - portfolios: Array<{ id, name, order }>
 * - activeId: string
 * - onSelect: (id: string) => void
 * - onRenamePortfolio: (id: string, newName: string) => void
 * - onAddPortfolio: () => void
 * - onDeletePortfolio: (id: string) => void
 * - onDuplicatePortfolio: (id: string) => void
 * - onReorder: (newList) => void
 * - onLogout: () => void
 * - showLogout: boolean
 */
export default function Sidebar({
  portfolios,
  activeId,
  onSelect,
  onRenamePortfolio,
  onAddPortfolio,
  onDeletePortfolio,
  onDuplicatePortfolio,
  onReorder,
  onLogout,
  showLogout,
}) {
  const [menuState, setMenuState] = useState({ id: null, x: 0, y: 0 });
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuState.id &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setMenuState({ id: null, x: 0, y: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuState.id]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(portfolios);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onReorder(items);
  };

  const openMenu = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuState({ id, x: rect.right + 5, y: rect.bottom + 5 });
  };

  const closeMenu = () => {
    setMenuState({ id: null, x: 0, y: 0 });
  };

  const handleRenameClick = (p) => {
    const newName = prompt('Rename portfolio:', p.name);
    if (newName && newName.trim() && newName !== p.name) {
      onRenamePortfolio(p.id, newName.trim());
    }
    closeMenu();
  };

  return (
    <aside className="w-64 bg-gray-800 text-gray-200 flex flex-col relative">
      <div
        onClick={() => onSelect('summary')}
        className="px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700"
      >
        <h2 className="text-lg font-semibold">Summary</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sidebar-droppable">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {portfolios.map((p, idx) => (
                  <Draggable key={p.id} draggableId={p.id} index={idx}>
                    {(prov) => (
                      <li
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`flex items-center justify-between px-4 py-2 cursor-move hover:bg-gray-700 ${
                          activeId === p.id ? 'bg-gray-700 font-medium' : ''
                        }`}
                        onClick={() => onSelect(p.id)}
                      >
                        <span className="truncate">{p.name}</span>
                        <button
                          onClick={(e) => openMenu(e, p.id)}
                          className="p-1 hover:bg-gray-600 rounded"
                          aria-label="Options"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {menuState.id && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuState.y, left: menuState.x }}
          className="bg-white text-gray-900 rounded shadow-lg z-50 w-36"
        >
          <button
            onClick={() =>
              handleRenameClick(portfolios.find((p) => p.id === menuState.id))
            }
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Rename
          </button>
          <button
            onClick={() => {
              onDuplicatePortfolio(menuState.id);
              closeMenu();
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            Duplicate
          </button>
          <button
            onClick={() => {
              onDeletePortfolio(menuState.id);
              closeMenu();
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            Delete
          </button>
        </div>
      )}

      {/* Footer */}
      <div>
        <div className="px-4 py-3 border-t border-gray-700">
          <button
            onClick={onAddPortfolio}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded"
          >
            <Plus className="w-4 h-4" /> New Portfolio
          </button>
        </div>
        {showLogout && (
          <div className="px-4 py-3">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 hover:bg-gray-700 text-gray-200 py-2 rounded"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
