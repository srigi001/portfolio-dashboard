import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function MonthlyDepositsSection({ changes, setChanges }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const handleAdd = () => {
    if (!amount || !date) return;
    setChanges([
      ...changes,
      { id: Date.now().toString(), amount: parseFloat(amount), date }
    ]);
    setAmount('');
    setDate('');
  };

  const handleRemove = (id) => {
    setChanges(changes.filter((c) => c.id !== id));
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 text-gray-900">Monthly Deposit Changes</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          placeholder="New Monthly Amount (ILS)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-white border border-gray-300 rounded p-2 w-48 focus:outline-none focus:ring focus:border-blue-400 text-gray-900 placeholder-gray-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-400 text-gray-900"
        />
        <Button onClick={handleAdd}>Add Deposit Change</Button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left text-gray-900 font-semibold">New Amount (ILS)</th>
            <th className="p-2 text-left text-gray-900 font-semibold">Effective From</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, index) => (
            <tr key={c.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 text-gray-900">{c.amount.toLocaleString()}</td>
              <td className="p-2 text-gray-900">{c.date}</td>
              <td className="p-2">
                <Button onClick={() => handleRemove(c.id)} variant="danger">Remove</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}