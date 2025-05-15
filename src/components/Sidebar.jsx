import { useNavigate } from 'react-router-dom';
import { Button } from './components/ui/Button';

export default function Sidebar({
  portfolios,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
}) {
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      {portfolios.map((p) => (
        <div
          key={p.id}
          className={`p-2 mb-2 cursor-pointer rounded ${
            selectedId === p.id ? 'bg-gray-600' : ''
          }`}
          onClick={() => {
            onSelect(p.id);
            if (p.id === 'summary') navigate('/');
            else navigate(`/portfolio/${p.id}`);
          }}
        >
          {p.name}
          {!p.fixed && (
            <Button
              variant="danger"
              className="ml-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p.id);
              }}
            >
              x
            </Button>
          )}
        </div>
      ))}
      <Button onClick={onAdd} className="mt-auto">
        + Add
      </Button>
    </div>
  );
}
