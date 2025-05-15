import React, { useState, useEffect } from 'react';

const defaultOptions = ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'];

export default function CategorySelector({ onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState('');

  // Pass selection up to parent on every change
  useEffect(() => {
    onSubmit(selected);
  }, [selected, onSubmit]);

  const toggleCategory = (category) => {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const addCustom = () => {
    if (custom.trim() && !selected.includes(custom.trim())) {
      setSelected([...selected, custom.trim()]);
      setCustom('');
    }
  };

  return (
    <div>
      <h3>Select Categories</h3>
      {defaultOptions.map((cat) => (
        <label key={cat} style={{ display: 'block', margin: '4px 0' }}>
          <input
            type="checkbox"
            checked={selected.includes(cat)}
            onChange={() => toggleCategory(cat)}
          />
          {cat}
        </label>
      ))}

      <div style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom category"
        />
        <button onClick={addCustom}>Add</button>
      </div>
    </div>
  );
}
