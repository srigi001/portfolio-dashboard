import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function OneTimeDepositsSection({ deposits, setDeposits }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const handleAdd = () => {
    if (!amount || !date) return;
    setDeposits([
      ...deposits,
      { id: Date.now().toString(), amount: parseFloat(amount), date }
    ]);
    setAmount('');
    setDate('');
  };

  const handleRemove = (id) => {
    setDeposits(deposits.filter((d) => d.id !== id));
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 text-gray-900">One-Time Deposits</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          placeholder="Amount (ILS)"
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
        <Button onClick={handleAdd}>Add One-Time Deposit</Button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left text-gray-900 font-semibold">Amount (ILS)</th>
            <th className="p-2 text-left text-gray-900 font-semibold">Date</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((d, index) => (
            <tr key={d.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 text-gray-900">{d.amount.toLocaleString()}</td>
              <td className="p-2 text-gray-900">{d.date}</td>
              <td className="p-2">
                <Button onClick={() => handleRemove(d.id)} variant="danger">Remove</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}